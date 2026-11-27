using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.NhapCauHoi;
using CampusExam.Application.ThiSinh;

namespace CampusExam.Application.NhapThiSinh;

/// <summary>Một dòng trong tệp Excel sau khi đọc và kiểm tra.</summary>
public sealed record XemTruocDongNhapThiSinh(
    int SoDong,
    string? Msts,
    string? HoTen,
    DateOnly? NgaySinh,
    GioiTinh? GioiTinh,
    string? Lop,
    string? NoiSinh,
    string? Cccd,
    IReadOnlyList<string> Loi)
{
    public bool HopLe => Loi.Count == 0;
}

public sealed record XemTruocNhapThiSinh(
    int TongDong,
    int SoDongHopLe,
    int SoDongLoi,
    IReadOnlyList<XemTruocDongNhapThiSinh> Dong)
{
    /// <summary>Mã bản xem trước để xác nhận; null khi còn dòng lỗi hoặc tệp không có dòng nào.</summary>
    public string? MaXemTruoc { get; init; }

    public DateTime? HetHan { get; init; }

    public static XemTruocNhapThiSinh TuDong(IReadOnlyList<XemTruocDongNhapThiSinh> dong) => new(
        dong.Count,
        dong.Count(x => x.HopLe),
        dong.Count(x => !x.HopLe),
        dong);
}

/// <summary>
/// Nhập thí sinh từ tệp Excel hai bước: xem trước có đối chiếu database, xác nhận thì ghi tất cả
/// hoặc không ghi gì. Mỗi thí sinh được tạo kèm tài khoản như khi thêm thủ công.
/// </summary>
public interface IDichVuNhapThiSinh
{
    static readonly TimeSpan ThoiHanXemTruoc = TimeSpan.FromMinutes(30);

    /// <summary>Tệp mẫu .xlsx có sẵn tiêu đề cột và một dòng ví dụ.</summary>
    byte[] TaoTepMau();

    /// <exception cref="LoiDinhDangNhapThiSinh">Tệp không đọc được hoặc thiếu cột bắt buộc.</exception>
    Task<XemTruocNhapThiSinh> XemTruocAsync(Stream xlsx, string tenFile, NguoiThucHien nguoi, CancellationToken cancellationToken);

    Task<KetQua<LanImportDto>> XacNhanAsync(string maXemTruoc, NguoiThucHien nguoi, CancellationToken cancellationToken);

    Task<TrangDuLieu<LanImportDto>> GetPageAsync(TruyVanTrang truyVan, CancellationToken cancellationToken);
}

public sealed class LoiDinhDangNhapThiSinh(string message, Exception? innerException = null)
    : Exception(message, innerException);
