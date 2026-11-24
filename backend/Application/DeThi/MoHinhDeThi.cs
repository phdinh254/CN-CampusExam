using System.ComponentModel.DataAnnotations;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.DeThi;

/// <summary>Body của <c>POST /api/de-goc</c>: sinh một đề gốc và các đề con trong một lần.</summary>
public sealed class SinhDeCommand
{
    public const int SoDeConToiDa = 50;

    [Range(1, int.MaxValue, ErrorMessage = "Ma trận là bắt buộc.")]
    public int MaMT { get; init; }

    /// <summary>Để trống thì hệ thống đặt dạng DG-0007.</summary>
    [StringLength(30, ErrorMessage = "Mã đề không được vượt quá 30 ký tự.")]
    [RegularExpression("^[A-Za-z0-9._-]*$", ErrorMessage = "Mã đề chỉ gồm chữ không dấu, số và các ký tự . _ -")]
    public string? MaDeGocHienThi { get; init; }

    [Range(1, SoDeConToiDa, ErrorMessage = "Số đề con phải từ 1 đến 50.")]
    public int SoDeCon { get; init; } = 4;
}

/// <param name="SoCauTrung">Số câu của đề mới đã từng nằm trong các đề gốc trước.</param>
public sealed record KetQuaSinhDeDto(int MaDe, string MaDeGocHienThi, int TongSoCau, int SoCauTrung, int SoDeCon);

public sealed record DeGocTomTatDto(
    int MaDe,
    string MaDeGocHienThi,
    int MaMT,
    string TenMT,
    int TongSoCau,
    int SoDeCon,
    bool DaGanKyThi,
    DateTime NgayTao);

/// <summary>Query của <c>GET /api/de-goc</c>.</summary>
public sealed class TruyVanDeThi : TruyVanTrang
{
    [StringLength(30, ErrorMessage = "Từ khóa không được vượt quá 30 ký tự.")]
    public string? TuKhoa { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Mã ma trận không hợp lệ.")]
    public int? MaMT { get; init; }

    public bool? ChuaGanKyThi { get; init; }
}

/// <param name="ViTri">Vị trí gốc: NOIDUNG, DAA, DAB, DAC, DAD.</param>
public sealed record HinhTrongDeDto(string ViTri, short ThuTu, string Url, string? AltText);

/// <summary>Câu trong đề gốc cho quản trị viên; có đáp án đúng.</summary>
public sealed record CauTrongDeGocDto(
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
    bool CoDinhDapAn,
    IReadOnlyList<HinhTrongDeDto> HinhAnh);

public sealed record DeConTomTatDto(int MaDeCon, string TenDeCon);

public sealed record DeGocChiTietDto(
    int MaDe,
    string MaDeGocHienThi,
    int MaMT,
    string TenMT,
    int TongSoCau,
    bool DaGanKyThi,
    DateTime NgayTao,
    IReadOnlyList<DeConTomTatDto> DeCon,
    IReadOnlyList<CauTrongDeGocDto> CauHoi);

/// <param name="Nhan">Nhãn hiển thị A–D.</param>
/// <param name="NhanGoc">Phương án gốc đang hiển thị ở nhãn này; hình của phương án theo nhãn gốc.</param>
public sealed record PhuongAnHienThiDto(string Nhan, string NhanGoc, string NoiDung);

public sealed record CauTrongDeConDto(
    int TtCau,
    int ThuTuGoc,
    string MaCauHoi,
    string NoiDung,
    IReadOnlyList<PhuongAnHienThiDto> PhuongAn,
    string DapAnDungHienThi,
    IReadOnlyList<HinhTrongDeDto> HinhAnh);

public sealed record DeConChiTietDto(
    int MaDeCon,
    string TenDeCon,
    int MaDe,
    string MaDeGocHienThi,
    IReadOnlyList<CauTrongDeConDto> CauHoi);

/// <summary>Vị trí file của một hình trong đề.</summary>
public sealed record HinhLuuTruDeDto(string StorageKey, string MimeType);
