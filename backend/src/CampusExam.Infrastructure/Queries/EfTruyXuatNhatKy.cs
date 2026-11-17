using CampusExam.Application.NhatKy;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Queries;

public sealed class EfTruyXuatNhatKy(CampusExamDbContext dbContext) : ITruyXuatNhatKy
{
    private const string NhomXacThuc = "XACTHUC";

    public async Task<IReadOnlyList<NhatKyDto>> GetGanDayAsync(TruyVanNhatKy truyVan, CancellationToken cancellationToken)
    {
        var query = dbContext.NhatKyHoatDongs.AsNoTracking();
        if (!truyVan.GomDangNhap)
        {
            query = query.Where(nk => nk.Nhom != NhomXacThuc);
        }

        return await query
            .OrderByDescending(nk => nk.ThoiGian)
            .ThenByDescending(nk => nk.MaNhatKy)
            .Take(truyVan.SoDong)
            .Select(nk => new NhatKyDto(
                nk.MaNhatKy,
                nk.Nhom,
                nk.HanhDong,
                nk.DoiTuong,
                nk.ChiTiet,
                nk.ThoiGian,
                dbContext.TaiKhoans.Where(tk => tk.MaTK == nk.MaTK).Select(tk => tk.HoTen).FirstOrDefault()))
            .ToListAsync(cancellationToken);
    }
}
