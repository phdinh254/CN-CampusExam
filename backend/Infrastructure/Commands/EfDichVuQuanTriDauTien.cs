using System.Data;
using CampusExam.Application.QuanTriVien;
using CampusExam.Application.Interfaces.Security;
using CampusExam.Domain.Entities;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Commands;

public sealed class EfDichVuQuanTriDauTien(
    CampusExamDbContext dbContext,
    IBamMatKhau passwordHasher) : IDichVuQuanTriDauTien
{
    public async Task<KetQuaTaoQuanTriDauTien> CreateAsync(
        LenhTaoQuanTriDauTien command,
        CancellationToken cancellationToken)
    {
        var tenDN = command.TenDN.Trim().ToLowerInvariant();

        // Serializable: hai lần chạy đồng thời không thể cùng tạo admin đầu tiên.
        await using var transaction = await dbContext.Database
            .BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        if (await dbContext.TaiKhoans.AnyAsync(x => x.VaiTro == TaiKhoan.VaiTroAdmin, cancellationToken))
        {
            return KetQuaTaoQuanTriDauTien.Failure(TrangThaiTaoQuanTriDauTien.AdminAlreadyExists);
        }

        if (await dbContext.TaiKhoans.AnyAsync(x => x.TenDN == tenDN, cancellationToken))
        {
            return KetQuaTaoQuanTriDauTien.Failure(TrangThaiTaoQuanTriDauTien.DuplicateTenDN);
        }

        var now = DateTime.UtcNow;
        var admin = TaiKhoan.TaoQuanTri(tenDN, command.HoTen.Trim(), passwordHasher.Hash(command.MatKhau), now);
        dbContext.TaiKhoans.Add(admin);
        await dbContext.SaveChangesAsync(cancellationToken);

        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = admin.MaTK,
            Nhom = "TAIKHOAN",
            HanhDong = "Tạo tài khoản quản trị đầu tiên",
            DoiTuong = $"TAIKHOAN:{tenDN}",
            ThoiGian = now
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);
        return KetQuaTaoQuanTriDauTien.Success(admin.MaTK);
    }
}
