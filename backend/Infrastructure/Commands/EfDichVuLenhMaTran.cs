using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.MaTran;
using CampusExam.Domain.Entities;
using CampusExam.Infrastructure.Persistence;
using CampusExam.Infrastructure.Queries;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Commands;

public sealed class EfDichVuLenhMaTran(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider) : IDichVuLenhMaTran
{
    private const string NhomNhatKy = "MATRAN";

    public async Task<KetQua<MaTranChiTietDto>> TaoAsync(
        LuuMaTranCommand command,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var loiKqht = await KiemTraKqhtAsync(command, cancellationToken);
        if (loiKqht is not null)
        {
            return loiKqht;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var maTran = new MaTran
        {
            TenMT = command.TenMT.Trim(),
            ThoiGianLam = command.ThoiGianLam,
            TongSoCau = command.CauTruc.Sum(x => x.SoCau),
            TrangThaiMaTran = (byte)TrangThaiMaTran.DangSoan,
            NgayTao = now
        };

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        dbContext.MaTrans.Add(maTran);
        await dbContext.SaveChangesAsync(cancellationToken);

        dbContext.CauTrucs.AddRange(TaoCauTruc(maTran.MaMT, command));
        GhiNhatKy(nguoi, "Tạo ma trận đề", maTran.MaMT, maTran.TenMT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(maTran.MaMT, cancellationToken);
    }

    public async Task<KetQua<MaTranChiTietDto>> SuaAsync(
        int maMT,
        SuaMaTranCommand command,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var maTran = await dbContext.MaTrans.SingleOrDefaultAsync(mt => mt.MaMT == maMT, cancellationToken);
        if (maTran is null)
        {
            return KhongTimThay(maMT);
        }

        if (await DaSinhDeAsync(maMT, cancellationToken))
        {
            return DaSinhDe();
        }

        if (maTran.TrangThaiMaTran != (byte)TrangThaiMaTran.DangSoan)
        {
            return new LoiNghiepVu(
                LoaiLoi.XungDot,
                MaLoi.MatrixNotEditable,
                "Ma trận không ở trạng thái đang soạn",
                "Chỉ sửa được ma trận đang soạn. Hãy chuyển ma trận về đang soạn trước khi sửa.");
        }

        var loiKqht = await KiemTraKqhtAsync(command, cancellationToken);
        if (loiKqht is not null)
        {
            return loiKqht;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;

        // Phiên bản client đã xem là giá trị gốc: lệch với database thì UPDATE không khớp dòng nào.
        dbContext.Entry(maTran).Property(x => x.PhienBan).OriginalValue = command.PhienBanBytes()!;
        maTran.TenMT = command.TenMT.Trim();
        maTran.ThoiGianLam = command.ThoiGianLam;
        maTran.TongSoCau = command.CauTruc.Sum(x => x.SoCau);
        maTran.NgayCapNhat = now;

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            dbContext.Entry(maTran).State = EntityState.Detached;
            return new LoiNghiepVu(
                LoaiLoi.XungDot,
                MaLoi.ConcurrencyConflict,
                "Ma trận đã bị thay đổi",
                "Ma trận vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất trước khi sửa.");
        }

        await dbContext.CauTrucs.Where(ct => ct.MaMT == maMT).ExecuteDeleteAsync(cancellationToken);
        dbContext.CauTrucs.AddRange(TaoCauTruc(maMT, command));
        GhiNhatKy(nguoi, "Sửa ma trận đề", maMT, maTran.TenMT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(maMT, cancellationToken);
    }

    public async Task<KetQua<MaTranChiTietDto>> DoiTrangThaiAsync(
        int maMT,
        TrangThaiMaTran trangThai,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var maTran = await dbContext.MaTrans
            .AsNoTracking()
            .Where(mt => mt.MaMT == maMT)
            .Select(mt => new { mt.TenMT, mt.TrangThaiMaTran, mt.PhienBan })
            .SingleOrDefaultAsync(cancellationToken);

        if (maTran is null)
        {
            return KhongTimThay(maMT);
        }

        string hanhDong;
        switch (trangThai)
        {
            case TrangThaiMaTran.SuDung:
                var thieu = await TimChoThieuAsync(maMT, cancellationToken);
                if (thieu.Count > 0)
                {
                    return new LoiNghiepVu(
                        LoaiLoi.XungDot,
                        MaLoi.MatrixNotReady,
                        "Ma trận chưa đủ điều kiện sử dụng",
                        string.Join("; ", thieu) + ".");
                }

                hanhDong = "Kích hoạt ma trận đề";
                break;

            case TrangThaiMaTran.DangSoan:
                if (await DaSinhDeAsync(maMT, cancellationToken))
                {
                    return DaSinhDe();
                }

                hanhDong = "Chuyển ma trận về đang soạn";
                break;

            default:
                hanhDong = "Ngừng sử dụng ma trận đề";
                break;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        // Chỉ đổi nếu ma trận chưa bị sửa kể từ lúc kiểm tra ở trên: tránh kích hoạt một cấu trúc
        // vừa được người khác lưu mà chưa qua kiểm tra đủ câu.
        var soDong = await dbContext.MaTrans
            .Where(mt => mt.MaMT == maMT && mt.PhienBan == maTran.PhienBan)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(mt => mt.TrangThaiMaTran, (byte)trangThai)
                    .SetProperty(mt => mt.NgayCapNhat, now),
                cancellationToken);

        if (soDong == 0)
        {
            return new LoiNghiepVu(
                LoaiLoi.XungDot,
                MaLoi.ConcurrencyConflict,
                "Ma trận đã bị thay đổi",
                "Ma trận vừa được sửa ở nơi khác. Tải lại rồi thử lại.");
        }

        GhiNhatKy(nguoi, hanhDong, maMT, maTran.TenMT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(maMT, cancellationToken);
    }

    public async Task<KetQua<KhongCo>> XoaAsync(
        int maMT,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var tenMT = await dbContext.MaTrans
            .AsNoTracking()
            .Where(mt => mt.MaMT == maMT)
            .Select(mt => mt.TenMT)
            .SingleOrDefaultAsync(cancellationToken);

        if (tenMT is null)
        {
            return KhongTimThay(maMT);
        }

        if (await DaSinhDeAsync(maMT, cancellationToken))
        {
            return DaSinhDe();
        }

        try
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            await dbContext.CauTrucs.Where(ct => ct.MaMT == maMT).ExecuteDeleteAsync(cancellationToken);
            await dbContext.MaTrans.Where(mt => mt.MaMT == maMT).ExecuteDeleteAsync(cancellationToken);
            GhiNhatKy(nguoi, "Xóa ma trận đề", maMT, tenMT, timeProvider.GetUtcNow().UtcDateTime);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (Exception exception) when (SqlLoi.LaViPhamRangBuoc(exception))
        {
            // Đề gốc được sinh đồng thời từ ma trận này.
            return DaSinhDe();
        }

        return KetQua<KhongCo>.Ok(default);
    }

    /// <summary>Mọi KQHT trong lệnh phải tồn tại và đang sử dụng.</summary>
    private async Task<LoiNghiepVu?> KiemTraKqhtAsync(LuuMaTranCommand command, CancellationToken cancellationToken)
    {
        var maKqht = command.CauTruc.Select(x => x.MaKQHT).Distinct().ToList();
        var kqht = await dbContext.KqHocTaps
            .AsNoTracking()
            .Where(kq => maKqht.Contains(kq.MaKQHT))
            .Select(kq => new { kq.MaKQHT, kq.KyHieu, kq.TrangThai })
            .ToListAsync(cancellationToken);

        var khongTonTai = maKqht.Except(kqht.Select(kq => kq.MaKQHT)).ToList();
        if (khongTonTai.Count > 0)
        {
            return LoiCauTruc($"Không tồn tại KQHT có mã {string.Join(", ", khongTonTai)}.");
        }

        var ngungDung = kqht
            .Where(kq => kq.TrangThai != (short)TrangThaiSuDung.DangSuDung)
            .Select(kq => kq.KyHieu)
            .OrderBy(x => x)
            .ToList();

        return ngungDung.Count > 0
            ? LoiCauTruc($"KQHT {string.Join(", ", ngungDung)} đã ngừng sử dụng, không đưa vào ma trận được.")
            : null;
    }

    /// <summary>Danh sách lý do chưa kích hoạt được: KQHT ngừng dùng, ô thiếu câu.</summary>
    private async Task<List<string>> TimChoThieuAsync(int maMT, CancellationToken cancellationToken)
    {
        var o = await (
                from ct in dbContext.CauTrucs.AsNoTracking()
                join kq in dbContext.KqHocTaps.AsNoTracking() on ct.MaKQHT equals kq.MaKQHT
                where ct.MaMT == maMT
                select new
                {
                    kq.KyHieu,
                    kq.ThuTu,
                    KqhtDangDung = kq.TrangThai == (short)TrangThaiSuDung.DangSuDung,
                    ct.MaMD,
                    ct.SoCau,
                    CoSan = dbContext.CauHois.Count(ch =>
                        ch.MaKQHT == ct.MaKQHT
                        && ch.MaMD == ct.MaMD
                        && ch.TrangThai == (short)TrangThaiSuDung.DangSuDung)
                })
            .ToListAsync(cancellationToken);

        var thieu = new List<string>();
        if (o.Count == 0)
        {
            thieu.Add("Ma trận chưa có KQHT nào");
        }

        thieu.AddRange(o
            .Where(x => !x.KqhtDangDung)
            .Select(x => x.KyHieu)
            .Distinct()
            .OrderBy(x => x)
            .Select(kyHieu => $"KQHT {kyHieu} đã ngừng sử dụng"));

        thieu.AddRange(o
            .Where(x => x.KqhtDangDung && x.SoCau > x.CoSan)
            .OrderBy(x => x.ThuTu)
            .ThenBy(x => x.MaMD)
            .Select(x => $"{x.KyHieu}{x.MaMD}: cần {x.SoCau}, có {x.CoSan}"));

        return thieu;
    }

    private Task<bool> DaSinhDeAsync(int maMT, CancellationToken cancellationToken) =>
        dbContext.DeGocs.AnyAsync(de => de.MaMT == maMT, cancellationToken);

    private async Task<KetQua<MaTranChiTietDto>> ChiTietAsync(int maMT, CancellationToken cancellationToken) =>
        KetQua<MaTranChiTietDto>.Ok((await new EfTruyXuatMaTran(dbContext).GetByIdAsync(maMT, cancellationToken))!);

    private static IEnumerable<CauTruc> TaoCauTruc(int maMT, LuuMaTranCommand command) =>
        command.CauTruc.Select(dong => new CauTruc
        {
            MaMT = maMT,
            MaKQHT = dong.MaKQHT,
            MaMD = dong.MaMD,
            SoCau = dong.SoCau,
            TyLe = dong.TyLe
        });

    private void GhiNhatKy(NguoiThucHien nguoi, string hanhDong, int maMT, string? chiTiet, DateTime now) =>
        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = nguoi.MaTK,
            Nhom = NhomNhatKy,
            HanhDong = hanhDong,
            DoiTuong = $"MATRAN:{maMT}",
            ChiTiet = chiTiet,
            ThoiGian = now,
            DiaChiIP = nguoi.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoi.DiaChiIP
        });

    private static LoiNghiepVu LoiCauTruc(string chiTiet) => new(
        LoaiLoi.KhongHopLe,
        MaLoi.ValidationFailed,
        "Dữ liệu không hợp lệ",
        chiTiet,
        "cauTruc");

    private static LoiNghiepVu KhongTimThay(int maMT) => new(
        LoaiLoi.KhongTimThay,
        MaLoi.MatrixNotFound,
        "Không tìm thấy ma trận đề",
        $"Không tồn tại ma trận đề có mã {maMT}.");

    private static LoiNghiepVu DaSinhDe() => new(
        LoaiLoi.XungDot,
        MaLoi.MatrixInUse,
        "Ma trận đã được dùng để sinh đề",
        "Ma trận đã sinh đề nên không sửa, không xóa và không chuyển về đang soạn được; chỉ ngừng sử dụng.");
}
