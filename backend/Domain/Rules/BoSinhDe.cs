namespace CampusExam.Domain.Rules;

/// <summary>Một câu có thể chọn vào đề, kèm số đề gốc đã dùng câu này.</summary>
public sealed record UngVien(int MaCH, int SoLanDung);

/// <summary>Một ô của ma trận: cần <see cref="SoCau"/> câu từ <see cref="UngVien"/>.</summary>
public sealed record YeuCauO(int MaKQHT, byte ThuTuKqht, byte MaMD, int SoCau, IReadOnlyList<UngVien> UngVien);

/// <summary>Vị trí một câu trong đề con và thứ tự phương án gốc ở vị trí hiển thị A–D.</summary>
public sealed record CauTrongDeCon(int MaCH, int TtCau, string TtDapAn);

/// <summary>
/// Chọn câu cho đề gốc và hoán vị thành đề con. Không truy cập database; mọi ngẫu nhiên đi qua
/// <see cref="Random"/> truyền vào để tái hiện được bằng seed.
/// </summary>
public static class BoSinhDe
{
    public const int SoLanThuToiDa = 200;
    private const string ThuTuGoc = "ABCD";

    /// <summary>
    /// Mỗi ô ưu tiên câu ít được dùng nhất, cùng số lần thì ngẫu nhiên. Thứ tự đề gốc theo KQHT,
    /// rồi mức độ. Trả null khi một ô không đủ ứng viên.
    /// </summary>
    public static IReadOnlyList<int>? ChonCau(IReadOnlyList<YeuCauO> o, Random random)
    {
        var ketQua = new List<int>();
        foreach (var yeuCau in o.OrderBy(x => x.ThuTuKqht).ThenBy(x => x.MaMD))
        {
            if (yeuCau.UngVien.Count < yeuCau.SoCau)
            {
                return null;
            }

            var daXao = yeuCau.UngVien.ToArray();
            random.Shuffle(daXao);

            // OrderBy ổn định: cùng số lần dùng thì giữ thứ tự đã xáo.
            ketQua.AddRange(daXao.OrderBy(x => x.SoLanDung).Take(yeuCau.SoCau).Select(x => x.MaCH));
        }

        return ketQua;
    }

    /// <summary>
    /// Sinh <paramref name="soDeCon"/> đề con có thứ tự câu khác nhau và khác đề gốc; trả null khi
    /// không tìm đủ thứ tự khác nhau sau <see cref="SoLanThuToiDa"/> lần thử cho một đề.
    /// </summary>
    public static IReadOnlyList<IReadOnlyList<CauTrongDeCon>>? SinhDeCon(
        IReadOnlyList<(int MaCH, bool CoDinhDapAn)> deGoc,
        int soDeCon,
        Random random)
    {
        var daDung = new HashSet<string> { KhoaThuTu(deGoc.Select(x => x.MaCH)) };
        var ketQua = new List<IReadOnlyList<CauTrongDeCon>>();

        for (var k = 0; k < soDeCon; k++)
        {
            (int MaCH, bool CoDinhDapAn)[]? thuTu = null;
            for (var lan = 0; lan < SoLanThuToiDa; lan++)
            {
                var thu = deGoc.ToArray();
                random.Shuffle(thu);
                if (daDung.Add(KhoaThuTu(thu.Select(x => x.MaCH))))
                {
                    thuTu = thu;
                    break;
                }
            }

            if (thuTu is null)
            {
                return null;
            }

            ketQua.Add(thuTu
                .Select((cau, i) => new CauTrongDeCon(cau.MaCH, i + 1, cau.CoDinhDapAn ? ThuTuGoc : XaoPhuongAn(random)))
                .ToList());
        }

        return ketQua;
    }

    /// <summary>Nhãn hiển thị của đáp án đúng: vị trí của phương án gốc trong <paramref name="ttDapAn"/>.</summary>
    public static char DapAnHienThi(string ttDapAn, char dapAnGoc) => ThuTuGoc[ttDapAn.IndexOf(dapAnGoc)];

    private static string XaoPhuongAn(Random random)
    {
        var chu = ThuTuGoc.ToCharArray();
        random.Shuffle(chu);
        return new string(chu);
    }

    private static string KhoaThuTu(IEnumerable<int> maCH) => string.Join(',', maCH);
}
