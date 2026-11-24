using CampusExam.Application.Common.Models;
using CampusExam.Application.MaTran;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Queries;

public sealed class EfTruyXuatMaTran(CampusExamDbContext dbContext) : ITruyXuatMaTran
{
    public async Task<TrangDuLieu<MaTranTomTatDto>> GetPageAsync(
        TruyVanMaTran truyVan,
        CancellationToken cancellationToken)
    {
        var query = dbContext.MaTrans.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(truyVan.TuKhoa))
        {
            var tuKhoa = truyVan.TuKhoa.Trim();
            query = query.Where(mt => mt.TenMT.Contains(tuKhoa));
        }

        if (truyVan.TrangThaiEnum is { } trangThai)
        {
            query = query.Where(mt => mt.TrangThaiMaTran == (byte)trangThai);
        }

        var tongSoDong = await query.CountAsync(cancellationToken);

        var dong = await query
            .OrderByDescending(mt => mt.NgayTao)
            .ThenByDescending(mt => mt.MaMT)
            .Skip(truyVan.SoDongBoQua)
            .Take(truyVan.KichThuocTrang)
            .Select(mt => new
            {
                mt.MaMT,
                mt.TenMT,
                mt.TongSoCau,
                mt.ThoiGianLam,
                mt.TrangThaiMaTran,
                SoKQHT = dbContext.CauTrucs.Where(ct => ct.MaMT == mt.MaMT).Select(ct => ct.MaKQHT).Distinct().Count(),
                DaSinhDe = dbContext.DeGocs.Any(de => de.MaMT == mt.MaMT),
                mt.NgayTao,
                mt.NgayCapNhat
            })
            .ToListAsync(cancellationToken);

        var duLieu = dong
            .Select(x => new MaTranTomTatDto(
                x.MaMT,
                x.TenMT,
                x.TongSoCau,
                x.ThoiGianLam,
                (TrangThaiMaTran)x.TrangThaiMaTran,
                x.SoKQHT,
                x.DaSinhDe,
                x.NgayTao,
                x.NgayCapNhat))
            .ToList();

        return new TrangDuLieu<MaTranTomTatDto>(duLieu, truyVan.Trang, truyVan.KichThuocTrang, tongSoDong);
    }

    public async Task<MaTranChiTietDto?> GetByIdAsync(int maMT, CancellationToken cancellationToken)
    {
        var maTran = await dbContext.MaTrans
            .AsNoTracking()
            .SingleOrDefaultAsync(mt => mt.MaMT == maMT, cancellationToken);

        if (maTran is null)
        {
            return null;
        }

        var daSinhDe = await dbContext.DeGocs.AnyAsync(de => de.MaMT == maMT, cancellationToken);

        var o = await (
                from ct in dbContext.CauTrucs.AsNoTracking()
                join kq in dbContext.KqHocTaps.AsNoTracking() on ct.MaKQHT equals kq.MaKQHT
                where ct.MaMT == maMT
                select new { ct.MaKQHT, kq.KyHieu, kq.TenKQHT, kq.ThuTu, kq.TrangThai, ct.MaMD, ct.SoCau, ct.TyLe })
            .ToListAsync(cancellationToken);

        var kqht = o
            .GroupBy(x => new { x.MaKQHT, x.KyHieu, x.TenKQHT, x.ThuTu, x.TrangThai })
            .OrderBy(nhom => nhom.Key.ThuTu)
            .Select(nhom => new KqhtTrongMaTranDto(
                nhom.Key.MaKQHT,
                nhom.Key.KyHieu,
                nhom.Key.TenKQHT,
                nhom.Key.TrangThai == (short)TrangThaiSuDung.DangSuDung,
                nhom.Sum(x => x.SoCau),
                nhom.OrderBy(x => x.MaMD).Select(x => new OCauTrucDto(x.MaMD, x.SoCau, x.TyLe)).ToList()))
            .ToList();

        return new MaTranChiTietDto(
            maTran.MaMT,
            maTran.TenMT,
            maTran.TongSoCau,
            maTran.ThoiGianLam,
            (TrangThaiMaTran)maTran.TrangThaiMaTran,
            daSinhDe,
            maTran.NgayTao,
            maTran.NgayCapNhat,
            Convert.ToBase64String(maTran.PhienBan),
            kqht);
    }

    public async Task<IReadOnlyList<DoPhuDto>> GetDoPhuAsync(CancellationToken cancellationToken)
    {
        return await (
                from ch in dbContext.CauHois.AsNoTracking()
                join kq in dbContext.KqHocTaps.AsNoTracking() on ch.MaKQHT equals kq.MaKQHT
                where ch.TrangThai == (short)TrangThaiSuDung.DangSuDung
                    && kq.TrangThai == (short)TrangThaiSuDung.DangSuDung
                group ch by new { ch.MaKQHT, ch.MaMD } into nhom
                orderby nhom.Key.MaKQHT, nhom.Key.MaMD
                select new DoPhuDto(nhom.Key.MaKQHT, nhom.Key.MaMD, nhom.Count()))
            .ToListAsync(cancellationToken);
    }
}
