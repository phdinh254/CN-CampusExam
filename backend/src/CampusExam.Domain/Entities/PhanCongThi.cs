namespace CampusExam.Domain.Entities;

/// <summary>
/// Phân công thí sinh vào kỳ thi (PHANCONGTHI). <see cref="MaDe"/> lặp lại đề gốc của kỳ thi để khóa
/// ngoại bảo đảm đề con thuộc đúng đề gốc.
/// </summary>
public class PhanCongThi
{
    public int MaPhanCong { get; set; }

    public int MaKT { get; set; }

    public string Msts { get; set; } = string.Empty;

    public int MaDeCon { get; set; }

    public string? SoMay { get; set; }

    public int MaDe { get; set; }
}

/// <summary>Bài làm (BAILAM): một bài mỗi phân công.</summary>
public class BaiLam
{
    public const byte DangLam = 0;
    public const byte DaNop = 1;
    public const byte HeThongThu = 2;

    public int MaBL { get; set; }

    public int MaPhanCong { get; set; }

    public DateTime TgBatDau { get; set; }

    /// <summary>Phút admin cộng thêm cho riêng bài này.</summary>
    public int PhutCongThem { get; set; }

    public DateTime? TgNop { get; set; }

    /// <summary>0 đang làm, 1 đã nộp, 2 hệ thống thu bài.</summary>
    public byte TrangThaiBaiLam { get; set; }

    public int? SoCauDung { get; set; }

    public decimal? Diem { get; set; }

    /// <summary>Lần hoạt động cuối (tự lưu, mở bài).</summary>
    public DateTime LanHdCuoi { get; set; }

    public string? DiaChiIP { get; set; }

    public int MaDeCon { get; set; }

    public byte[] PhienBan { get; set; } = [];
}

/// <summary>Câu trả lời (TRA_LOI). <see cref="DapAnChon"/> là nhãn hiển thị A–D của đề con.</summary>
public class TraLoi
{
    public int MaCH { get; set; }

    public int MaBL { get; set; }

    public string? DapAnChon { get; set; }

    public short DanhDau { get; set; }

    public short? LaDung { get; set; }

    public DateTime? ThoiGianChon { get; set; }

    public int MaDeCon { get; set; }
}
