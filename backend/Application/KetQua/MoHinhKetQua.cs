using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using CampusExam.Application.Common.Json;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;

namespace CampusExam.Application.KetQua;

/// <summary>
/// Trạng thái của thí sinh trong bảng điểm. Chưa có bài: vắng thi khi đã quá giờ cho vào trễ hoặc kỳ thi
/// kết thúc (giống cổng thí sinh), còn lại là chưa vào.
/// </summary>
[JsonConverter(typeof(BoChuyenEnumChuoi<TrangThaiKetQuaThiSinh>))]
public enum TrangThaiKetQuaThiSinh : byte
{
    [JsonStringEnumMemberName("da_nop")]
    DaNop = 0,

    [JsonStringEnumMemberName("he_thong_thu")]
    HeThongThu = 1,

    [JsonStringEnumMemberName("dang_lam")]
    DangLam = 2,

    [JsonStringEnumMemberName("vang_thi")]
    VangThi = 3,

    [JsonStringEnumMemberName("chua_vao")]
    ChuaVao = 4
}

public sealed record KyThiKetQuaDto(
    int MaKT,
    string TenKT,
    string MonThi,
    DateTime TgBatDau,
    int ThoiLuong,
    TrangThaiKyThi TrangThai,
    int TongSoCau);

/// <summary>Điểm tính trên bài đã nộp hoặc hệ thống thu; null khi chưa có bài. <c>TyLeDat</c> là phần trăm.</summary>
public sealed record ChiSoKetQuaDto(
    int SoPhanCong,
    int SoDaThi,
    decimal? DiemTrungBinh,
    decimal? DiemCaoNhat,
    decimal? DiemThapNhat,
    decimal? TyLeDat);

public sealed record KhoangDiemDto(decimal Tu, decimal Den, int SoBai);

/// <summary>Số lượt = số bài đã thi có câu này; số sai gồm chọn sai và bỏ trống.</summary>
public sealed record CauSaiDto(
    string MaCauHoi,
    string NoiDung,
    int SoLuot,
    int SoSai,
    int SoChonSai,
    int SoBoTrong,
    decimal TyLeSai);

/// <summary>
/// Một ô của bảng tỷ lệ đúng: số câu của đề gốc thuộc nhóm, số lượt trả lời (mỗi câu × mỗi bài đã thi)
/// và số lượt đúng. Bỏ trống tính là sai. <c>TyLeDung</c> là phần trăm, null khi chưa có lượt nào.
/// </summary>
public sealed record OTyLeDungDto(int SoCau, int SoLuot, int SoDung, decimal? TyLeDung);

public sealed record MucDoCotDto(byte MaMD, string TenMD);

/// <summary>Một KQHT: các ô theo thứ tự cột mức độ, và ô tổng của cả KQHT.</summary>
public sealed record DongTyLeDungDto(
    int MaKQHT,
    string KyHieu,
    string TenKQHT,
    IReadOnlyList<OTyLeDungDto> TheoMucDo,
    OTyLeDungDto Tong);

/// <summary>Tỷ lệ trả lời đúng theo KQHT (dòng) × mức độ (cột), chỉ gồm các KQHT có câu trong đề.</summary>
public sealed record BangTyLeDungDto(
    IReadOnlyList<MucDoCotDto> MucDo,
    IReadOnlyList<DongTyLeDungDto> Dong,
    IReadOnlyList<OTyLeDungDto> TongTheoMucDo,
    OTyLeDungDto TongCong);

public sealed record ThongKeKetQuaDto(
    KyThiKetQuaDto KyThi,
    ChiSoKetQuaDto ChiSo,
    IReadOnlyList<KhoangDiemDto> PhoDiem,
    IReadOnlyList<CauSaiDto> CauSaiNhieuNhat,
    BangTyLeDungDto TyLeDungTheoKqht);

public sealed record DongBangDiemDto(
    string Msts,
    string HoTen,
    string? Lop,
    string? SoMay,
    string? TenDeCon,
    int? SoCauDung,
    int TongSoCau,
    decimal? Diem,
    TrangThaiKetQuaThiSinh TrangThai,
    DateTime? TgNop);

/// <summary>Nội dung tệp Excel và tên tệp gợi ý.</summary>
public sealed record TepKetQuaDto(byte[] NoiDung, string TenTep);

public sealed class TruyVanBangDiem : TruyVanTrang
{
    /// <summary>Tìm trong mã số và họ tên.</summary>
    [StringLength(100, ErrorMessage = "Từ khóa không được vượt quá 100 ký tự.")]
    public string? TuKhoa { get; init; }

    [RegularExpression(
        "^(da_nop|he_thong_thu|dang_lam|vang_thi|chua_vao)$",
        ErrorMessage = "Trạng thái chỉ nhận da_nop, he_thong_thu, dang_lam, vang_thi hoặc chua_vao.")]
    public string? TrangThai { get; init; }
}

/// <summary>Quy tắc tính số liệu kết quả, dùng chung cho màn hình và tệp Excel.</summary>
public static class QuyTacKetQua
{
    public const decimal DiemDat = 5m;
    public const int SoCauSaiHienThi = 10;
    public const int DoDaiNoiDungRutGon = 160;

    public static TrangThaiKetQuaThiSinh TrangThai(byte? trangThaiBaiLam, bool hetGioVao) => trangThaiBaiLam switch
    {
        null => hetGioVao ? TrangThaiKetQuaThiSinh.VangThi : TrangThaiKetQuaThiSinh.ChuaVao,
        0 => TrangThaiKetQuaThiSinh.DangLam,
        1 => TrangThaiKetQuaThiSinh.DaNop,
        _ => TrangThaiKetQuaThiSinh.HeThongThu
    };

    /// <summary>Chỉ số trên danh sách điểm của các bài đã thi.</summary>
    public static ChiSoKetQuaDto ChiSo(int soPhanCong, IReadOnlyCollection<decimal> diem)
    {
        if (diem.Count == 0)
        {
            return new ChiSoKetQuaDto(soPhanCong, 0, null, null, null, null);
        }

        var soDat = diem.Count(d => d >= DiemDat);
        return new ChiSoKetQuaDto(
            soPhanCong,
            diem.Count,
            Math.Round(diem.Average(), 2, MidpointRounding.AwayFromZero),
            diem.Max(),
            diem.Min(),
            Math.Round(soDat * 100m / diem.Count, 1, MidpointRounding.AwayFromZero));
    }

    /// <summary>10 khoảng [0,1) … [8,9) [9,10]; điểm 10 vào khoảng cuối.</summary>
    public static IReadOnlyList<KhoangDiemDto> PhoDiem(IEnumerable<decimal> diem)
    {
        var dem = new int[10];
        foreach (var d in diem)
        {
            dem[Math.Clamp((int)Math.Floor(d), 0, 9)]++;
        }

        return Enumerable.Range(0, 10).Select(i => new KhoangDiemDto(i, i + 1, dem[i])).ToList();
    }

    /// <summary>Gộp các ô (cùng KQHT hoặc cùng mức độ); tỷ lệ làm tròn 1 chữ số thập phân.</summary>
    public static OTyLeDungDto TyLeDung(int soCau, int soLuot, int soDung) =>
        new(soCau, soLuot, soDung, soLuot == 0 ? null : Math.Round(soDung * 100m / soLuot, 1, MidpointRounding.AwayFromZero));

    /// <summary>
    /// Đổi chỗ chèn ảnh <c>{{media:VITRI:THUTU}}</c> thành "[hình]", gom khoảng trắng, cắt còn tối đa
    /// <see cref="DoDaiNoiDungRutGon"/> ký tự. Nội dung câu hỏi là văn bản thường (có thể chứa "&lt;", "&gt;"
    /// như biểu thức), nên không bóc thẻ.
    /// </summary>
    public static string RutGon(string noiDung)
    {
        var khongMarker = System.Text.RegularExpressions.Regex.Replace(noiDung, @"\{\{media:[^{}]*\}\}", " [hình] ");
        var chu = System.Text.RegularExpressions.Regex.Replace(khongMarker, @"\s+", " ").Trim();
        return chu.Length <= DoDaiNoiDungRutGon ? chu : chu[..(DoDaiNoiDungRutGon - 1)].TrimEnd() + "…";
    }
}
