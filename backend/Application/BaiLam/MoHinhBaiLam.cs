using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CampusExam.Application.Common.Json;
using CampusExam.Application.KyThi;

namespace CampusExam.Application.BaiLam;

/// <summary>Trạng thái bài của thí sinh trong một kỳ thi, nhìn từ phía thí sinh.</summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiBaiCuaToi>))]
public enum TrangThaiBaiCuaToi : byte
{
    [JsonStringEnumMemberName("chua_vao")]
    ChuaVao = 0,

    [JsonStringEnumMemberName("dang_lam")]
    DangLam = 1,

    [JsonStringEnumMemberName("da_nop")]
    DaNop = 2,

    [JsonStringEnumMemberName("he_thong_thu")]
    HeThongThu = 3,

    [JsonStringEnumMemberName("vang_thi")]
    VangThi = 4
}

/// <summary>
/// Quy tắc thời gian: máy chủ là đồng hồ chính thức. Vào thi trong
/// [giờ bắt đầu, giờ bắt đầu + phút cho vào trễ]; giờ kết thúc chung = giờ bắt đầu + thời lượng;
/// hạn nộp riêng = giờ kết thúc chung + phút cộng thêm.
/// </summary>
public static class QuyTacBaiLam
{
    public static DateTime KetThucChung(DateTime tgBatDau, int thoiLuong) => tgBatDau.AddMinutes(thoiLuong);

    public static DateTime DongCong(DateTime tgBatDau, int soPhutChoVaoTre) => tgBatDau.AddMinutes(soPhutChoVaoTre);

    public static DateTime HanNop(DateTime tgBatDau, int thoiLuong, int phutCongThem) =>
        tgBatDau.AddMinutes(thoiLuong + phutCongThem);

    /// <summary>Điểm = số câu đúng ÷ tổng số câu × 10, làm tròn 2 chữ số.</summary>
    public static decimal Diem(int soCauDung, int tongSoCau) =>
        tongSoCau <= 0 ? 0 : Math.Round(soCauDung * 10m / tongSoCau, 2, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Xem lại bài: kỳ thi đã đóng (trạng thái lưu 3), kỳ thi cho xem lại và thí sinh có bài đã nộp hoặc
    /// hệ thống thu (1, 2). Dùng trạng thái lưu thay vì trạng thái theo giờ vì tác vụ nền chỉ đóng kỳ thi
    /// khi không còn bài đang làm: thí sinh được cộng giờ có thể còn làm bài sau giờ kết thúc chung, khi
    /// đó người đã nộp chưa được xem lại đề.
    /// </summary>
    public static bool DuocXemLai(byte trangThaiKyThiLuu, short choXemLai, byte? trangThaiBai) =>
        trangThaiKyThiLuu == (byte)TrangThaiKyThi.DaKetThuc && choXemLai == 1 && trangThaiBai is 1 or 2;
}

public sealed record KyThiCuaToiDto(
    int MaKT,
    string TenKT,
    string MonThi,
    DateTime TgBatDau,
    int ThoiLuong,
    int SoCau,
    string? SoMay,
    DateTime MoCongLuc,
    DateTime DongCongLuc,
    DateTime KetThucLuc,
    TrangThaiBaiCuaToi TrangThaiBaiLam,
    bool DuocVaoThi,
    bool HienDiem,
    int? SoCauDung,
    decimal? Diem,
    bool DuocXemLai);

/// <summary><c>GioServer</c> để frontend tính độ lệch đồng hồ một lần.</summary>
public sealed record DanhSachKyThiCuaToiDto(DateTime GioServer, IReadOnlyList<KyThiCuaToiDto> DuLieu);

public sealed record PhuongAnLamBaiDto(string Nhan, string NoiDung);

public sealed record HinhLamBaiDto(string ViTri, short ThuTu, string Url, string? AltText);

/// <summary>Câu hỏi đã hoán vị; không có đáp án đúng, mức độ, KQHT hay mã câu hỏi.</summary>
public sealed record CauLamBaiDto(
    int TtCau,
    string NoiDung,
    IReadOnlyList<PhuongAnLamBaiDto> PhuongAn,
    IReadOnlyList<HinhLamBaiDto> HinhAnh);

public sealed record TraLoiDaLuuDto(int TtCau, string? DapAnChon, bool DanhDau);

public sealed record KyThiTrongBaiDto(string TenKT, string MonThi, string TenDeCon, int SoCau, int ThoiLuong);

public sealed record BaiLamDto(
    int MaBL,
    TrangThaiBaiCuaToi TrangThai,
    DateTime GioServer,
    DateTime HanNop,
    KyThiTrongBaiDto KyThi,
    IReadOnlyList<CauLamBaiDto> CauHoi,
    IReadOnlyList<TraLoiDaLuuDto> TraLoi);

/// <summary>Một câu khi xem lại: như lúc làm bài cộng lựa chọn của thí sinh; không có đáp án đúng.</summary>
public sealed record CauXemLaiDto(
    int TtCau,
    string NoiDung,
    IReadOnlyList<PhuongAnLamBaiDto> PhuongAn,
    IReadOnlyList<HinhLamBaiDto> HinhAnh,
    string? DapAnChon,
    bool DanhDau);

/// <summary>Bài xem lại; <c>SoCauDung</c>, <c>Diem</c> chỉ có khi kỳ thi cho hiện điểm.</summary>
public sealed record BaiXemLaiDto(
    string TenKT,
    string MonThi,
    string TenDeCon,
    int SoCau,
    DateTime TgNop,
    TrangThaiBaiCuaToi TrangThai,
    int? SoCauDung,
    decimal? Diem,
    IReadOnlyList<CauXemLaiDto> CauHoi);

public sealed record KetQuaLuuDto(long LoDaLuu, DateTime LuuLuc, DateTime HanNop);

/// <summary>Kết quả nộp; <c>Diem</c>, <c>SoCauDung</c> chỉ có khi kỳ thi cho hiện điểm.</summary>
public sealed record KetQuaNopDto(
    TrangThaiBaiCuaToi TrangThai,
    DateTime TgNop,
    bool HienDiem,
    decimal? Diem,
    int? SoCauDung,
    int TongSoCau);

/// <summary>Một thay đổi trong lô tự lưu. Trường để trống là không đổi.</summary>
public sealed class ThayDoiTraLoi
{
    [Range(1, 1000, ErrorMessage = "Số thứ tự câu không hợp lệ.")]
    public int TtCau { get; init; }

    /// <summary>"A"–"D" để chọn, chuỗi rỗng để bỏ chọn, null là không đổi.</summary>
    [RegularExpression("^[ABCD]?$", ErrorMessage = "Đáp án chỉ nhận A, B, C, D hoặc rỗng.")]
    public string? DapAnChon { get; init; }

    public bool? DanhDau { get; init; }
}

/// <summary>Body tự lưu và nộp bài. <c>SoThuTuLo</c> tăng dần; lô cũ đến sau bị bỏ qua.</summary>
public sealed class LoTraLoiRequest
{
    public const int SoThayDoiToiDa = 1000;

    [Range(0, long.MaxValue, ErrorMessage = "Số thứ tự lô không hợp lệ.")]
    public long SoThuTuLo { get; init; }

    [MaxLength(SoThayDoiToiDa, ErrorMessage = "Một lô tối đa 1000 thay đổi.")]
    public List<ThayDoiTraLoi> ThayDoi { get; init; } = [];
}

/// <summary>Đường dẫn file của một hình trong bài làm.</summary>
public sealed record HinhLuuTruBaiLamDto(string StorageKey, string MimeType);
