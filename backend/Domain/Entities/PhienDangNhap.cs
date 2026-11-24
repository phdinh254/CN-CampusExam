namespace CampusExam.Domain.Entities;

public class PhienDangNhap
{
    public long MaPhien { get; set; }

    public int MaTK { get; set; }

    /// <summary>SHA-256 của refresh token; không lưu token thô.</summary>
    public byte[] TokenHash { get; set; } = [];

    public DateTime NgayTao { get; set; }

    public DateTime HetHan { get; set; }

    public DateTime? ThuHoiLuc { get; set; }

    /// <summary>Phiên mới được tạo khi xoay vòng token.</summary>
    public long? MaPhienThay { get; set; }

    public string? DiaChiIP { get; set; }

    public string? TrinhDuyet { get; set; }

    public TimeSpan ThoiHan => HetHan - NgayTao;

    public bool DaHetHan(DateTime now) => HetHan <= now;

    /// <summary>Phiên "ghi nhớ đăng nhập" có thời hạn dài hơn phiên thường.</summary>
    public bool LaGhiNho(TimeSpan thoiHanPhienThuong) => ThoiHan > thoiHanPhienThuong;

    /// <summary>
    /// Token đã bị thay khi xoay vòng mà vẫn được dùng lại sau khoảng ân hạn (nhiều tab cùng làm mới):
    /// coi như token bị đánh cắp.
    /// </summary>
    public bool BiDungLaiSauXoayVong(DateTime now, TimeSpan khoangAnHan) =>
        MaPhienThay is not null && ThuHoiLuc is { } thuHoiLuc && now - thuHoiLuc > khoangAnHan;

    public void ThuHoi(DateTime now) => ThuHoiLuc ??= now;
}
