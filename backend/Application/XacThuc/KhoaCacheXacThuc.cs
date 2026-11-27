namespace CampusExam.Application.XacThuc;

/// <summary>
/// Khóa cache dùng chung giữa xác thực và quản trị tài khoản. Mọi thao tác đổi
/// <c>MABAOMAT</c> hoặc khóa tài khoản phải xóa khóa này để token cũ bị từ chối ngay.
/// </summary>
public static class KhoaCacheXacThuc
{
    public static string MaBaoMat(int mtk) => $"auth:mabaomat:{mtk}";
}
