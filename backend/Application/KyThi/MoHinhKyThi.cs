using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CampusExam.Application.Common.Json;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.KyThi;

/// <summary>
/// Trạng thái hiển thị của kỳ thi. Ba trạng thái 1–3 tính theo giờ hiện tại từ giờ bắt đầu và thời
/// lượng, nên đúng cả khi tác vụ nền (phần làm bài) chưa cập nhật cột TRANGTHAIKYTHI.
/// </summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiKyThi>))]
public enum TrangThaiKyThi : byte
{
    [JsonStringEnumMemberName("nhap")]
    Nhap = 0,

    [JsonStringEnumMemberName("da_phat_hanh")]
    DaPhatHanh = 1,

    [JsonStringEnumMemberName("dang_thi")]
    DangThi = 2,

    [JsonStringEnumMemberName("da_ket_thuc")]
    DaKetThuc = 3,

    [JsonStringEnumMemberName("da_huy")]
    DaHuy = 4
}

/// <summary>Cách gán đề con cho thí sinh (KYTHI.CACHPHANDE).</summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<CachPhanDe>))]
public enum CachPhanDe : byte
{
    [JsonStringEnumMemberName("ngau_nhien")]
    NgauNhien = 0,

    [JsonStringEnumMemberName("can_bang")]
    CanBang = 1
}

/// <summary>Trạng thái của một thí sinh trong kỳ thi, suy từ bài làm.</summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiThiSinhKyThi>))]
public enum TrangThaiThiSinhKyThi : byte
{
    [JsonStringEnumMemberName("chua_thi")]
    ChuaThi = 0,

    [JsonStringEnumMemberName("dang_thi")]
    DangThi = 1,

    [JsonStringEnumMemberName("da_nop")]
    DaNop = 2,

    [JsonStringEnumMemberName("he_thong_thu")]
    HeThongThu = 3
}

public static class QuyTacKyThi
{
    /// <summary>Đổi trạng thái lưu trong database sang trạng thái hiển thị theo giờ hiện tại (UTC).</summary>
    public static TrangThaiKyThi TrangThaiHienThi(byte trangThaiLuu, DateTime tgBatDau, int thoiLuong, DateTime now)
    {
        if (trangThaiLuu == (byte)TrangThaiKyThi.Nhap)
        {
            return TrangThaiKyThi.Nhap;
        }

        if (trangThaiLuu == (byte)TrangThaiKyThi.DaHuy)
        {
            return TrangThaiKyThi.DaHuy;
        }

        if (now < tgBatDau)
        {
            return TrangThaiKyThi.DaPhatHanh;
        }

        return now < tgBatDau.AddMinutes(thoiLuong) ? TrangThaiKyThi.DangThi : TrangThaiKyThi.DaKetThuc;
    }

    public static TrangThaiThiSinhKyThi TrangThaiThiSinh(byte? trangThaiBaiLam) => trangThaiBaiLam switch
    {
        null => TrangThaiThiSinhKyThi.ChuaThi,
        0 => TrangThaiThiSinhKyThi.DangThi,
        1 => TrangThaiThiSinhKyThi.DaNop,
        _ => TrangThaiThiSinhKyThi.HeThongThu
    };
}

public sealed record KyThiTomTatDto(
    int MaKT,
    string TenKT,
    string MonThi,
    DateTime TgBatDau,
    int ThoiLuong,
    TrangThaiKyThi TrangThai,
    int SoThiSinh,
    int SoDaNop,
    bool DaGanDe,
    string? MaDeGocHienThi);

public sealed record DeGocCuaKyThiDto(
    int MaDe,
    string MaDeGocHienThi,
    string TenMT,
    int TongSoCau,
    int SoDeCon);

/// <summary>Chi tiết kỳ thi; <c>PhienBan</c> là rowversion dạng base64, gửi lại khi sửa.</summary>
public sealed record KyThiChiTietDto(
    int MaKT,
    string TenKT,
    string MonThi,
    DateTime TgBatDau,
    int ThoiLuong,
    int SoPhutChoVaoTre,
    bool HienDiem,
    CachPhanDe CachPhanDe,
    TrangThaiKyThi TrangThai,
    DateTime NgayTao,
    DateTime? NgayPhatHanh,
    string PhienBan,
    DeGocCuaKyThiDto? DeGoc,
    int SoThiSinh,
    int SoDaVaoThi);

public sealed record ThiSinhKyThiDto(
    string Msts,
    string HoTen,
    string? Lop,
    string? SoMay,
    string TenDeCon,
    TrangThaiThiSinhKyThi TrangThai);

/// <summary>Kết quả phân công: số thí sinh thêm mới và các mã bị bỏ qua kèm lý do.</summary>
public sealed record KetQuaPhanCongDto(int SoThem, IReadOnlyList<string> BoQua);

/// <summary>Các điều kiện còn thiếu để phát hành; rỗng nghĩa là phát hành được.</summary>
public sealed record KiemTraPhatHanhDto(bool PhatHanhDuoc, IReadOnlyList<string> ConThieu);

/// <summary>Query của <c>GET /api/ky-thi</c>.</summary>
public sealed class TruyVanKyThi : TruyVanTrang
{
    [StringLength(200, ErrorMessage = "Từ khóa không được vượt quá 200 ký tự.")]
    public string? TuKhoa { get; init; }

    // Chuỗi thay vì enum: binder query không đọc tên JsonStringEnumMemberName.
    [RegularExpression(
        "^(nhap|da_phat_hanh|dang_thi|da_ket_thuc|da_huy)$",
        ErrorMessage = "Trạng thái chỉ nhận nhap, da_phat_hanh, dang_thi, da_ket_thuc hoặc da_huy.")]
    public string? TrangThai { get; init; }

    public TrangThaiKyThi? TrangThaiEnum => TrangThai switch
    {
        "nhap" => TrangThaiKyThi.Nhap,
        "da_phat_hanh" => TrangThaiKyThi.DaPhatHanh,
        "dang_thi" => TrangThaiKyThi.DangThi,
        "da_ket_thuc" => TrangThaiKyThi.DaKetThuc,
        "da_huy" => TrangThaiKyThi.DaHuy,
        _ => null
    };
}

public sealed record SoLuongGiamSatDto(int DuocPhanCong, int ChuaVao, int DangLam, int DaNop, int HeThongThu);

/// <summary>Một thí sinh trên màn theo dõi thi.</summary>
public sealed record ThiSinhGiamSatDto(
    string Msts,
    string HoTen,
    string? Lop,
    string? SoMay,
    string TenDeCon,
    TrangThaiThiSinhKyThi TrangThai,
    int? MaBL,
    DateTime? TgVaoThi,
    DateTime? TgNop,
    DateTime? LanHoatDongCuoi,
    int SoCauDaLam,
    int PhutCongThem,
    DateTime? HanNop,
    int? SoCauDung,
    decimal? Diem);

/// <summary>Dữ liệu màn theo dõi thi; frontend gọi lại mỗi vài giây.</summary>
public sealed record GiamSatKyThiDto(
    int MaKT,
    string TenKT,
    string MonThi,
    TrangThaiKyThi TrangThai,
    DateTime GioServer,
    DateTime TgBatDau,
    DateTime DongCongLuc,
    DateTime KetThucLuc,
    int TongSoCau,
    SoLuongGiamSatDto SoLuong,
    IReadOnlyList<ThiSinhGiamSatDto> ThiSinh);
