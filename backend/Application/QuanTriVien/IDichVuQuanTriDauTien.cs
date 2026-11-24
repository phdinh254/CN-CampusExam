namespace CampusExam.Application.QuanTriVien;

/// <summary>Tạo tài khoản quản trị đầu tiên; từ chối khi hệ thống đã có quản trị viên.</summary>
public interface IDichVuQuanTriDauTien
{
    Task<KetQuaTaoQuanTriDauTien> CreateAsync(
        LenhTaoQuanTriDauTien command,
        CancellationToken cancellationToken);
}
