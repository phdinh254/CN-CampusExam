using System.Collections.Concurrent;
using CampusExam.Application.BaiLam;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;
using CampusExam.Domain.Entities;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Commands;

/// <summary>
/// Số lô tự lưu lớn nhất đã ghi của từng bài, để bỏ qua lô cũ đến sau. Giữ trong bộ nhớ: client
/// dùng mốc thời gian làm số lô nên vẫn tăng dần sau khi tải lại trang; khởi động lại máy chủ chỉ
/// mất khả năng chặn lô cũ đang bay đúng lúc đó.
/// </summary>
public sealed class BoNhoLoTraLoi
{
    private readonly ConcurrentDictionary<int, long> loCuoi = new();

    public long LoCuoi(int maBL) => loCuoi.GetValueOrDefault(maBL);

    public bool LaLoCu(int maBL, long soThuTuLo) => soThuTuLo <= loCuoi.GetValueOrDefault(maBL);

    public void GhiNhan(int maBL, long soThuTuLo) =>
        loCuoi.AddOrUpdate(maBL, soThuTuLo, (_, cu) => Math.Max(cu, soThuTuLo));

    public void Quen(int maBL) => loCuoi.TryRemove(maBL, out _);
}

public sealed class EfDichVuBaiLam(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider,
    BoNhoLoTraLoi boNhoLo) : IDichVuBaiLam
{
    private const string NhanPhuongAn = "ABCD";

    public async Task<DanhSachKyThiCuaToiDto> DanhSachKyThiAsync(string msts, CancellationToken cancellationToken)
    {
        var now = Now();
        var dong = await TruyVanNguCanh(msts).ToListAsync(cancellationToken);
        var duLieu = dong
            .OrderBy(x => x.TgBatDau)
            .Select(x => SangKyThiCuaToi(x, now))
            .ToList();
        return new DanhSachKyThiCuaToiDto(now, duLieu);
    }

    public async Task<KetQua<BaiLamDto>> BatDauAsync(
        string msts,
        int maKT,
        string? diaChiIP,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var nc = await TruyVanNguCanh(msts).SingleOrDefaultAsync(x => x.MaKT == maKT, cancellationToken);
        if (nc is null)
        {
            return KhongCoKyThi(maKT);
        }

        if (nc.BaiLam is null)
        {
            if (now < nc.TgBatDau)
            {
                return ChuaMo("Chưa đến giờ thi. Phòng thi mở lúc bắt đầu kỳ thi.");
            }

            if (now > QuyTacBaiLam.DongCong(nc.TgBatDau, nc.SoPhutChoVaoTre)
                || now >= QuyTacBaiLam.KetThucChung(nc.TgBatDau, nc.ThoiLuong))
            {
                return ChuaMo($"Đã quá thời gian cho vào thi ({nc.SoPhutChoVaoTre} phút sau giờ bắt đầu).");
            }

            dbContext.BaiLams.Add(new BaiLam
            {
                MaPhanCong = nc.MaPhanCong,
                MaDeCon = nc.MaDeCon,
                TgBatDau = now,
                LanHdCuoi = now,
                TrangThaiBaiLam = BaiLam.DangLam,
                DiaChiIP = diaChiIP is { Length: > 45 } ip ? ip[..45] : diaChiIP
            });

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception exception) when (SqlLoi.LaTrungKhoa(exception))
            {
                // Tab hoặc request khác vừa tạo bài: dùng bài đó.
                dbContext.ChangeTracker.Clear();
            }
        }

        return await LayAsync(msts, maKT, cancellationToken);
    }

    /// <summary>Đề đã hoán vị, câu trả lời đã lưu và hạn nộp; bài hết hạn được thu ngay.</summary>
    private async Task<KetQua<BaiLamDto>> LayAsync(string msts, int maKT, CancellationToken cancellationToken)
    {
        var now = Now();
        var nc = await TruyVanNguCanh(msts).SingleOrDefaultAsync(x => x.MaKT == maKT, cancellationToken);
        if (nc is null)
        {
            return KhongCoKyThi(maKT);
        }

        var loi = await KiemTraConLamAsync(nc, now, cancellationToken);
        if (loi is not null)
        {
            return loi;
        }

        var bai = nc.BaiLam!;
        var (cauHoi, ttCauTheoMa) = await DungDeAsync(nc, maKT, cancellationToken);
        var traLoi = await dbContext.TraLois
            .AsNoTracking()
            .Where(tl => tl.MaBL == bai.MaBL)
            .Select(tl => new { tl.MaCH, tl.DapAnChon, tl.DanhDau })
            .ToListAsync(cancellationToken);

        var daLuu = traLoi
            .Where(tl => ttCauTheoMa.ContainsKey(tl.MaCH))
            .Select(tl => new TraLoiDaLuuDto(ttCauTheoMa[tl.MaCH], tl.DapAnChon, tl.DanhDau == 1))
            .OrderBy(tl => tl.TtCau)
            .ToList();

        return KetQua<BaiLamDto>.Ok(new BaiLamDto(
            bai.MaBL,
            TrangThaiBaiCuaToi.DangLam,
            now,
            QuyTacBaiLam.HanNop(nc.TgBatDau, nc.ThoiLuong, bai.PhutCongThem),
            new KyThiTrongBaiDto(nc.TenKT, nc.MonThi, nc.TenDeCon, nc.SoCau, nc.ThoiLuong),
            cauHoi,
            daLuu));
    }

    /// <summary>
    /// Câu hỏi của đề con theo thứ tự hiển thị (phương án đã hoán vị, hình theo nhãn hiển thị), không có
    /// đáp án đúng. Dùng chung cho làm bài và xem lại để hai màn trùng nhau.
    /// </summary>
    private async Task<(List<CauLamBaiDto> CauHoi, Dictionary<int, int> TtCauTheoMa)> DungDeAsync(
        NguCanh nc,
        int maKT,
        CancellationToken cancellationToken)
    {
        var hoanVi = await dbContext.HoanVis
            .AsNoTracking()
            .Where(hv => hv.MaDeCon == nc.MaDeCon)
            .Select(hv => new { hv.MaCH, hv.TtCau, hv.TtDapAn })
            .ToListAsync(cancellationToken);

        var cau = await dbContext.GomCaus
            .AsNoTracking()
            .Where(g => g.MaDe == nc.MaDe)
            .Select(g => new { g.MaCH, g.NoiDung, g.PhuongAnA, g.PhuongAnB, g.PhuongAnC, g.PhuongAnD })
            .ToDictionaryAsync(g => g.MaCH, cancellationToken);

        var hinh = (await dbContext.TaiNguyenGomCaus
                .AsNoTracking()
                .Where(tn => tn.MaDe == nc.MaDe)
                .Select(tn => new { tn.MaCH, tn.ViTri, tn.ThuTu, tn.AltText })
                .ToListAsync(cancellationToken))
            .ToLookup(tn => tn.MaCH);

        var ttCauTheoMa = hoanVi.ToDictionary(hv => hv.MaCH, hv => hv.TtCau);
        var cauHoi = hoanVi
            .Where(hv => cau.ContainsKey(hv.MaCH))
            .OrderBy(hv => hv.TtCau)
            .Select(hv =>
            {
                var g = cau[hv.MaCH];
                var goc = new Dictionary<char, string> { ['A'] = g.PhuongAnA, ['B'] = g.PhuongAnB, ['C'] = g.PhuongAnC, ['D'] = g.PhuongAnD };

                // Đổi vị trí hình của phương án theo nhãn hiển thị (DAC gốc hiện ở A thành DAA) để
                // thí sinh không suy ra được thứ tự gốc.
                var phuongAn = hv.TtDapAn
                    .Select((nhanGoc, i) => new PhuongAnLamBaiDto(
                        NhanPhuongAn[i].ToString(),
                        goc[nhanGoc].Replace($"{{{{media:DA{nhanGoc}:", $"{{{{media:DA{NhanPhuongAn[i]}:", StringComparison.Ordinal)))
                    .ToList();

                var hinhAnh = hinh[hv.MaCH]
                    .Select(tn => new { tn, ViTriHienThi = ViTriHienThi(tn.ViTri, hv.TtDapAn) })
                    .Where(x => x.ViTriHienThi is not null)
                    .OrderBy(x => x.ViTriHienThi).ThenBy(x => x.tn.ThuTu)
                    .Select(x => new HinhLamBaiDto(
                        x.ViTriHienThi!,
                        x.tn.ThuTu,
                        $"/api/toi/ky-thi/{maKT}/bai-lam/hinh-anh/{hv.TtCau}/{x.ViTriHienThi}/{x.tn.ThuTu}",
                        x.tn.AltText))
                    .ToList();

                return new CauLamBaiDto(hv.TtCau, g.NoiDung, phuongAn, hinhAnh);
            })
            .ToList();

        return (cauHoi, ttCauTheoMa);
    }

    public async Task<KetQua<KetQuaLuuDto>> LuuAsync(
        string msts,
        int maKT,
        LoTraLoiRequest lo,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var nc = await TruyVanNguCanh(msts).SingleOrDefaultAsync(x => x.MaKT == maKT, cancellationToken);
        if (nc is null)
        {
            return KhongCoKyThi(maKT);
        }

        var loi = await KiemTraConLamAsync(nc, now, cancellationToken);
        if (loi is not null)
        {
            return loi;
        }

        var bai = nc.BaiLam!;
        var hanNop = QuyTacBaiLam.HanNop(nc.TgBatDau, nc.ThoiLuong, bai.PhutCongThem);
        if (boNhoLo.LaLoCu(bai.MaBL, lo.SoThuTuLo))
        {
            return KetQua<KetQuaLuuDto>.Ok(new KetQuaLuuDto(boNhoLo.LoCuoi(bai.MaBL), now, hanNop));
        }

        var loiLo = await GhiLoAsync(bai.MaBL, nc.MaDeCon, lo, now, cancellationToken);
        if (loiLo is not null)
        {
            return loiLo;
        }

        boNhoLo.GhiNhan(bai.MaBL, lo.SoThuTuLo);
        return KetQua<KetQuaLuuDto>.Ok(new KetQuaLuuDto(lo.SoThuTuLo, now, hanNop));
    }

    public async Task<KetQua<KetQuaNopDto>> NopAsync(
        string msts,
        int maKT,
        LoTraLoiRequest lo,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var nc = await TruyVanNguCanh(msts).SingleOrDefaultAsync(x => x.MaKT == maKT, cancellationToken);
        if (nc is null)
        {
            return KhongCoKyThi(maKT);
        }

        if (nc.BaiLam is not { } bai)
        {
            return KhongCoBai();
        }

        if (bai.TrangThaiBaiLam == BaiLam.DangLam)
        {
            var hanNop = QuyTacBaiLam.HanNop(nc.TgBatDau, nc.ThoiLuong, bai.PhutCongThem);
            if (now >= hanNop)
            {
                // Quá hạn theo đồng hồ máy chủ: không nhận lô cuối, thu bài như tác vụ nền.
                await ChamAsync(bai.MaBL, nc.MaDeCon, BaiLam.HeThongThu, hanNop, cancellationToken);
            }
            else
            {
                if (!boNhoLo.LaLoCu(bai.MaBL, lo.SoThuTuLo) && lo.ThayDoi.Count > 0)
                {
                    var loiLo = await GhiLoAsync(bai.MaBL, nc.MaDeCon, lo, now, cancellationToken);
                    if (loiLo is not null)
                    {
                        return loiLo;
                    }
                }

                await ChamAsync(bai.MaBL, nc.MaDeCon, BaiLam.DaNop, now, cancellationToken);
            }
        }

        boNhoLo.Quen(bai.MaBL);
        var ketQua = await dbContext.BaiLams
            .AsNoTracking()
            .Where(bl => bl.MaBL == bai.MaBL)
            .Select(bl => new { bl.TrangThaiBaiLam, bl.TgNop, bl.Diem })
            .SingleAsync(cancellationToken);

        return KetQua<KetQuaNopDto>.Ok(new KetQuaNopDto(
            ketQua.TrangThaiBaiLam == BaiLam.DaNop ? TrangThaiBaiCuaToi.DaNop : TrangThaiBaiCuaToi.HeThongThu,
            ketQua.TgNop!.Value,
            nc.HienDiem,
            nc.HienDiem ? ketQua.Diem : null));
    }

    public async Task<HinhLuuTruBaiLamDto?> HinhAsync(
        string msts,
        int maKT,
        int ttCau,
        string viTri,
        short thuTu,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var nc = await TruyVanNguCanh(msts).SingleOrDefaultAsync(x => x.MaKT == maKT, cancellationToken);
        // Chỉ mở khi đang làm bài (trước hạn nộp).
        var dangLam = nc?.BaiLam is { TrangThaiBaiLam: BaiLam.DangLam } bai
            && now < QuyTacBaiLam.HanNop(nc.TgBatDau, nc.ThoiLuong, bai.PhutCongThem);
        if (nc is null || !dangLam)
        {
            return null;
        }

        var hv = await dbContext.HoanVis
            .AsNoTracking()
            .Where(x => x.MaDeCon == nc.MaDeCon && x.TtCau == ttCau)
            .Select(x => new { x.MaCH, x.TtDapAn })
            .SingleOrDefaultAsync(cancellationToken);

        var viTriGoc = hv is null ? null : ViTriGoc(viTri, hv.TtDapAn);
        if (viTriGoc is null)
        {
            return null;
        }

        return await dbContext.TaiNguyenGomCaus
            .AsNoTracking()
            .Where(tn => tn.MaDe == nc.MaDe && tn.MaCH == hv!.MaCH && tn.ViTri == viTriGoc && tn.ThuTu == thuTu)
            .Select(tn => new HinhLuuTruBaiLamDto(tn.StorageKey, tn.MimeType))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<int> XuLyDinhKyAsync(CancellationToken cancellationToken)
    {
        var now = Now();
        var quaHan = await (
                from bl in dbContext.BaiLams.AsNoTracking()
                join pc in dbContext.PhanCongThis.AsNoTracking() on bl.MaPhanCong equals pc.MaPhanCong
                join kt in dbContext.KyThis.AsNoTracking() on pc.MaKT equals kt.MaKT
                where bl.TrangThaiBaiLam == BaiLam.DangLam
                    && kt.TgBatDau.AddMinutes(kt.ThoiLuong + bl.PhutCongThem) <= now
                select new { bl.MaBL, bl.MaDeCon, HanNop = kt.TgBatDau.AddMinutes(kt.ThoiLuong + bl.PhutCongThem) })
            .OrderBy(x => x.HanNop)
            .ThenBy(x => x.MaBL)
            .Take(200)
            .ToListAsync(cancellationToken);

        foreach (var bai in quaHan)
        {
            await ChamAsync(bai.MaBL, bai.MaDeCon, BaiLam.HeThongThu, bai.HanNop, cancellationToken);
            boNhoLo.Quen(bai.MaBL);
        }

        // Đã phát hành → đang thi khi tới giờ bắt đầu.
        await dbContext.KyThis
            .Where(kt => kt.TrangThaiKyThi == 1 && kt.TgBatDau <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(kt => kt.TrangThaiKyThi, (byte)2), cancellationToken);

        // Đang thi → đã kết thúc khi qua giờ kết thúc chung và không còn bài đang làm (bài được
        // cộng giờ có thể kéo dài quá giờ chung).
        await dbContext.KyThis
            .Where(kt => (kt.TrangThaiKyThi == 1 || kt.TrangThaiKyThi == 2)
                && kt.TgBatDau.AddMinutes(kt.ThoiLuong) <= now
                && !(from pc in dbContext.PhanCongThis
                     join bl in dbContext.BaiLams on pc.MaPhanCong equals bl.MaPhanCong
                     where pc.MaKT == kt.MaKT && bl.TrangThaiBaiLam == BaiLam.DangLam
                     select bl.MaBL).Any())
            .ExecuteUpdateAsync(s => s.SetProperty(kt => kt.TrangThaiKyThi, (byte)3), cancellationToken);

        return quaHan.Count;
    }

    public async Task<KetQua<KhongCo>> ThuBaiAsync(
        int maKT,
        int maBL,
        ThuBaiRequest request,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var bai = await (
                from bl in dbContext.BaiLams.AsNoTracking()
                join pc in dbContext.PhanCongThis.AsNoTracking() on bl.MaPhanCong equals pc.MaPhanCong
                join kt in dbContext.KyThis.AsNoTracking() on pc.MaKT equals kt.MaKT
                where bl.MaBL == maBL && pc.MaKT == maKT
                select new { bl.TrangThaiBaiLam, bl.MaDeCon, pc.Msts, kt.TenKT })
            .SingleOrDefaultAsync(cancellationToken);
        if (bai is null)
        {
            return new LoiNghiepVu(LoaiLoi.KhongTimThay, MaLoi.AttemptNotFound, "Không tìm thấy bài làm",
                $"Kỳ thi {maKT} không có bài làm mã {maBL}.");
        }

        var daDong = new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.AttemptClosed, "Bài làm đã đóng",
            "Bài đã được nộp hoặc đã được thu.");
        if (bai.TrangThaiBaiLam != BaiLam.DangLam)
        {
            return daDong;
        }

        var now = Now();
        // Điều kiện "còn đang làm" nằm trong UPDATE của ChamAsync: thí sinh nộp cùng lúc thì chỉ một bên thắng.
        if (!await ChamAsync(maBL, bai.MaDeCon, BaiLam.HeThongThu, now, cancellationToken))
        {
            return daDong;
        }

        boNhoLo.Quen(maBL);
        var chiTiet = $"{bai.TenKT}: thu bài thí sinh {bai.Msts}. Lý do: {request.LyDo.Trim()}";
        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = nguoi.MaTK,
            Nhom = "KYTHI",
            HanhDong = "Thu bài",
            DoiTuong = $"KYTHI:{maKT}",
            ChiTiet = chiTiet.Length > 500 ? chiTiet[..500] : chiTiet,
            ThoiGian = now,
            DiaChiIP = nguoi.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoi.DiaChiIP
        });
        await dbContext.SaveChangesAsync(cancellationToken);
        return KetQua<KhongCo>.Ok(default);
    }

    /// <summary>Bài phải còn đang làm và chưa quá hạn; quá hạn thì thu ngay rồi báo đã đóng.</summary>
    private async Task<LoiNghiepVu?> KiemTraConLamAsync(NguCanh nc, DateTime now, CancellationToken cancellationToken)
    {
        if (nc.BaiLam is not { } bai)
        {
            return KhongCoBai();
        }

        if (bai.TrangThaiBaiLam != BaiLam.DangLam)
        {
            return DaDong("Bài làm đã được nộp hoặc đã được thu.");
        }

        var hanNop = QuyTacBaiLam.HanNop(nc.TgBatDau, nc.ThoiLuong, bai.PhutCongThem);
        if (now >= hanNop)
        {
            await ChamAsync(bai.MaBL, nc.MaDeCon, BaiLam.HeThongThu, hanNop, cancellationToken);
            boNhoLo.Quen(bai.MaBL);
            return DaDong("Đã hết giờ làm bài, hệ thống đã thu bài.");
        }

        return null;
    }

    private async Task<LoiNghiepVu?> GhiLoAsync(
        int maBL,
        int maDeCon,
        LoTraLoiRequest lo,
        DateTime now,
        CancellationToken cancellationToken)
    {
        if (lo.ThayDoi.Count > 0)
        {
            var maTheoTt = await dbContext.HoanVis
                .AsNoTracking()
                .Where(hv => hv.MaDeCon == maDeCon)
                .ToDictionaryAsync(hv => hv.TtCau, hv => hv.MaCH, cancellationToken);

            var sai = lo.ThayDoi.Where(td => !maTheoTt.ContainsKey(td.TtCau)).Select(td => td.TtCau).Distinct().ToList();
            if (sai.Count > 0)
            {
                return new LoiNghiepVu(LoaiLoi.KhongHopLe, MaLoi.ValidationFailed, "Dữ liệu không hợp lệ",
                    $"Đề không có câu số {string.Join(", ", sai)}.", "thayDoi");
            }

            var maCH = lo.ThayDoi.Select(td => maTheoTt[td.TtCau]).Distinct().ToList();
            var hienCo = await dbContext.TraLois
                .Where(tl => tl.MaBL == maBL && maCH.Contains(tl.MaCH))
                .ToDictionaryAsync(tl => tl.MaCH, cancellationToken);

            // Trong một lô, thay đổi sau cùng của cùng một câu thắng.
            foreach (var td in lo.ThayDoi)
            {
                var ma = maTheoTt[td.TtCau];
                if (!hienCo.TryGetValue(ma, out var tl))
                {
                    tl = new TraLoi { MaBL = maBL, MaCH = ma, MaDeCon = maDeCon };
                    dbContext.TraLois.Add(tl);
                    hienCo[ma] = tl;
                }

                if (td.DapAnChon is not null)
                {
                    tl.DapAnChon = td.DapAnChon.Length == 0 ? null : td.DapAnChon;
                    tl.ThoiGianChon = now;
                }

                if (td.DanhDau is { } danhDau)
                {
                    tl.DanhDau = (short)(danhDau ? 1 : 0);
                }
            }
        }

        await dbContext.BaiLams
            .Where(bl => bl.MaBL == maBL && bl.TrangThaiBaiLam == BaiLam.DangLam)
            .ExecuteUpdateAsync(s => s.SetProperty(bl => bl.LanHdCuoi, now), cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        return null;
    }

    /// <summary>
    /// Chấm và đóng bài trong một transaction. Chỉ đóng bài còn đang làm (điều kiện trong UPDATE),
    /// nên nộp và thu đồng thời không chấm hai lần. Trả về false khi bài đã bị đóng ở request khác.
    /// </summary>
    private async Task<bool> ChamAsync(int maBL, int maDeCon, byte trangThai, DateTime tgNop, CancellationToken cancellationToken)
    {
        dbContext.ChangeTracker.Clear();
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var dapAnDung = await dbContext.HoanVis
            .AsNoTracking()
            .Where(hv => hv.MaDeCon == maDeCon)
            .ToDictionaryAsync(hv => hv.MaCH, hv => hv.DapAnDungHienThi, cancellationToken);

        var traLoi = await dbContext.TraLois.Where(tl => tl.MaBL == maBL).ToListAsync(cancellationToken);
        foreach (var tl in traLoi)
        {
            tl.LaDung = tl.DapAnChon is null ? null
                : (short)(dapAnDung.TryGetValue(tl.MaCH, out var dung) && dung == tl.DapAnChon ? 1 : 0);
        }

        var soCauDung = traLoi.Count(tl => tl.LaDung == 1);
        var diem = QuyTacBaiLam.Diem(soCauDung, dapAnDung.Count);

        var soDong = await dbContext.BaiLams
            .Where(bl => bl.MaBL == maBL && bl.TrangThaiBaiLam == BaiLam.DangLam)
            .ExecuteUpdateAsync(
                s => s
                    .SetProperty(bl => bl.TrangThaiBaiLam, trangThai)
                    .SetProperty(bl => bl.TgNop, tgNop)
                    .SetProperty(bl => bl.SoCauDung, soCauDung)
                    .SetProperty(bl => bl.Diem, diem)
                    .SetProperty(bl => bl.LanHdCuoi, bl => bl.LanHdCuoi > tgNop ? bl.LanHdCuoi : tgNop),
                cancellationToken);

        if (soDong == 0)
        {
            // Bài đã được đóng ở request khác.
            await transaction.RollbackAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();
            return false;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
        return true;
    }

    private IQueryable<NguCanh> TruyVanNguCanh(string msts) =>
        from pc in dbContext.PhanCongThis.AsNoTracking()
        join kt in dbContext.KyThis.AsNoTracking() on pc.MaKT equals kt.MaKT
        join dc in dbContext.DeCons.AsNoTracking() on pc.MaDeCon equals dc.MaDeCon
        where pc.Msts == msts && kt.TrangThaiKyThi >= 1 && kt.TrangThaiKyThi <= 3
        select new NguCanh
        {
            MaKT = kt.MaKT,
            MaPhanCong = pc.MaPhanCong,
            MaDeCon = pc.MaDeCon,
            MaDe = pc.MaDe,
            SoMay = pc.SoMay,
            TenKT = kt.TenKT,
            MonThi = kt.MonThi,
            TgBatDau = kt.TgBatDau,
            ThoiLuong = kt.ThoiLuong,
            SoPhutChoVaoTre = kt.SoPhutChoVaoTre,
            HienDiem = kt.HienDiem == 1,
            TrangThaiKyThi = kt.TrangThaiKyThi,
            TenDeCon = dc.TenDeCon,
            SoCau = dbContext.HoanVis.Count(hv => hv.MaDeCon == pc.MaDeCon),
            BaiLam = dbContext.BaiLams
                .Where(bl => bl.MaPhanCong == pc.MaPhanCong)
                .Select(bl => new BaiTomTat
                {
                    MaBL = bl.MaBL,
                    TrangThaiBaiLam = bl.TrangThaiBaiLam,
                    PhutCongThem = bl.PhutCongThem,
                    Diem = bl.Diem,
                    TgNop = bl.TgNop
                })
                .FirstOrDefault()
        };

    private static KyThiCuaToiDto SangKyThiCuaToi(NguCanh x, DateTime now)
    {
        var ketThuc = QuyTacBaiLam.KetThucChung(x.TgBatDau, x.ThoiLuong);
        var dongCong = QuyTacBaiLam.DongCong(x.TgBatDau, x.SoPhutChoVaoTre);
        var trangThai = x.BaiLam switch
        {
            null => now >= ketThuc || now > dongCong ? TrangThaiBaiCuaToi.VangThi : TrangThaiBaiCuaToi.ChuaVao,
            { TrangThaiBaiLam: BaiLam.DangLam } => TrangThaiBaiCuaToi.DangLam,
            { TrangThaiBaiLam: BaiLam.DaNop } => TrangThaiBaiCuaToi.DaNop,
            _ => TrangThaiBaiCuaToi.HeThongThu
        };
        var duocVao = x.BaiLam switch
        {
            null => now >= x.TgBatDau && now <= dongCong && now < ketThuc,
            { TrangThaiBaiLam: BaiLam.DangLam } b => now < QuyTacBaiLam.HanNop(x.TgBatDau, x.ThoiLuong, b.PhutCongThem),
            _ => false
        };

        // Điểm chỉ trả khi bài đã nộp/thu và kỳ thi cho hiện điểm.
        var coDiem = x.HienDiem && x.BaiLam is { TrangThaiBaiLam: BaiLam.DaNop or BaiLam.HeThongThu };
        return new KyThiCuaToiDto(
            x.MaKT, x.TenKT, x.MonThi, x.TgBatDau, x.ThoiLuong, x.SoCau, x.SoMay,
            x.TgBatDau, dongCong, ketThuc, trangThai, duocVao,
            x.HienDiem,
            coDiem ? x.BaiLam!.Diem : null);
    }

    /// <summary>Vị trí gốc (NOIDUNG, DAA…) → vị trí hiển thị theo hoán vị phương án.</summary>
    private static string? ViTriHienThi(string viTriGoc, string ttDapAn)
    {
        if (viTriGoc == "NOIDUNG")
        {
            return viTriGoc;
        }

        var i = viTriGoc.Length == 3 ? ttDapAn.IndexOf(viTriGoc[2], StringComparison.Ordinal) : -1;
        return i < 0 ? null : $"DA{NhanPhuongAn[i]}";
    }

    /// <summary>Vị trí hiển thị → vị trí gốc.</summary>
    private static string? ViTriGoc(string viTriHienThi, string ttDapAn)
    {
        if (viTriHienThi == "NOIDUNG")
        {
            return viTriHienThi;
        }

        var i = viTriHienThi.Length == 3 && viTriHienThi.StartsWith("DA", StringComparison.Ordinal)
            ? NhanPhuongAn.IndexOf(viTriHienThi[2], StringComparison.Ordinal)
            : -1;
        return i < 0 || i >= ttDapAn.Length ? null : $"DA{ttDapAn[i]}";
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    private static LoiNghiepVu KhongCoKyThi(int maKT) => new(
        LoaiLoi.KhongTimThay,
        MaLoi.ExamNotFound,
        "Không tìm thấy kỳ thi",
        $"Bạn không được phân công vào kỳ thi {maKT} hoặc kỳ thi chưa được phát hành.");

    private static LoiNghiepVu KhongCoBai() => new(
        LoaiLoi.KhongTimThay,
        MaLoi.AttemptNotFound,
        "Chưa có bài làm",
        "Bạn chưa vào phòng thi của kỳ thi này.");

    private static LoiNghiepVu ChuaMo(string chiTiet) => new(
        LoaiLoi.XungDot,
        MaLoi.ExamNotOpen,
        "Phòng thi chưa mở",
        chiTiet);

    private static LoiNghiepVu DaDong(string chiTiet) => new(
        LoaiLoi.XungDot,
        MaLoi.AttemptClosed,
        "Bài làm đã đóng",
        chiTiet);

    private sealed class NguCanh
    {
        public int MaKT { get; init; }

        public int MaPhanCong { get; init; }

        public int MaDeCon { get; init; }

        public int MaDe { get; init; }

        public string? SoMay { get; init; }

        public string TenKT { get; init; } = string.Empty;

        public string MonThi { get; init; } = string.Empty;

        public DateTime TgBatDau { get; init; }

        public int ThoiLuong { get; init; }

        public int SoPhutChoVaoTre { get; init; }

        public bool HienDiem { get; init; }

        public byte TrangThaiKyThi { get; init; }

        public string TenDeCon { get; init; } = string.Empty;

        public int SoCau { get; init; }

        public BaiTomTat? BaiLam { get; init; }
    }

    private sealed class BaiTomTat
    {
        public int MaBL { get; init; }

        public byte TrangThaiBaiLam { get; init; }

        public int PhutCongThem { get; init; }

        public decimal? Diem { get; init; }

        public DateTime? TgNop { get; init; }
    }
}
