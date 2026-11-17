namespace CampusExam.Domain.Entities;

/// <summary>
/// Bản sao metadata hình của câu hỏi trong đề (TAINGUYEN_GOMCAU). Dùng chung file với câu hỏi qua
/// <see cref="StorageKey"/> vì file trong storage bất biến.
/// </summary>
public class TaiNguyenGomCau
{
    public int MaDe { get; set; }

    public int MaCH { get; set; }

    public string ViTri { get; set; } = string.Empty;

    public short ThuTu { get; set; }

    public string TenFile { get; set; } = string.Empty;

    public string StorageKey { get; set; } = string.Empty;

    public string MimeType { get; set; } = string.Empty;

    public string? AltText { get; set; }
}
