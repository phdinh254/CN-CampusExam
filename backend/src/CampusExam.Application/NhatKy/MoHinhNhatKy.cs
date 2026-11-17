using System.ComponentModel.DataAnnotations;

namespace CampusExam.Application.NhatKy;

/// <summary>Một dòng nhật ký hoạt động (NHATKYHD) cho khu vực "Hoạt động gần đây".</summary>
public sealed record NhatKyDto(
    int MaNhatKy,
    string Nhom,
    string HanhDong,
    string DoiTuong,
    string? ChiTiet,
    DateTime ThoiGian,
    string? NguoiThucHien);

/// <summary>Query của <c>GET /api/nhat-ky</c>.</summary>
public sealed class TruyVanNhatKy
{
    [Range(1, 50, ErrorMessage = "Số dòng phải từ 1 đến 50.")]
    public int SoDong { get; init; } = 8;

    /// <summary>Mặc định bỏ đăng nhập/đăng xuất (nhóm XACTHUC) để chỉ còn thao tác nghiệp vụ.</summary>
    public bool GomDangNhap { get; init; }
}

public interface ITruyXuatNhatKy
{
    Task<IReadOnlyList<NhatKyDto>> GetGanDayAsync(TruyVanNhatKy truyVan, CancellationToken cancellationToken);
}
