namespace CampusExam.Domain.Entities;

/// <summary>
/// Câu hỏi nằm trong đề gốc (GOM_CAU): bản sao nội dung tại lúc sinh đề. Thi và chấm dùng bản sao
/// này, không phụ thuộc ngân hàng câu hỏi.
/// </summary>
public class GomCau
{
    public int MaDe { get; set; }

    public int MaCH { get; set; }

    public int ThuTuTrongDeGoc { get; set; }

    public string NoiDung { get; set; } = string.Empty;

    public string PhuongAnA { get; set; } = string.Empty;

    public string PhuongAnB { get; set; } = string.Empty;

    public string PhuongAnC { get; set; } = string.Empty;

    public string PhuongAnD { get; set; } = string.Empty;

    public string DapAnDungGoc { get; set; } = string.Empty;
}
