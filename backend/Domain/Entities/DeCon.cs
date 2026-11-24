namespace CampusExam.Domain.Entities;

/// <summary>Đề con (DECON): một hoán vị của đề gốc, mã đề hiển thị 101, 102…</summary>
public class DeCon
{
    public int MaDeCon { get; set; }

    public int MaDe { get; set; }

    public string TenDeCon { get; set; } = string.Empty;

    public DateTime NgayTao { get; set; }
}

/// <summary>
/// Vị trí một câu trong đề con (HOAN_VI). <see cref="TtDapAn"/> là phương án gốc ở vị trí hiển thị
/// A, B, C, D: "CABD" nghĩa là A hiển thị là C gốc.
/// </summary>
public class HoanVi
{
    public int MaCH { get; set; }

    public int MaDeCon { get; set; }

    public int TtCau { get; set; }

    public string TtDapAn { get; set; } = "ABCD";

    public string DapAnDungHienThi { get; set; } = string.Empty;

    public int MaDe { get; set; }
}
