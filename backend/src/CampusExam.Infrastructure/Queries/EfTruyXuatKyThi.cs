using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Queries;

public sealed class EfTruyXuatKyThi(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider) : ITruyXuatKyThi
{
    private static readonly byte[] TrangThaiDaPhatHanh = [1, 2, 3];

    public async Task<TrangDuLieu<KyThiTomTatDto>> GetPageAsync(
        TruyVanKyThi truyVan,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var query = dbContext.KyThis.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(truyVan.TuKhoa))
        {
            var tuKhoa = truyVan.TuKhoa.Trim();
            query = query.Where(kt => kt.TenKT.Contains(tuKhoa) || kt.MonThi.Contains(tuKhoa));
        }

        // Lọc theo trạng thái hiển thị: ba trạng thái 1–3 suy từ giờ bắt đầu và thời lượng.
        query = truyVan.TrangThaiEnum switch
        {
            TrangThaiKyThi.Nhap => query.Where(kt => kt.TrangThaiKyThi == 0),
            TrangThaiKyThi.DaHuy => query.Where(kt => kt.TrangThaiKyThi == 4),
            TrangThaiKyThi.DaPhatHanh => query.Where(kt =>
                TrangThaiDaPhatHanh.Contains(kt.TrangThaiKyThi) && kt.TgBatDau > now),
            TrangThaiKyThi.DangThi => query.Where(kt =>
                TrangThaiDaPhatHanh.Contains(kt.TrangThaiKyThi)
                && kt.TgBatDau <= now
                && kt.TgBatDau.AddMinutes(kt.ThoiLuong) > now),
            TrangThaiKyThi.DaKetThuc => query.Where(kt =>
                TrangThaiDaPhatHanh.Contains(kt.TrangThaiKyThi) && kt.TgBatDau.AddMinutes(kt.ThoiLuong) <= now),
            _ => query
        };

        var tongSoDong = await query.CountAsync(cancellationToken);

        var dong = await query
            .OrderByDescending(kt => kt.TgBatDau)
            .ThenByDescending(kt => kt.MaKT)
            .Skip(truyVan.SoDongBoQua)
            .Take(truyVan.KichThuocTrang)
            .Select(kt => new
            {
                kt.MaKT,
                kt.TenKT,
                kt.MonThi,
                kt.TgBatDau,
                kt.ThoiLuong,
                kt.TrangThaiKyThi,
                SoThiSinh = dbContext.PhanCongThis.Count(pc => pc.MaKT == kt.MaKT),
                SoDaNop = (
                    from pc in dbContext.PhanCongThis
                    join bl in dbContext.BaiLams on pc.MaPhanCong equals bl.MaPhanCong
                    where pc.MaKT == kt.MaKT && bl.TrangThaiBaiLam != 0
                    select bl.MaBL).Count(),
                MaDeGocHienThi = dbContext.DeGocs
                    .Where(de => de.MaDe == kt.MaDe)
                    .Select(de => de.MaDeGocHienThi)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var duLieu = dong
            .Select(x => new KyThiTomTatDto(
                x.MaKT,
                x.TenKT,
                x.MonThi,
                x.TgBatDau,
                x.ThoiLuong,
                QuyTacKyThi.TrangThaiHienThi(x.TrangThaiKyThi, x.TgBatDau, x.ThoiLuong, now),
                x.SoThiSinh,
                x.SoDaNop,
                x.MaDeGocHienThi is not null,
                x.MaDeGocHienThi))
            .ToList();

        return new TrangDuLieu<KyThiTomTatDto>(duLieu, truyVan.Trang, truyVan.KichThuocTrang, tongSoDong);
    }

    public async Task<KyThiChiTietDto?> GetByIdAsync(int maKT, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var x = await dbContext.KyThis
            .AsNoTracking()
            .Where(kt => kt.MaKT == maKT)
            .Select(kt => new
            {
                KyThi = kt,
                DeGoc = (
                    from de in dbContext.DeGocs
                    join mt in dbContext.MaTrans on de.MaMT equals mt.MaMT
                    where de.MaDe == kt.MaDe
                    select new
                    {
                        de.MaDe,
                        de.MaDeGocHienThi,
                        mt.TenMT,
                        de.TongSoCau,
                        SoDeCon = dbContext.DeCons.Count(dc => dc.MaDe == de.MaDe)
                    }).FirstOrDefault(),
                SoThiSinh = dbContext.PhanCongThis.Count(pc => pc.MaKT == kt.MaKT),
                SoDaVaoThi = (
                    from pc in dbContext.PhanCongThis
                    join bl in dbContext.BaiLams on pc.MaPhanCong equals bl.MaPhanCong
                    where pc.MaKT == kt.MaKT
                    select bl.MaBL).Count()
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (x is null)
        {
            return null;
        }

        var kt = x.KyThi;
        return new KyThiChiTietDto(
            kt.MaKT,
            kt.TenKT,
            kt.MonThi,
            kt.TgBatDau,
            kt.ThoiLuong,
            kt.SoPhutChoVaoTre,
            kt.HienDiem == 1,
            kt.ChoXemLai == 1,
            (CachPhanDe)kt.CachPhanDe,
            QuyTacKyThi.TrangThaiHienThi(kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong, now),
            kt.NgayTao,
            kt.NgayPhatHanh,
            Convert.ToBase64String(kt.PhienBan),
            x.DeGoc is null
                ? null
                : new DeGocCuaKyThiDto(x.DeGoc.MaDe, x.DeGoc.MaDeGocHienThi, x.DeGoc.TenMT, x.DeGoc.TongSoCau, x.DeGoc.SoDeCon),
            x.SoThiSinh,
            x.SoDaVaoThi);
    }

    public async Task<IReadOnlyList<ThiSinhKyThiDto>?> GetThiSinhAsync(int maKT, CancellationToken cancellationToken)
    {
        if (!await dbContext.KyThis.AnyAsync(kt => kt.MaKT == maKT, cancellationToken))
        {
            return null;
        }

        var dong = await (
                from pc in dbContext.PhanCongThis.AsNoTracking()
                join ts in dbContext.ThiSinhs.AsNoTracking() on pc.Msts equals ts.Msts
                join dc in dbContext.DeCons.AsNoTracking() on pc.MaDeCon equals dc.MaDeCon
                where pc.MaKT == maKT
                select new
                {
                    pc.Msts,
                    ts.HoTen,
                    ts.Lop,
                    pc.SoMay,
                    dc.TenDeCon,
                    TrangThaiBaiLam = dbContext.BaiLams
                        .Where(bl => bl.MaPhanCong == pc.MaPhanCong)
                        .Select(bl => (byte?)bl.TrangThaiBaiLam)
                        .FirstOrDefault()
                })
            .OrderBy(x => x.Msts)
            .ToListAsync(cancellationToken);

        return dong
            .Select(x => new ThiSinhKyThiDto(
                x.Msts,
                x.HoTen,
                x.Lop,
                x.SoMay,
                x.TenDeCon,
                QuyTacKyThi.TrangThaiThiSinh(x.TrangThaiBaiLam)))
            .ToList();
    }

    public async Task<GiamSatKyThiDto?> GiamSatAsync(int maKT, CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var kt = await dbContext.KyThis
            .AsNoTracking()
            .Where(x => x.MaKT == maKT)
            .Select(x => new
            {
                x.TenKT,
                x.MonThi,
                x.TrangThaiKyThi,
                x.TgBatDau,
                x.ThoiLuong,
                x.SoPhutChoVaoTre,
                TongSoCau = dbContext.DeGocs.Where(de => de.MaDe == x.MaDe).Select(de => de.TongSoCau).FirstOrDefault()
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (kt is null)
        {
            return null;
        }

        var dong = await (
                from pc in dbContext.PhanCongThis.AsNoTracking()
                join ts in dbContext.ThiSinhs.AsNoTracking() on pc.Msts equals ts.Msts
                join dc in dbContext.DeCons.AsNoTracking() on pc.MaDeCon equals dc.MaDeCon
                where pc.MaKT == maKT
                select new
                {
                    pc.Msts,
                    ts.HoTen,
                    ts.Lop,
                    pc.SoMay,
                    dc.TenDeCon,
                    Bai = dbContext.BaiLams
                        .Where(bl => bl.MaPhanCong == pc.MaPhanCong)
                        .Select(bl => new
                        {
                            bl.MaBL,
                            bl.TrangThaiBaiLam,
                            bl.TgBatDau,
                            bl.TgNop,
                            bl.LanHdCuoi,
                            bl.PhutCongThem,
                            bl.SoCauDung,
                            bl.Diem,
                            SoCauDaLam = dbContext.TraLois.Count(tl => tl.MaBL == bl.MaBL && tl.DapAnChon != null)
                        })
                        .FirstOrDefault()
                })
            .OrderBy(x => x.SoMay == null)
            .ThenBy(x => x.SoMay)
            .ThenBy(x => x.Msts)
            .ToListAsync(cancellationToken);

        var thiSinh = dong
            .Select(x => new ThiSinhGiamSatDto(
                x.Msts,
                x.HoTen,
                x.Lop,
                x.SoMay,
                x.TenDeCon,
                QuyTacKyThi.TrangThaiThiSinh(x.Bai?.TrangThaiBaiLam),
                x.Bai?.MaBL,
                x.Bai?.TgBatDau,
                x.Bai?.TgNop,
                x.Bai?.LanHdCuoi,
                x.Bai?.SoCauDaLam ?? 0,
                x.Bai?.PhutCongThem ?? 0,
                x.Bai is null ? null : kt.TgBatDau.AddMinutes(kt.ThoiLuong + x.Bai.PhutCongThem),
                x.Bai?.SoCauDung,
                x.Bai?.Diem))
            .ToList();

        var soLuong = new SoLuongGiamSatDto(
            thiSinh.Count,
            thiSinh.Count(x => x.TrangThai == TrangThaiThiSinhKyThi.ChuaThi),
            thiSinh.Count(x => x.TrangThai == TrangThaiThiSinhKyThi.DangThi),
            thiSinh.Count(x => x.TrangThai == TrangThaiThiSinhKyThi.DaNop),
            thiSinh.Count(x => x.TrangThai == TrangThaiThiSinhKyThi.HeThongThu));

        return new GiamSatKyThiDto(
            maKT,
            kt.TenKT,
            kt.MonThi,
            QuyTacKyThi.TrangThaiHienThi(kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong, now),
            now,
            kt.TgBatDau,
            kt.TgBatDau.AddMinutes(kt.SoPhutChoVaoTre),
            kt.TgBatDau.AddMinutes(kt.ThoiLuong),
            kt.TongSoCau,
            soLuong,
            thiSinh);
    }

    public async Task<KiemTraPhatHanhDto?> KiemTraPhatHanhAsync(int maKT, CancellationToken cancellationToken)
    {
        var conThieu = await DieuKienPhatHanh.TimAsync(
            dbContext, maKT, timeProvider.GetUtcNow().UtcDateTime, cancellationToken);
        return conThieu is null ? null : new KiemTraPhatHanhDto(conThieu.Count == 0, conThieu);
    }
}

/// <summary>Điều kiện phát hành kỳ thi, dùng chung cho màn kiểm tra và lệnh phát hành.</summary>
internal static class DieuKienPhatHanh
{
    /// <summary>Danh sách điều kiện còn thiếu; null khi không có kỳ thi.</summary>
    public static async Task<List<string>?> TimAsync(
        CampusExamDbContext dbContext,
        int maKT,
        DateTime now,
        CancellationToken cancellationToken)
    {
        var kt = await dbContext.KyThis
            .AsNoTracking()
            .Where(x => x.MaKT == maKT)
            .Select(x => new
            {
                x.TrangThaiKyThi,
                x.MaDe,
                x.TgBatDau,
                SoThiSinh = dbContext.PhanCongThis.Count(pc => pc.MaKT == x.MaKT)
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (kt is null)
        {
            return null;
        }

        var conThieu = new List<string>();
        if (kt.TrangThaiKyThi != (byte)TrangThaiKyThi.Nhap)
        {
            conThieu.Add("Kỳ thi không ở trạng thái nháp");
            return conThieu;
        }

        if (kt.MaDe is null)
        {
            conThieu.Add("Chưa gắn đề gốc");
        }

        if (kt.SoThiSinh == 0)
        {
            conThieu.Add("Chưa phân công thí sinh nào");
        }

        if (kt.TgBatDau <= now)
        {
            conThieu.Add("Giờ bắt đầu đã qua, hãy sửa lại giờ bắt đầu");
        }

        return conThieu;
    }
}
