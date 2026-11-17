namespace CampusExam.Domain.Entities;

/// <summary>Ma trận đề (MATRAN): số câu theo KQHT × mức độ và thời gian làm bài.</summary>
public class MaTran
{
    public int MaMT { get; set; }

    public string TenMT { get; set; } = string.Empty;

    /// <summary>Bằng tổng <see cref="CauTruc.SoCau"/> của ma trận.</summary>
    public int TongSoCau { get; set; }

    /// <summary>Phút.</summary>
    public int ThoiGianLam { get; set; }

    /// <summary>0 đang soạn, 1 sử dụng, 2 ngừng sử dụng.</summary>
    public byte TrangThaiMaTran { get; set; }

    public DateTime NgayTao { get; set; }

    public DateTime? NgayCapNhat { get; set; }

    public byte[] PhienBan { get; set; } = [];
}
