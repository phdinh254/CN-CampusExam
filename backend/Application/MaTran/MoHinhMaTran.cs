using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CampusExam.Application.Common.Json;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.MaTran;

/// <summary>Giá trị của MATRAN.TRANGTHAIMATRAN.</summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiMaTran>))]
public enum TrangThaiMaTran : byte
{
    [JsonStringEnumMemberName("dang_soan")]
    DangSoan = 0,

    [JsonStringEnumMemberName("su_dung")]
    SuDung = 1,

    [JsonStringEnumMemberName("ngung_su_dung")]
    NgungSuDung = 2
}

public sealed record MaTranTomTatDto(
    int MaMT,
    string TenMT,
    int TongSoCau,
    int ThoiGianLam,
    TrangThaiMaTran TrangThai,
    int SoKQHT,
    bool DaSinhDe,
    DateTime NgayTao,
    DateTime? NgayCapNhat);

public sealed record OCauTrucDto(byte MaMD, int SoCau, decimal? TyLe);

public sealed record KqhtTrongMaTranDto(
    int MaKQHT,
    string KyHieu,
    string TenKQHT,
    bool DangSuDung,
    int SoCau,
    IReadOnlyList<OCauTrucDto> MucDo);

/// <summary>Chi tiết ma trận; <c>PhienBan</c> là rowversion dạng base64, gửi lại khi sửa.</summary>
public sealed record MaTranChiTietDto(
    int MaMT,
    string TenMT,
    int TongSoCau,
    int ThoiGianLam,
    TrangThaiMaTran TrangThai,
    bool DaSinhDe,
    DateTime NgayTao,
    DateTime? NgayCapNhat,
    string PhienBan,
    IReadOnlyList<KqhtTrongMaTranDto> Kqht);

/// <summary>Số câu đang sử dụng trong ngân hàng của một ô KQHT × mức độ.</summary>
public sealed record DoPhuDto(int MaKQHT, byte MaMD, int CoSan);

/// <summary>Query của <c>GET /api/ma-tran</c>.</summary>
public sealed class TruyVanMaTran : TruyVanTrang
{
    [StringLength(200, ErrorMessage = "Từ khóa không được vượt quá 200 ký tự.")]
    public string? TuKhoa { get; init; }

    // Chuỗi thay vì enum: binder query không đọc tên JsonStringEnumMemberName.
    [RegularExpression(
        "^(dang_soan|su_dung|ngung_su_dung)$",
        ErrorMessage = "Trạng thái chỉ nhận dang_soan, su_dung hoặc ngung_su_dung.")]
    public string? TrangThai { get; init; }

    public TrangThaiMaTran? TrangThaiEnum => TrangThai switch
    {
        "dang_soan" => TrangThaiMaTran.DangSoan,
        "su_dung" => TrangThaiMaTran.SuDung,
        "ngung_su_dung" => TrangThaiMaTran.NgungSuDung,
        _ => null
    };
}
