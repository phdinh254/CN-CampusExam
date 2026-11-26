using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;
using CampusExam.Domain.Entities;
using CampusExam.Infrastructure.Persistence;
using CampusExam.Infrastructure.Queries;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Commands;

public sealed class EfDichVuLenhKyThi(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider) : IDichVuLenhKyThi
{
    private const string NhomNhatKy = "KYTHI";

    public async Task<KetQua<KyThiChiTietDto>> TaoAsync(
        LuuKyThiCommand command,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var kyThi = new KyThi
        {
            MaTK = nguoi.MaTK,
            NgayTao = now,
            TrangThaiKyThi = (byte)TrangThaiKyThi.Nhap
        };
        ApDung(kyThi, command);

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        dbContext.KyThis.Add(kyThi);
        await dbContext.SaveChangesAsync(cancellationToken);
        GhiNhatKy(nguoi, "Tạo kỳ thi", kyThi.MaKT, kyThi.TenKT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(kyThi.MaKT, cancellationToken);
    }

    public async Task<KetQua<KyThiChiTietDto>> SuaAsync(
        int maKT,
        SuaKyThiCommand command,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var kyThi = await dbContext.KyThis.SingleOrDefaultAsync(kt => kt.MaKT == maKT, cancellationToken);
        if (kyThi is null)
        {
            return KhongTimThay(maKT);
        }

        if (kyThi.TrangThaiKyThi != (byte)TrangThaiKyThi.Nhap)
        {
            return SaiTrangThai("Chỉ sửa được kỳ thi nháp. Kỳ thi đã phát hành không đổi giờ thi, thời lượng hay đề.");
        }

        // Phiên bản client đã xem là giá trị gốc: lệch với database thì UPDATE không khớp dòng nào.
        dbContext.Entry(kyThi).Property(x => x.PhienBan).OriginalValue = command.PhienBanBytes()!;
        ApDung(kyThi, command);
        GhiNhatKy(nguoi, "Sửa kỳ thi", maKT, kyThi.TenKT, Now());

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return XungDotPhienBan();
        }

        return await ChiTietAsync(maKT, cancellationToken);
    }

    public async Task<KetQua<KhongCo>> XoaAsync(int maKT, NguoiThucHien nguoi, CancellationToken cancellationToken)
    {
        var kyThi = await dbContext.KyThis
            .AsNoTracking()
            .Where(kt => kt.MaKT == maKT)
            .Select(kt => new { kt.TenKT, kt.TrangThaiKyThi })
            .SingleOrDefaultAsync(cancellationToken);

        if (kyThi is null)
        {
            return KhongTimThay(maKT);
        }

        if (kyThi.TrangThaiKyThi != (byte)TrangThaiKyThi.Nhap)
        {
            return SaiTrangThai("Chỉ xóa được kỳ thi nháp. Kỳ thi đã phát hành thì dùng thao tác hủy.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await dbContext.PhanCongThis.Where(pc => pc.MaKT == maKT).ExecuteDeleteAsync(cancellationToken);
        var soDong = await dbContext.KyThis
            .Where(kt => kt.MaKT == maKT && kt.TrangThaiKyThi == (byte)TrangThaiKyThi.Nhap)
            .ExecuteDeleteAsync(cancellationToken);

        if (soDong == 0)
        {
            return SaiTrangThai("Kỳ thi vừa được phát hành ở nơi khác nên không xóa được.");
        }

        GhiNhatKy(nguoi, "Xóa kỳ thi", maKT, kyThi.TenKT, Now());
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return KetQua<KhongCo>.Ok(default);
    }

    public async Task<KetQua<KyThiChiTietDto>> GanDeGocAsync(
        int maKT,
        int? maDe,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var kyThi = await dbContext.KyThis.SingleOrDefaultAsync(kt => kt.MaKT == maKT, cancellationToken);
        if (kyThi is null)
        {
            return KhongTimThay(maKT);
        }

        if (kyThi.TrangThaiKyThi != (byte)TrangThaiKyThi.Nhap)
        {
            return SaiTrangThai("Chỉ đổi đề gốc khi kỳ thi còn nháp.");
        }

        if (await dbContext.PhanCongThis.AnyAsync(pc => pc.MaKT == maKT, cancellationToken))
        {
            return SaiTrangThai("Kỳ thi đã có thí sinh được phân công. Gỡ hết thí sinh trước khi đổi đề gốc.");
        }

        string? tenDe = null;
        if (maDe is { } ma)
        {
            tenDe = await dbContext.DeGocs
                .Where(de => de.MaDe == ma)
                .Select(de => de.MaDeGocHienThi)
                .SingleOrDefaultAsync(cancellationToken);

            if (tenDe is null)
            {
                return new LoiNghiepVu(LoaiLoi.KhongHopLe, MaLoi.PaperNotFound, "Không tìm thấy đề gốc",
                    $"Không tồn tại đề gốc có mã {ma}.", "maDe");
            }

            if (await dbContext.KyThis.AnyAsync(kt => kt.MaDe == ma && kt.MaKT != maKT, cancellationToken))
            {
                return DeDaDung(tenDe);
            }
        }

        kyThi.MaDe = maDe;
        GhiNhatKy(nguoi, maDe is null ? "Gỡ đề gốc khỏi kỳ thi" : "Gắn đề gốc cho kỳ thi", maKT,
            maDe is null ? kyThi.TenKT : $"{kyThi.TenKT} — {tenDe}", Now());

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return XungDotPhienBan();
        }
        catch (Exception exception) when (SqlLoi.LaTrungKhoa(exception))
        {
            return DeDaDung(tenDe ?? string.Empty);
        }

        return await ChiTietAsync(maKT, cancellationToken);
    }

    public async Task<KetQua<KetQuaPhanCongDto>> PhanCongAsync(
        int maKT,
        IReadOnlyList<string> dsMsts,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var kyThi = await dbContext.KyThis
            .AsNoTracking()
            .Where(kt => kt.MaKT == maKT)
            .Select(kt => new { kt.TenKT, kt.MaDe, kt.CachPhanDe, kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong })
            .SingleOrDefaultAsync(cancellationToken);

        if (kyThi is null)
        {
            return KhongTimThay(maKT);
        }

        if (!ConPhanCongDuoc(kyThi.TrangThaiKyThi, kyThi.TgBatDau, kyThi.ThoiLuong, now))
        {
            return SaiTrangThai("Kỳ thi đã kết thúc hoặc đã hủy nên không phân công thêm được.");
        }

        if (kyThi.MaDe is not { } maDe)
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamNotReady, "Kỳ thi chưa có đề",
                "Gắn đề gốc cho kỳ thi trước khi phân công thí sinh.");
        }

        var yeuCau = dsMsts
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToUpperInvariant())
            .Distinct()
            .ToList();

        var tonTai = (await dbContext.ThiSinhs
                .AsNoTracking()
                .Where(ts => yeuCau.Contains(ts.Msts))
                .Select(ts => ts.Msts)
                .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var daPhanCong = (await dbContext.PhanCongThis
                .AsNoTracking()
                .Where(pc => pc.MaKT == maKT && yeuCau.Contains(pc.Msts))
                .Select(pc => pc.Msts)
                .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var boQua = new List<string>();
        var moi = new List<string>();
        foreach (var msts in yeuCau)
        {
            if (!tonTai.Contains(msts))
            {
                boQua.Add($"{msts}: không có thí sinh này");
            }
            else if (daPhanCong.Contains(msts))
            {
                boQua.Add($"{msts}: đã được phân công");
            }
            else
            {
                moi.Add(tonTai.First(x => string.Equals(x, msts, StringComparison.OrdinalIgnoreCase)));
            }
        }

        if (moi.Count == 0)
        {
            return KetQua<KetQuaPhanCongDto>.Ok(new KetQuaPhanCongDto(0, boQua));
        }

        var deCon = await dbContext.DeCons
            .AsNoTracking()
            .Where(dc => dc.MaDe == maDe)
            .OrderBy(dc => dc.TenDeCon)
            .Select(dc => dc.MaDeCon)
            .ToListAsync(cancellationToken);

        // Số thí sinh hiện có ở từng đề con, để chia cân bằng tiếp nối các lần phân công trước.
        var demHienCo = await dbContext.PhanCongThis
            .AsNoTracking()
            .Where(pc => pc.MaKT == maKT)
            .GroupBy(pc => pc.MaDeCon)
            .Select(g => new { MaDeCon = g.Key, So = g.Count() })
            .ToDictionaryAsync(x => x.MaDeCon, x => x.So, cancellationToken);
        var dem = deCon.ToDictionary(ma => ma, ma => demHienCo.GetValueOrDefault(ma));

        foreach (var msts in moi.OrderBy(_ => Random.Shared.Next()))
        {
            var chon = kyThi.CachPhanDe == (byte)CachPhanDe.NgauNhien
                ? deCon[Random.Shared.Next(deCon.Count)]
                : deCon.OrderBy(ma => dem[ma]).ThenBy(ma => deCon.IndexOf(ma)).First();
            dem[chon]++;

            dbContext.PhanCongThis.Add(new PhanCongThi { MaKT = maKT, Msts = msts, MaDeCon = chon, MaDe = maDe });
        }

        GhiNhatKy(nguoi, "Phân công thí sinh", maKT, $"{kyThi.TenKT}: thêm {moi.Count} thí sinh", now);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception exception) when (SqlLoi.LaTrungKhoa(exception) || SqlLoi.LaViPhamRangBuoc(exception))
        {
            // Phân công đồng thời cùng thí sinh, hoặc đề gốc vừa bị đổi ở nơi khác.
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ConcurrencyConflict, "Phân công vừa thay đổi",
                "Danh sách phân công hoặc đề của kỳ thi vừa được sửa ở nơi khác. Tải lại rồi thử lại.");
        }

        return KetQua<KetQuaPhanCongDto>.Ok(new KetQuaPhanCongDto(moi.Count, boQua));
    }

    public async Task<KetQua<KhongCo>> DoiSoMayAsync(
        int maKT,
        string msts,
        string? soMay,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var phanCong = await TimPhanCongAsync(maKT, msts, cancellationToken);
        if (phanCong.Loi is not null)
        {
            return phanCong.Loi;
        }

        if (!ConPhanCongDuoc(phanCong.TrangThaiKyThi, phanCong.TgBatDau, phanCong.ThoiLuong, now))
        {
            return SaiTrangThai("Kỳ thi đã kết thúc hoặc đã hủy nên không đổi số máy được.");
        }

        var giaTri = string.IsNullOrWhiteSpace(soMay) ? null : soMay.Trim().ToUpperInvariant();
        await dbContext.PhanCongThis
            .Where(pc => pc.MaPhanCong == phanCong.MaPhanCong)
            .ExecuteUpdateAsync(setters => setters.SetProperty(pc => pc.SoMay, giaTri), cancellationToken);
        return KetQua<KhongCo>.Ok(default);
    }

    public async Task<KetQua<KhongCo>> BoPhanCongAsync(
        int maKT,
        string msts,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var phanCong = await TimPhanCongAsync(maKT, msts, cancellationToken);
        if (phanCong.Loi is not null)
        {
            return phanCong.Loi;
        }

        if (!ConPhanCongDuoc(phanCong.TrangThaiKyThi, phanCong.TgBatDau, phanCong.ThoiLuong, now))
        {
            return SaiTrangThai("Kỳ thi đã kết thúc hoặc đã hủy nên không gỡ thí sinh được.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var soDong = await dbContext.PhanCongThis
            .Where(pc => pc.MaPhanCong == phanCong.MaPhanCong
                && !dbContext.BaiLams.Any(bl => bl.MaPhanCong == pc.MaPhanCong))
            .ExecuteDeleteAsync(cancellationToken);

        if (soDong == 0)
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamStudentStarted, "Thí sinh đã vào làm bài",
                $"Thí sinh {phanCong.Msts} đã vào làm bài nên không gỡ khỏi kỳ thi được.");
        }

        GhiNhatKy(nguoi, "Gỡ thí sinh khỏi kỳ thi", maKT, $"{phanCong.TenKT}: {phanCong.Msts}", now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return KetQua<KhongCo>.Ok(default);
    }

    public async Task<KetQua<KyThiChiTietDto>> PhatHanhAsync(
        int maKT,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var conThieu = await DieuKienPhatHanh.TimAsync(dbContext, maKT, now, cancellationToken);
        if (conThieu is null)
        {
            return KhongTimThay(maKT);
        }

        if (conThieu.Count > 0)
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamNotReady, "Kỳ thi chưa đủ điều kiện phát hành",
                string.Join("; ", conThieu) + ".");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var soDong = await dbContext.KyThis
            .Where(kt => kt.MaKT == maKT && kt.TrangThaiKyThi == (byte)TrangThaiKyThi.Nhap && kt.MaDe != null)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(kt => kt.TrangThaiKyThi, (byte)TrangThaiKyThi.DaPhatHanh)
                    .SetProperty(kt => kt.NgayPhatHanh, now),
                cancellationToken);

        if (soDong == 0)
        {
            return SaiTrangThai("Kỳ thi vừa được thay đổi ở nơi khác. Tải lại rồi thử lại.");
        }

        var tenKT = await dbContext.KyThis.Where(kt => kt.MaKT == maKT).Select(kt => kt.TenKT).SingleAsync(cancellationToken);
        GhiNhatKy(nguoi, "Phát hành kỳ thi", maKT, tenKT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(maKT, cancellationToken);
    }

    public async Task<KetQua<KyThiChiTietDto>> HuyAsync(int maKT, NguoiThucHien nguoi, CancellationToken cancellationToken)
    {
        var now = Now();
        var kyThi = await dbContext.KyThis
            .AsNoTracking()
            .Where(kt => kt.MaKT == maKT)
            .Select(kt => new { kt.TenKT, kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong })
            .SingleOrDefaultAsync(cancellationToken);

        if (kyThi is null)
        {
            return KhongTimThay(maKT);
        }

        if (!ConPhanCongDuoc(kyThi.TrangThaiKyThi, kyThi.TgBatDau, kyThi.ThoiLuong, now))
        {
            return SaiTrangThai("Kỳ thi đã kết thúc hoặc đã hủy.");
        }

        var coBaiLam = await (
                from pc in dbContext.PhanCongThis
                join bl in dbContext.BaiLams on pc.MaPhanCong equals bl.MaPhanCong
                where pc.MaKT == maKT
                select bl.MaBL)
            .AnyAsync(cancellationToken);

        if (coBaiLam)
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamStudentStarted, "Đã có thí sinh vào làm bài",
                "Kỳ thi đã có thí sinh vào làm bài nên không hủy được.");
        }

        // Gỡ phân công trước: khóa ngoại PHANCONGTHI(MAKT, MADE) trỏ tới đề của kỳ thi. Gỡ đề để dùng
        // lại cho kỳ thi khác.
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        await dbContext.PhanCongThis
            .Where(pc => pc.MaKT == maKT && !dbContext.BaiLams.Any(bl => bl.MaPhanCong == pc.MaPhanCong))
            .ExecuteDeleteAsync(cancellationToken);

        try
        {
            await dbContext.KyThis
                .Where(kt => kt.MaKT == maKT)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(kt => kt.TrangThaiKyThi, (byte)TrangThaiKyThi.DaHuy)
                        .SetProperty(kt => kt.MaDe, (int?)null),
                    cancellationToken);
        }
        catch (Exception exception) when (SqlLoi.LaViPhamRangBuoc(exception))
        {
            // Một thí sinh vừa vào làm bài: phân công của họ còn nên không gỡ được đề.
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamStudentStarted, "Đã có thí sinh vào làm bài",
                "Có thí sinh vừa vào làm bài nên không hủy được kỳ thi.");
        }

        GhiNhatKy(nguoi, "Hủy kỳ thi", maKT, kyThi.TenKT, now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ChiTietAsync(maKT, cancellationToken);
    }

    public async Task<KetQua<KhongCo>> CongGioAsync(
        int maKT,
        int maBL,
        CongGioRequest request,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = Now();
        var bai = await (
                from bl in dbContext.BaiLams.AsNoTracking()
                join pc in dbContext.PhanCongThis.AsNoTracking() on bl.MaPhanCong equals pc.MaPhanCong
                join kt in dbContext.KyThis.AsNoTracking() on pc.MaKT equals kt.MaKT
                where bl.MaBL == maBL && pc.MaKT == maKT
                select new { bl.TrangThaiBaiLam, bl.PhutCongThem, pc.Msts, kt.TenKT, kt.TgBatDau, kt.ThoiLuong })
            .SingleOrDefaultAsync(cancellationToken);

        if (bai is null)
        {
            return new LoiNghiepVu(LoaiLoi.KhongTimThay, MaLoi.AttemptNotFound, "Không tìm thấy bài làm",
                $"Kỳ thi {maKT} không có bài làm mã {maBL}.");
        }

        if (bai.TrangThaiBaiLam != BaiLam.DangLam
            || now >= bai.TgBatDau.AddMinutes(bai.ThoiLuong + bai.PhutCongThem))
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.AttemptClosed, "Bài làm đã đóng",
                "Chỉ cộng giờ cho bài đang làm và chưa hết hạn. Bài đã nộp hoặc đã thu không mở lại được.");
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var soDong = await dbContext.BaiLams
            .Where(bl => bl.MaBL == maBL && bl.TrangThaiBaiLam == BaiLam.DangLam)
            .ExecuteUpdateAsync(s => s.SetProperty(bl => bl.PhutCongThem, bl => bl.PhutCongThem + request.SoPhut), cancellationToken);

        if (soDong == 0)
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.AttemptClosed, "Bài làm đã đóng",
                "Bài vừa được nộp hoặc thu nên không cộng giờ được.");
        }

        GhiNhatKy(nguoi, "Cộng giờ làm bài", maKT,
            $"{bai.TenKT}: thí sinh {bai.Msts}, cộng {request.SoPhut} phút (tổng {bai.PhutCongThem + request.SoPhut}). Lý do: {request.LyDo.Trim()}", now);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return KetQua<KhongCo>.Ok(default);
    }

    /// <summary>Còn thêm/bớt thí sinh được khi kỳ thi nháp, đã phát hành hoặc đang thi.</summary>
    private static bool ConPhanCongDuoc(byte trangThaiLuu, DateTime tgBatDau, int thoiLuong, DateTime now) =>
        QuyTacKyThi.TrangThaiHienThi(trangThaiLuu, tgBatDau, thoiLuong, now)
            is TrangThaiKyThi.Nhap or TrangThaiKyThi.DaPhatHanh or TrangThaiKyThi.DangThi;

    private async Task<PhanCongTimThay> TimPhanCongAsync(int maKT, string msts, CancellationToken cancellationToken)
    {
        var kyThi = await dbContext.KyThis
            .AsNoTracking()
            .Where(kt => kt.MaKT == maKT)
            .Select(kt => new { kt.TenKT, kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong })
            .SingleOrDefaultAsync(cancellationToken);

        if (kyThi is null)
        {
            return new PhanCongTimThay { Loi = KhongTimThay(maKT) };
        }

        var ma = msts.Trim().ToUpperInvariant();
        var phanCong = await dbContext.PhanCongThis
            .AsNoTracking()
            .Where(pc => pc.MaKT == maKT && pc.Msts == ma)
            .Select(pc => new { pc.MaPhanCong, pc.Msts })
            .SingleOrDefaultAsync(cancellationToken);

        if (phanCong is null)
        {
            return new PhanCongTimThay
            {
                Loi = new LoiNghiepVu(LoaiLoi.KhongTimThay, MaLoi.ExamAssignmentNotFound, "Không tìm thấy phân công",
                    $"Thí sinh {ma} không được phân công vào kỳ thi này.")
            };
        }

        return new PhanCongTimThay
        {
            MaPhanCong = phanCong.MaPhanCong,
            Msts = phanCong.Msts,
            TenKT = kyThi.TenKT,
            TrangThaiKyThi = kyThi.TrangThaiKyThi,
            TgBatDau = kyThi.TgBatDau,
            ThoiLuong = kyThi.ThoiLuong
        };
    }

    private sealed class PhanCongTimThay
    {
        public LoiNghiepVu? Loi { get; init; }

        public int MaPhanCong { get; init; }

        public string Msts { get; init; } = string.Empty;

        public string TenKT { get; init; } = string.Empty;

        public byte TrangThaiKyThi { get; init; }

        public DateTime TgBatDau { get; init; }

        public int ThoiLuong { get; init; }
    }

    private static void ApDung(KyThi kyThi, LuuKyThiCommand command)
    {
        kyThi.TenKT = command.TenKT.Trim();
        kyThi.MonThi = command.MonThi.Trim();
        kyThi.TgBatDau = command.TgBatDauUtc;
        kyThi.ThoiLuong = command.ThoiLuong;
        kyThi.SoPhutChoVaoTre = command.SoPhutChoVaoTre;
        kyThi.HienDiem = (short)(command.HienDiem ? 1 : 0);
        kyThi.CachPhanDe = (byte)command.CachPhanDe;
    }

    private DateTime Now() => timeProvider.GetUtcNow().UtcDateTime;

    private async Task<KetQua<KyThiChiTietDto>> ChiTietAsync(int maKT, CancellationToken cancellationToken) =>
        KetQua<KyThiChiTietDto>.Ok((await new EfTruyXuatKyThi(dbContext, timeProvider).GetByIdAsync(maKT, cancellationToken))!);

    private void GhiNhatKy(NguoiThucHien nguoi, string hanhDong, int maKT, string? chiTiet, DateTime now) =>
        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = nguoi.MaTK,
            Nhom = NhomNhatKy,
            HanhDong = hanhDong,
            DoiTuong = $"KYTHI:{maKT}",
            ChiTiet = chiTiet is { Length: > 500 } ? chiTiet[..500] : chiTiet,
            ThoiGian = now,
            DiaChiIP = nguoi.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoi.DiaChiIP
        });

    private static LoiNghiepVu KhongTimThay(int maKT) => new(
        LoaiLoi.KhongTimThay,
        MaLoi.ExamNotFound,
        "Không tìm thấy kỳ thi",
        $"Không tồn tại kỳ thi có mã {maKT}.");

    private static LoiNghiepVu SaiTrangThai(string chiTiet) => new(
        LoaiLoi.XungDot,
        MaLoi.ExamInvalidState,
        "Kỳ thi không ở trạng thái phù hợp",
        chiTiet);

    private static LoiNghiepVu XungDotPhienBan() => new(
        LoaiLoi.XungDot,
        MaLoi.ConcurrencyConflict,
        "Kỳ thi đã bị thay đổi",
        "Kỳ thi vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất trước khi sửa.");

    private static LoiNghiepVu DeDaDung(string tenDe) => new(
        LoaiLoi.XungDot,
        MaLoi.PaperInUse,
        "Đề gốc đã được dùng",
        $"Đề gốc {tenDe} đã gắn cho kỳ thi khác. Mỗi đề gốc chỉ dùng cho một kỳ thi.");
}
