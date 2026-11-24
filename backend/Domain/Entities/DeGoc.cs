namespace CampusExam.Domain.Entities;

/// <summary>Đề gốc (DEGOC) sinh từ một ma trận; bản sao câu hỏi nằm ở <see cref="GomCau"/>.</summary>
public class DeGoc
{
    public int MaDe { get; set; }

    /// <summary>Tài khoản tạo đề (cột MTK).</summary>
    public int MaTK { get; set; }

    public int MaMT { get; set; }

    public string MaDeGocHienThi { get; set; } = string.Empty;

    public int TongSoCau { get; set; }

    public DateTime NgayTao { get; set; }

    /// <summary>Seed ngẫu nhiên lúc sinh đề, để tái hiện việc chọn câu.</summary>
    public int? HatGiong { get; set; }
}
