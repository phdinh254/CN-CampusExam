namespace CampusExam.Domain.Entities;

/// <summary>Một ô của ma trận đề (CAU_TRUC): số câu của một KQHT ở một mức độ.</summary>
public class CauTruc
{
    public int MaMT { get; set; }

    public int MaKQHT { get; set; }

    public byte MaMD { get; set; }

    public int SoCau { get; set; }

    /// <summary>Tỷ lệ % của mức độ trong KQHT; ba mức của một KQHT cộng lại 100.</summary>
    public decimal? TyLe { get; set; }
}
