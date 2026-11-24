using System.Globalization;
using System.Text;
using CampusExam.Application.NhapThiSinh;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;

namespace CampusExam.Infrastructure.Imports;

/// <summary>Một dòng thô đọc từ tệp Excel (chưa kiểm tra nghiệp vụ).</summary>
public sealed record DongExcelThiSinh(
    int SoDong,
    string? Msts,
    string? HoTen,
    string? NgaySinh,
    DateOnly? NgaySinhSo,
    string? GioiTinh,
    string? Lop,
    string? NoiSinh,
    string? Cccd);

/// <summary>Đọc tệp Excel danh sách thí sinh và tạo tệp mẫu.</summary>
public static class TepExcelThiSinh
{
    public const int SoDongToiDa = 5000;

    private enum Cot { Msts, HoTen, NgaySinh, GioiTinh, Lop, NoiSinh, Cccd }

    private static readonly (Cot Cot, string TieuDe, string[] TenKhac)[] CacCot =
    [
        (Cot.Msts, "Mã số thí sinh", ["msts", "ma so thi sinh", "ma so", "ma thi sinh"]),
        (Cot.HoTen, "Họ và tên", ["ho va ten", "ho ten"]),
        (Cot.NgaySinh, "Ngày sinh", ["ngay sinh"]),
        (Cot.GioiTinh, "Giới tính", ["gioi tinh"]),
        (Cot.Lop, "Lớp", ["lop"]),
        (Cot.NoiSinh, "Nơi sinh", ["noi sinh"]),
        (Cot.Cccd, "CCCD", ["cccd", "so cccd", "can cuoc cong dan"]),
    ];

    private static readonly string[] DinhDangNgay = ["dd/MM/yyyy", "d/M/yyyy", "dd-MM-yyyy", "d-M-yyyy", "yyyy-MM-dd"];

    /// <exception cref="LoiDinhDangNhapThiSinh">Không mở được tệp, không có trang tính hoặc thiếu cột bắt buộc.</exception>
    public static IReadOnlyList<DongExcelThiSinh> Doc(Stream xlsx)
    {
        SpreadsheetDocument taiLieu;
        try
        {
            taiLieu = SpreadsheetDocument.Open(xlsx, false);
        }
        catch (Exception exception) when (exception is OpenXmlPackageException or InvalidDataException or FileFormatException)
        {
            throw new LoiDinhDangNhapThiSinh("Tệp không phải tệp Excel .xlsx hợp lệ.", exception);
        }

        using (taiLieu)
        {
            var workbook = taiLieu.WorkbookPart ?? throw new LoiDinhDangNhapThiSinh("Tệp Excel không có trang tính.");
            var sheet = workbook.Workbook?.Sheets?.Elements<Sheet>().FirstOrDefault()
                        ?? throw new LoiDinhDangNhapThiSinh("Tệp Excel không có trang tính.");
            var worksheet = (WorksheetPart)workbook.GetPartById(sheet.Id!);
            var chuoiChung = workbook.SharedStringTablePart?.SharedStringTable;

            var hang = worksheet.Worksheet?.Descendants<Row>().ToList() ?? [];
            if (hang.Count == 0)
            {
                throw new LoiDinhDangNhapThiSinh("Trang tính đầu tiên đang trống.");
            }

            // Dòng tiêu đề là dòng đầu tiên có dữ liệu; nhận cột theo tên nên thứ tự cột không quan trọng.
            var tieuDe = DocHang(hang[0], chuoiChung);
            var viTri = new Dictionary<Cot, string>();
            foreach (var (cotExcel, giaTri) in tieuDe)
            {
                var ten = BoDau(giaTri.Text);
                var cot = CacCot.FirstOrDefault(x => x.TenKhac.Contains(ten));
                if (cot.TieuDe is not null)
                {
                    viTri.TryAdd(cot.Cot, cotExcel);
                }
            }

            var thieu = CacCot.Where(x => (x.Cot is Cot.Msts or Cot.HoTen or Cot.NgaySinh) && !viTri.ContainsKey(x.Cot))
                .Select(x => x.TieuDe).ToList();
            if (thieu.Count > 0)
            {
                throw new LoiDinhDangNhapThiSinh(
                    $"Dòng tiêu đề thiếu cột: {string.Join(", ", thieu)}. Hãy dùng tệp mẫu.");
            }

            var ketQua = new List<DongExcelThiSinh>();
            foreach (var row in hang.Skip(1))
            {
                var o = DocHang(row, chuoiChung);
                if (o.Values.All(x => string.IsNullOrWhiteSpace(x.Text)))
                {
                    continue;
                }

                if (ketQua.Count == SoDongToiDa)
                {
                    throw new LoiDinhDangNhapThiSinh($"Tệp có quá {SoDongToiDa} dòng thí sinh. Hãy chia thành nhiều tệp.");
                }

                GiaTriO? Lay(Cot cot) => viTri.TryGetValue(cot, out var c) && o.TryGetValue(c, out var v) ? v : null;
                string? Chu(Cot cot) => Lay(cot)?.Text is { } s && !string.IsNullOrWhiteSpace(s) ? s.Trim() : null;

                var ngay = Lay(Cot.NgaySinh);
                ketQua.Add(new DongExcelThiSinh(
                    (int)(row.RowIndex?.Value ?? (uint)(ketQua.Count + 2)),
                    Chu(Cot.Msts),
                    Chu(Cot.HoTen),
                    Chu(Cot.NgaySinh),
                    ngay is null ? null : DocNgay(ngay),
                    Chu(Cot.GioiTinh),
                    Chu(Cot.Lop),
                    Chu(Cot.NoiSinh),
                    DocCccd(Lay(Cot.Cccd))));
            }

            return ketQua;
        }
    }

    public static byte[] TaoMau()
    {
        using var stream = new MemoryStream();
        using (var taiLieu = SpreadsheetDocument.Create(stream, SpreadsheetDocumentType.Workbook))
        {
            var workbook = taiLieu.AddWorkbookPart();
            workbook.Workbook = new Workbook();

            // Kiểu 1: chữ đậm (tiêu đề); kiểu 2: định dạng văn bản để Excel không bỏ số 0 đầu của MSTS, CCCD, ngày sinh.
            var styles = workbook.AddNewPart<WorkbookStylesPart>();
            styles.Stylesheet = new Stylesheet(
                new Fonts(new Font(), new Font(new Bold())),
                new Fills(new Fill(new PatternFill { PatternType = PatternValues.None }), new Fill(new PatternFill { PatternType = PatternValues.Gray125 })),
                new Borders(new Border()),
                new CellFormats(
                    new CellFormat(),
                    new CellFormat { FontId = 1, ApplyFont = true },
                    new CellFormat { NumberFormatId = 49, ApplyNumberFormat = true }));

            var worksheet = workbook.AddNewPart<WorksheetPart>();
            var data = new SheetData(
                new Row(CacCot.Select((c, i) => O(TenCot(i + 1) + "1", c.TieuDe, 1))) { RowIndex = 1 },
                new Row(new[] { "2311001", "Nguyễn Văn An", "14/03/2005", "Nam", "K29CNPM1", "Đà Nẵng", "048205001234" }.Select((v, i) => O(TenCot(i + 1) + "2", v, 2))) { RowIndex = 2 });
            double[] doRong = [18, 26, 14, 11, 14, 20, 16];
            worksheet.Worksheet = new Worksheet(
                new Columns(doRong.Select((w, i) => new Column
                {
                    Min = (uint)(i + 1), Max = (uint)(i + 1), Width = w, CustomWidth = true,
                    Style = i is 0 or 2 or 6 ? 2u : null
                })),
                data);

            workbook.Workbook.AppendChild(new Sheets(new Sheet
            {
                Id = workbook.GetIdOfPart(worksheet),
                SheetId = 1,
                Name = "ThiSinh"
            }));
            workbook.Workbook.Save();
        }

        return stream.ToArray();
    }

    private static Cell O(string diaChi, string giaTri, uint kieu) => new()
    {
        CellReference = diaChi,
        DataType = CellValues.InlineString,
        InlineString = new InlineString(new Text(giaTri)),
        StyleIndex = kieu
    };

    private sealed record GiaTriO(string Text, bool LaSo);

    private static Dictionary<string, GiaTriO> DocHang(Row row, SharedStringTable? chuoiChung)
    {
        var o = new Dictionary<string, GiaTriO>();
        var soCot = 0;
        foreach (var cell in row.Elements<Cell>())
        {
            // Ô không ghi địa chỉ thì nằm ngay sau ô trước đó.
            var cot = new string((cell.CellReference?.Value ?? "").TakeWhile(char.IsLetter).ToArray());
            soCot = cot.Length > 0 ? SoCot(cot) : soCot + 1;
            cot = TenCot(soCot);

            var kieu = cell.DataType?.Value;
            string text;
            if (kieu == CellValues.SharedString)
            {
                text = int.TryParse(cell.CellValue?.Text, out var i) && chuoiChung?.ElementAtOrDefault(i) is SharedStringItem item
                    ? item.InnerText
                    : "";
            }
            else if (kieu == CellValues.InlineString)
            {
                text = cell.InlineString?.InnerText ?? "";
            }
            else
            {
                text = cell.CellValue?.Text ?? "";
            }

            var laSo = kieu is null || kieu == CellValues.Number;
            o[cot] = new GiaTriO(text, laSo && text.Length > 0);
        }

        return o;
    }

    private static int SoCot(string ten) => ten.Aggregate(0, (n, c) => n * 26 + char.ToUpperInvariant(c) - 'A' + 1);

    private static string TenCot(int so)
    {
        var ten = "";
        for (; so > 0; so = (so - 1) / 26)
        {
            ten = (char)('A' + (so - 1) % 26) + ten;
        }

        return ten;
    }

    /// <summary>Ô ngày dạng số (ngày của Excel) hoặc chữ dd/MM/yyyy.</summary>
    private static DateOnly? DocNgay(GiaTriO o)
    {
        if (o.LaSo && double.TryParse(o.Text, NumberStyles.Float, CultureInfo.InvariantCulture, out var so) && so is > 0 and < 2958466)
        {
            return DateOnly.FromDateTime(DateTime.FromOADate(so));
        }

        return DateOnly.TryParseExact(o.Text.Trim(), DinhDangNgay, CultureInfo.InvariantCulture, DateTimeStyles.None, out var ngay)
            ? ngay
            : null;
    }

    /// <summary>CCCD nhập dạng số thì Excel bỏ số 0 đầu; bù lại cho đủ 12 chữ số.</summary>
    private static string? DocCccd(GiaTriO? o)
    {
        var text = o?.Text.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return null;
        }

        return o!.LaSo && text.Length < 12 && text.All(char.IsAsciiDigit) ? text.PadLeft(12, '0') : text;
    }

    private static string BoDau(string text)
    {
        var chuan = text.Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in chuan)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
