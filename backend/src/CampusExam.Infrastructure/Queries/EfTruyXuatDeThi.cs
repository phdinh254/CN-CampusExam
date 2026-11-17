using CampusExam.Application.Common.Models;
using CampusExam.Application.DeThi;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Queries;

public sealed class EfTruyXuatDeThi(CampusExamDbContext dbContext) : ITruyXuatDeThi
{
    private static readonly string[] NhanPhuongAn = ["A", "B", "C", "D"];

    public async Task<TrangDuLieu<DeGocTomTatDto>> GetPageAsync(TruyVanDeThi truyVan, CancellationToken cancellationToken)
    {
        var query =
            from de in dbContext.DeGocs.AsNoTracking()
            join mt in dbContext.MaTrans.AsNoTracking() on de.MaMT equals mt.MaMT
            select new
            {
                de.MaDe,
                de.MaDeGocHienThi,
                de.MaMT,
                mt.TenMT,
                de.TongSoCau,
                SoDeCon = dbContext.DeCons.Count(dc => dc.MaDe == de.MaDe),
                DaGanKyThi = dbContext.KyThis.Any(kt => kt.MaDe == de.MaDe),
                de.NgayTao
            };

        if (!string.IsNullOrWhiteSpace(truyVan.TuKhoa))
        {
            var tuKhoa = truyVan.TuKhoa.Trim();
            query = query.Where(x => x.MaDeGocHienThi.Contains(tuKhoa));
        }

        if (truyVan.MaMT is { } maMT)
        {
            query = query.Where(x => x.MaMT == maMT);
        }

        if (truyVan.ChuaGanKyThi == true)
        {
            query = query.Where(x => !x.DaGanKyThi);
        }

        var tongSoDong = await query.CountAsync(cancellationToken);
        var dong = await query
            .OrderByDescending(x => x.NgayTao)
            .ThenByDescending(x => x.MaDe)
            .Skip(truyVan.SoDongBoQua)
            .Take(truyVan.KichThuocTrang)
            .ToListAsync(cancellationToken);

        return new TrangDuLieu<DeGocTomTatDto>(
            dong.Select(x => new DeGocTomTatDto(x.MaDe, x.MaDeGocHienThi, x.MaMT, x.TenMT, x.TongSoCau, x.SoDeCon, x.DaGanKyThi, x.NgayTao)).ToList(),
            truyVan.Trang,
            truyVan.KichThuocTrang,
            tongSoDong);
    }

    public async Task<DeGocChiTietDto?> GetByIdAsync(int maDe, CancellationToken cancellationToken)
    {
        var deGoc = await (
                from de in dbContext.DeGocs.AsNoTracking()
                join mt in dbContext.MaTrans.AsNoTracking() on de.MaMT equals mt.MaMT
                where de.MaDe == maDe
                select new { de.MaDe, de.MaDeGocHienThi, de.MaMT, mt.TenMT, de.TongSoCau, de.NgayTao })
            .SingleOrDefaultAsync(cancellationToken);

        if (deGoc is null)
        {
            return null;
        }

        var daGanKyThi = await dbContext.KyThis.AnyAsync(kt => kt.MaDe == maDe, cancellationToken);
        var deCon = await dbContext.DeCons
            .AsNoTracking()
            .Where(dc => dc.MaDe == maDe)
            .OrderBy(dc => dc.MaDeCon)
            .Select(dc => new DeConTomTatDto(dc.MaDeCon, dc.TenDeCon))
            .ToListAsync(cancellationToken);

        var cau = await NapCauAsync(maDe, cancellationToken);
        var hinh = await NapHinhAsync(maDe, cancellationToken);

        var cauHoi = cau
            .OrderBy(x => x.ThuTu)
            .Select(x => new CauTrongDeGocDto(
                x.ThuTu,
                x.MaCH,
                x.MaCauHoi,
                x.KyHieu,
                x.MaMD,
                x.NoiDung,
                x.PhuongAnA,
                x.PhuongAnB,
                x.PhuongAnC,
                x.PhuongAnD,
                x.DapAnDung,
                x.CoDinhDa == 1,
                hinh.GetValueOrDefault(x.MaCH, [])))
            .ToList();

        return new DeGocChiTietDto(
            deGoc.MaDe,
            deGoc.MaDeGocHienThi,
            deGoc.MaMT,
            deGoc.TenMT,
            deGoc.TongSoCau,
            daGanKyThi,
            deGoc.NgayTao,
            deCon,
            cauHoi);
    }

    public async Task<DeConChiTietDto?> GetDeConAsync(int maDe, int maDeCon, CancellationToken cancellationToken)
    {
        var deCon = await (
                from dc in dbContext.DeCons.AsNoTracking()
                join de in dbContext.DeGocs.AsNoTracking() on dc.MaDe equals de.MaDe
                where dc.MaDe == maDe && dc.MaDeCon == maDeCon
                select new { dc.MaDeCon, dc.TenDeCon, de.MaDe, de.MaDeGocHienThi })
            .SingleOrDefaultAsync(cancellationToken);

        if (deCon is null)
        {
            return null;
        }

        var hoanVi = await dbContext.HoanVis
            .AsNoTracking()
            .Where(hv => hv.MaDeCon == maDeCon)
            .Select(hv => new { hv.MaCH, hv.TtCau, hv.TtDapAn, hv.DapAnDungHienThi })
            .ToDictionaryAsync(hv => hv.MaCH, cancellationToken);

        var cau = await NapCauAsync(maDe, cancellationToken);
        var hinh = await NapHinhAsync(maDe, cancellationToken);

        var cauHoi = cau
            .Where(x => hoanVi.ContainsKey(x.MaCH))
            .OrderBy(x => hoanVi[x.MaCH].TtCau)
            .Select(x =>
            {
                var hv = hoanVi[x.MaCH];
                var goc = new Dictionary<char, string>
                {
                    ['A'] = x.PhuongAnA,
                    ['B'] = x.PhuongAnB,
                    ['C'] = x.PhuongAnC,
                    ['D'] = x.PhuongAnD
                };
                var phuongAn = hv.TtDapAn
                    .Select((nhanGoc, i) => new PhuongAnHienThiDto(NhanPhuongAn[i], nhanGoc.ToString(), goc[nhanGoc]))
                    .ToList();
                return new CauTrongDeConDto(
                    hv.TtCau,
                    x.ThuTu,
                    x.MaCauHoi,
                    x.NoiDung,
                    phuongAn,
                    hv.DapAnDungHienThi,
                    hinh.GetValueOrDefault(x.MaCH, []));
            })
            .ToList();

        return new DeConChiTietDto(deCon.MaDeCon, deCon.TenDeCon, deCon.MaDe, deCon.MaDeGocHienThi, cauHoi);
    }

    public Task<HinhLuuTruDeDto?> GetHinhAnhAsync(int maDe, int maCH, string viTri, short thuTu, CancellationToken cancellationToken) =>
        dbContext.TaiNguyenGomCaus
            .AsNoTracking()
            .Where(tn => tn.MaDe == maDe && tn.MaCH == maCH && tn.ViTri == viTri && tn.ThuTu == thuTu)
            .Select(tn => new HinhLuuTruDeDto(tn.StorageKey, tn.MimeType))
            .SingleOrDefaultAsync(cancellationToken);

    private async Task<List<CauNap>> NapCauAsync(int maDe, CancellationToken cancellationToken) =>
        await (
                from g in dbContext.GomCaus.AsNoTracking()
                join ch in dbContext.CauHois.AsNoTracking() on g.MaCH equals ch.MaCH
                where g.MaDe == maDe
                select new CauNap(
                    g.ThuTuTrongDeGoc,
                    g.MaCH,
                    ch.MaCauHoi,
                    ch.KyHieu,
                    ch.MaMD,
                    g.NoiDung,
                    g.PhuongAnA,
                    g.PhuongAnB,
                    g.PhuongAnC,
                    g.PhuongAnD,
                    g.DapAnDungGoc,
                    ch.CoDinhDa))
            .ToListAsync(cancellationToken);

    private async Task<Dictionary<int, IReadOnlyList<HinhTrongDeDto>>> NapHinhAsync(int maDe, CancellationToken cancellationToken)
    {
        var hinh = await dbContext.TaiNguyenGomCaus
            .AsNoTracking()
            .Where(tn => tn.MaDe == maDe)
            .Select(tn => new { tn.MaCH, tn.ViTri, tn.ThuTu, tn.AltText })
            .ToListAsync(cancellationToken);

        return hinh
            .GroupBy(tn => tn.MaCH)
            .ToDictionary(
                nhom => nhom.Key,
                nhom => (IReadOnlyList<HinhTrongDeDto>)nhom
                    .OrderBy(tn => tn.ViTri).ThenBy(tn => tn.ThuTu)
                    .Select(tn => new HinhTrongDeDto(tn.ViTri, tn.ThuTu, $"/api/de-goc/{maDe}/hinh-anh/{tn.MaCH}/{tn.ViTri}/{tn.ThuTu}", tn.AltText))
                    .ToList());
    }

    private sealed record CauNap(
        int ThuTu,
        int MaCH,
        string MaCauHoi,
        string KyHieu,
        byte MaMD,
        string NoiDung,
        string PhuongAnA,
        string PhuongAnB,
        string PhuongAnC,
        string PhuongAnD,
        string DapAnDung,
        short CoDinhDa);
}
