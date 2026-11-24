namespace CampusExam.Application.Common;

/// <summary>Kiểm tra các thành phần hệ thống phụ thuộc (dùng cho endpoint tình trạng).</summary>
public interface IKiemTraTinhTrang
{
    Task<bool> KetNoiDuocDatabaseAsync(CancellationToken cancellationToken);
}
