namespace CampusExam.Domain.Entities;

/// <summary>
/// Kỳ thi (KYTHI). Trạng thái lưu: 0 nháp, 1 đã phát hành, 2 đang thi, 3 đã kết thúc, 4 đã hủy.
/// Hai cột NGAYCONGBO, MTKCONGBO chưa ánh xạ (dự kiến gỡ khỏi schema ở phần kết quả).
/// </summary>
public class KyThi
{
    public int MaKT { get; set; }

    /// <summary>Tài khoản tạo kỳ thi (cột MTK).</summary>
    public int MaTK { get; set; }

    /// <summary>Đề gốc dùng cho kỳ thi; bắt buộc trước khi phát hành.</summary>
    public int? MaDe { get; set; }

    public string TenKT { get; set; } = string.Empty;

    public string MonThi { get; set; } = string.Empty;

    public DateTime TgBatDau { get; set; }

    /// <summary>Thời lượng làm bài (phút).</summary>
    public int ThoiLuong { get; set; }

    public short HienDiem { get; set; }

    /// <summary>0 ngẫu nhiên, 1 lần lượt cân bằng.</summary>
    public byte CachPhanDe { get; set; }

    public byte TrangThaiKyThi { get; set; }

    public DateTime NgayTao { get; set; }

    public DateTime? NgayPhatHanh { get; set; }

    public int SoPhutChoVaoTre { get; set; }

    public short ChoXemLai { get; set; }

    public byte[] PhienBan { get; set; } = [];
}
