using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.DeThi;
using CampusExam.Application.MaTran;
using CampusExam.Domain.Entities;
using CampusExam.Domain.Rules;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Commands;

public sealed class EfDichVuLenhDeThi(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider) : IDichVuLenhDeThi
{
    private const string NhomNhatKy = "DETHI";

    public async Task<KetQua<KetQuaSinhDeDto>> SinhAsync(
        SinhDeCommand command,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        // Cập nhật dòng ma trận để giữ khóa tới hết transaction và đổi PHIENBAN: "về đang soạn" hay
        // sửa chạy đồng thời sẽ nhận CONCURRENCY_CONFLICT thay vì lọt qua lúc đề đang được sinh.
        var soDong = await dbContext.MaTrans
            .Where(mt => mt.MaMT == command.MaMT && mt.TrangThaiMaTran == (byte)TrangThaiMaTran.SuDung)
            .ExecuteUpdateAsync(setters => setters.SetProperty(mt => mt.NgayCapNhat, now), cancellationToken);

        if (soDong == 0)
        {
            return await dbContext.MaTrans.AnyAsync(mt => mt.MaMT == command.MaMT, cancellationToken)
                ? ChuaSanSang("Chỉ sinh đề từ ma trận đang sử dụng.")
                : new LoiNghiepVu(
                    LoaiLoi.KhongTimThay,
                    MaLoi.MatrixNotFound,
                    "Không tìm thấy ma trận đề",
                    $"Không tồn tại ma trận đề có mã {command.MaMT}.");
        }

        var tenMT = await dbContext.MaTrans
            .Where(mt => mt.MaMT == command.MaMT)
            .Select(mt => mt.TenMT)
            .SingleAsync(cancellationToken);

        var o = await (
                from ct in dbContext.CauTrucs
                join kq in dbContext.KqHocTaps on ct.MaKQHT equals kq.MaKQHT
                where ct.MaMT == command.MaMT && ct.SoCau > 0
                select new { ct.MaKQHT, kq.KyHieu, kq.ThuTu, KqhtDangDung = kq.TrangThai == (short)TrangThaiSuDung.DangSuDung, ct.MaMD, ct.SoCau })
            .ToListAsync(cancellationToken);

        var kqhtNgung = o.Where(x => !x.KqhtDangDung).Select(x => x.KyHieu).Distinct().OrderBy(x => x).ToList();
        if (kqhtNgung.Count > 0)
        {
            return ChuaSanSang($"KQHT {string.Join(", ", kqhtNgung)} đã ngừng sử dụng.");
        }

        var maKqht = o.Select(x => x.MaKQHT).Distinct().ToList();
        var ungVien = await dbContext.CauHois
            .Where(ch => ch.TrangThai == (short)TrangThaiSuDung.DangSuDung && maKqht.Contains(ch.MaKQHT))
            .Select(ch => new
            {
                ch.MaCH,
                ch.MaKQHT,
                ch.MaMD,
                ch.CoDinhDa,
                SoLanDung = dbContext.GomCaus.Count(g => g.MaCH == ch.MaCH)
            })
            .ToListAsync(cancellationToken);

        var yeuCau = o
            .Select(x => new YeuCauO(
                x.MaKQHT,
                x.ThuTu,
                x.MaMD,
                x.SoCau,
                ungVien.Where(u => u.MaKQHT == x.MaKQHT && u.MaMD == x.MaMD).Select(u => new UngVien(u.MaCH, u.SoLanDung)).ToList()))
            .ToList();

        var hatGiong = Random.Shared.Next();
        var random = new Random(hatGiong);
        var chon = BoSinhDe.ChonCau(yeuCau, random);
        if (chon is null)
        {
            var thieu = o
                .Select(x => new { x.KyHieu, x.ThuTu, x.MaMD, x.SoCau, CoSan = ungVien.Count(u => u.MaKQHT == x.MaKQHT && u.MaMD == x.MaMD) })
                .Where(x => x.CoSan < x.SoCau)
                .OrderBy(x => x.ThuTu).ThenBy(x => x.MaMD)
                .Select(x => $"{x.KyHieu}{x.MaMD}: cần {x.SoCau}, có {x.CoSan}");
            return ChuaSanSang($"Ngân hàng không đủ câu: {string.Join("; ", thieu)}.");
        }

        var thongTin = ungVien.ToDictionary(u => u.MaCH);
        var deCon = BoSinhDe.SinhDeCon(
            chon.Select(maCH => (maCH, thongTin[maCH].CoDinhDa == 1)).ToList(),
            command.SoDeCon,
            random);

        if (deCon is null)
        {
            return new LoiNghiepVu(
                LoaiLoi.XungDot,
                MaLoi.PaperPermutationsExhausted,
                "Không đủ hoán vị",
                $"Đề {chon.Count} câu không tạo được {command.SoDeCon} đề con có thứ tự khác nhau. Giảm số đề con.");
        }

        var maHienThiNhap = string.IsNullOrWhiteSpace(command.MaDeGocHienThi) ? null : command.MaDeGocHienThi.Trim();
        var deGoc = new DeGoc
        {
            MaTK = nguoi.MaTK,
            MaMT = command.MaMT,
            MaDeGocHienThi = maHienThiNhap ?? $"TMP-{Guid.NewGuid():N}"[..30],
            TongSoCau = chon.Count,
            NgayTao = now,
            HatGiong = hatGiong
        };
        dbContext.DeGocs.Add(deGoc);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (SqlLoi.LaTrungKhoa(exception))
        {
            dbContext.Entry(deGoc).State = EntityState.Detached;
            return TrungMaDe(deGoc.MaDeGocHienThi);
        }

        if (maHienThiNhap is null)
        {
            deGoc.MaDeGocHienThi = await DatMaTuDongAsync(deGoc.MaDe, cancellationToken);
        }

        var cauHoi = await dbContext.CauHois
            .AsNoTracking()
            .Where(ch => chon.Contains(ch.MaCH))
            .Select(ch => new { ch.MaCH, ch.NoiDung, ch.DaA, ch.DaB, ch.DaC, ch.DaD, ch.DapAnDung })
            .ToDictionaryAsync(ch => ch.MaCH, cancellationToken);

        dbContext.GomCaus.AddRange(chon.Select((maCH, i) => new GomCau
        {
            MaDe = deGoc.MaDe,
            MaCH = maCH,
            ThuTuTrongDeGoc = i + 1,
            NoiDung = cauHoi[maCH].NoiDung,
            PhuongAnA = cauHoi[maCH].DaA,
            PhuongAnB = cauHoi[maCH].DaB,
            PhuongAnC = cauHoi[maCH].DaC,
            PhuongAnD = cauHoi[maCH].DaD,
            DapAnDungGoc = cauHoi[maCH].DapAnDung
        }));

        var hinh = await dbContext.TaiNguyenCauHois
            .AsNoTracking()
            .Where(tn => chon.Contains(tn.MaCH))
            .ToListAsync(cancellationToken);

        dbContext.TaiNguyenGomCaus.AddRange(hinh.Select(tn => new TaiNguyenGomCau
        {
            MaDe = deGoc.MaDe,
            MaCH = tn.MaCH,
            ViTri = tn.ViTri,
            ThuTu = tn.ThuTu,
            TenFile = tn.TenFile,
            StorageKey = tn.StorageKey,
            MimeType = tn.MimeType,
            AltText = tn.AltText
        }));

        var dsDeCon = deCon
            .Select((_, k) => new DeCon { MaDe = deGoc.MaDe, TenDeCon = (101 + k).ToString(), NgayTao = now })
            .ToList();
        dbContext.DeCons.AddRange(dsDeCon);
        await dbContext.SaveChangesAsync(cancellationToken);

        for (var k = 0; k < deCon.Count; k++)
        {
            dbContext.HoanVis.AddRange(deCon[k].Select(cau => new HoanVi
            {
                MaCH = cau.MaCH,
                MaDeCon = dsDeCon[k].MaDeCon,
                MaDe = deGoc.MaDe,
                TtCau = cau.TtCau,
                TtDapAn = cau.TtDapAn,
                DapAnDungHienThi = BoSinhDe.DapAnHienThi(cau.TtDapAn, cauHoi[cau.MaCH].DapAnDung[0]).ToString()
            }));
        }

        var soCauTrung = chon.Count(maCH => thongTin[maCH].SoLanDung > 0);
        GhiNhatKy(
            nguoi,
            "Sinh đề",
            deGoc.MaDe,
            $"{deGoc.MaDeGocHienThi} từ ma trận \"{tenMT}\", {deCon.Count} đề con, trùng {soCauTrung}/{chon.Count} câu",
            now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return KetQua<KetQuaSinhDeDto>.Ok(new KetQuaSinhDeDto(
            deGoc.MaDe,
            deGoc.MaDeGocHienThi,
            chon.Count,
            soCauTrung,
            deCon.Count));
    }

    public async Task<KetQua<KhongCo>> XoaAsync(
        int maDe,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var maHienThi = await dbContext.DeGocs
            .AsNoTracking()
            .Where(de => de.MaDe == maDe)
            .Select(de => de.MaDeGocHienThi)
            .SingleOrDefaultAsync(cancellationToken);

        if (maHienThi is null)
        {
            return KhongTimThay(maDe);
        }

        if (await dbContext.KyThis.AnyAsync(kt => kt.MaDe == maDe, cancellationToken))
        {
            return DaGanKyThi();
        }

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            await dbContext.HoanVis.Where(x => x.MaDe == maDe).ExecuteDeleteAsync(cancellationToken);
            await dbContext.DeCons.Where(x => x.MaDe == maDe).ExecuteDeleteAsync(cancellationToken);
            await dbContext.TaiNguyenGomCaus.Where(x => x.MaDe == maDe).ExecuteDeleteAsync(cancellationToken);
            await dbContext.GomCaus.Where(x => x.MaDe == maDe).ExecuteDeleteAsync(cancellationToken);
            await dbContext.DeGocs.Where(x => x.MaDe == maDe).ExecuteDeleteAsync(cancellationToken);
            GhiNhatKy(nguoi, "Xóa đề", maDe, maHienThi, timeProvider.GetUtcNow().UtcDateTime);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception exception) when (SqlLoi.LaViPhamRangBuoc(exception))
        {
            // Đề vừa được gắn vào kỳ thi đồng thời.
            return DaGanKyThi();
        }

        return KetQua<KhongCo>.Ok(default);
    }

    /// <summary>Đặt mã DG-0007; nếu quản trị viên đã tự dùng mã đó thì thêm hậu tố ngẫu nhiên.</summary>
    private async Task<string> DatMaTuDongAsync(int maDe, CancellationToken cancellationToken)
    {
        var ma = $"DG-{maDe:D4}";
        if (await dbContext.DeGocs.AnyAsync(de => de.MaDeGocHienThi == ma, cancellationToken))
        {
            ma = $"{ma}-{Guid.NewGuid():N}"[..20];
        }

        await dbContext.DeGocs
            .Where(de => de.MaDe == maDe)
            .ExecuteUpdateAsync(setters => setters.SetProperty(de => de.MaDeGocHienThi, ma), cancellationToken);
        return ma;
    }

    private void GhiNhatKy(NguoiThucHien nguoi, string hanhDong, int maDe, string? chiTiet, DateTime now) =>
        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = nguoi.MaTK,
            Nhom = NhomNhatKy,
            HanhDong = hanhDong,
            DoiTuong = $"DEGOC:{maDe}",
            ChiTiet = chiTiet,
            ThoiGian = now,
            DiaChiIP = nguoi.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoi.DiaChiIP
        });

    private static LoiNghiepVu ChuaSanSang(string chiTiet) => new(
        LoaiLoi.XungDot,
        MaLoi.MatrixNotReady,
        "Ma trận chưa sinh đề được",
        chiTiet);

    private static LoiNghiepVu TrungMaDe(string ma) => new(
        LoaiLoi.XungDot,
        MaLoi.PaperCodeConflict,
        "Mã đề đã tồn tại",
        $"Đã có đề gốc mang mã {ma}. Chọn mã khác hoặc để trống để hệ thống tự đặt.");

    private static LoiNghiepVu KhongTimThay(int maDe) => new(
        LoaiLoi.KhongTimThay,
        MaLoi.PaperNotFound,
        "Không tìm thấy đề",
        $"Không tồn tại đề gốc có mã {maDe}.");

    private static LoiNghiepVu DaGanKyThi() => new(
        LoaiLoi.XungDot,
        MaLoi.PaperInUse,
        "Đề đã gắn kỳ thi",
        "Đề đã được gắn vào kỳ thi nên không xóa được.");
}
