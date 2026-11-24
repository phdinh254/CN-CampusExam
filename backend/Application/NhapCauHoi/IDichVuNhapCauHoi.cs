using System.Text.Json.Serialization;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Json;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.NhapCauHoi;

/// <summary>LANIMPORT.TRANGTHAILANIMPORT.</summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiLanImport>))]
public enum TrangThaiLanImport : byte
{
    [JsonStringEnumMemberName("dang_xu_ly")]
    DangXuLy = 0,

    [JsonStringEnumMemberName("hoan_tat")]
    HoanTat = 1,

    [JsonStringEnumMemberName("that_bai")]
    ThatBai = 2,

    [JsonStringEnumMemberName("hoan_tat_co_loi")]
    HoanTatCoLoi = 3
}

/// <summary>Một lần nhập (LANIMPORT).</summary>
public sealed record LanImportDto(
    int MaLanImport,
    string TenFile,
    int TongDong,
    int SoThanhCong,
    int SoDongLoi,
    DateTime ThoiGian,
    TrangThaiLanImport TrangThai,
    string NguoiThucHien);

/// <summary>
/// Nhập câu hỏi từ DOCX hai bước: xem trước đối chiếu database và giữ tệp
/// tạm; xác nhận ghi tất cả hoặc không ghi gì.
/// </summary>
public interface IDichVuNhapCauHoi
{
    /// <summary>Thời gian giữ tệp tạm chờ xác nhận.</summary>
    static readonly TimeSpan ThoiHanXemTruoc = TimeSpan.FromMinutes(30);

    /// <exception cref="LoiDinhDangNhapCauHoi">Tệp không đọc được.</exception>
    Task<XemTruocNhapCauHoi> XemTruocAsync(
        Stream docx,
        string tenFile,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken);

    Task<KetQua<LanImportDto>> XacNhanAsync(
        string maXemTruoc,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken);

    Task<TrangDuLieu<LanImportDto>> GetPageAsync(TruyVanTrang truyVan, CancellationToken cancellationToken);

    Task<LanImportDto?> GetByIdAsync(int maLanImport, CancellationToken cancellationToken);
}
