using System.Globalization;
using System.Xml;
using CampusExam.Application.KetQua;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;

namespace CampusExam.Infrastructure.BaoCao;

/// <summary>
/// Tệp Excel kết quả một kỳ thi: sheet "Bảng điểm", "Thống kê", "Theo KQHT" và "Chi tiết" (từng câu đúng/sai
/// của mỗi thí sinh), cùng số liệu với màn hình.
/// Chuỗi ghi dạng inline string; giờ đổi sang giờ Việt Nam (thi tập trung tại trường).
/// </summary>
public static class TepExcelKetQua
{
    private const uint KieuDam = 1;
    private const uint KieuDiem = 2;
    private const uint KieuTieuDe = 3;

    private static readonly TimeZoneInfo GioVietNam = TimGioVietNam();

    public static byte[] Tao(ThongKeKetQuaDto thongKe, IReadOnlyList<DongBangDiemDto> bangDiem, BangChiTietDto chiTiet)
    {
        using var stream = new MemoryStream();
        using (var taiLieu = SpreadsheetDocument.Create(stream, SpreadsheetDocumentType.Workbook))
        {
            var workbook = taiLieu.AddWorkbookPart();
            workbook.Workbook = new Workbook();
            var styles = workbook.AddNewPart<WorkbookStylesPart>();
            styles.Stylesheet = new Stylesheet(
                new Fonts(new Font(), new Font(new Bold()), new Font(new Bold(), new FontSize { Val = 14 })),
                new Fills(new Fill(new PatternFill { PatternType = PatternValues.None }), new Fill(new PatternFill { PatternType = PatternValues.Gray125 })),
                new Borders(new Border()),
                new CellFormats(
                    new CellFormat(),
                    new CellFormat { FontId = 1, ApplyFont = true },
                    new CellFormat { NumberFormatId = 2, ApplyNumberFormat = true }, // 0.00
                    new CellFormat { FontId = 2, ApplyFont = true }));

            var sheets = workbook.Workbook.AppendChild(new Sheets());
            ThemSheet(workbook, sheets, 1, "Bảng điểm", SheetBangDiem(thongKe.KyThi, bangDiem), [17, 26, 14, 9, 9, 13, 12, 13, 9, 15, 18]);
            ThemSheet(workbook, sheets, 2, "Thống kê", SheetThongKe(thongKe), [22, 60, 11, 11, 11, 11, 13]);
            var bang = thongKe.TyLeDungTheoKqht;
            ThemSheet(workbook, sheets, 3, "Theo KQHT", SheetTheoKqht(thongKe.KyThi, bang), [36, .. bang.MucDo.Select(_ => 16d), 16]);
            ThemSheet(workbook, sheets, 4, "Chi tiết", SheetChiTiet(thongKe.KyThi, chiTiet), [17, 26, 9, 9, 8, 8, .. chiTiet.Cot.Select(_ => 12d)]);
            workbook.Workbook.Save();
        }

        return stream.ToArray();
    }

    private static List<Row> SheetBangDiem(KyThiKetQuaDto kt, IReadOnlyList<DongBangDiemDto> bangDiem)
    {
        var hang = new List<Row>
        {
            Hang(1, [Chu(kt.TenKT, KieuTieuDe)]),
            Hang(2, [Chu($"Môn: {kt.MonThi} · Ngày thi: {GioVN(kt.TgBatDau).ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture)} · {kt.ThoiLuong} phút")]),
            Hang(4, new[] { "Mã số thí sinh", "Họ tên", "Lớp", "Số máy", "Mã đề", "Số câu đúng", "Số câu sai", "Tổng số câu", "Điểm", "Trạng thái", "Giờ nộp" }
                .Select(t => Chu(t, KieuDam)).ToArray())
        };
        uint so = 5;
        foreach (var d in bangDiem)
        {
            hang.Add(Hang(so++,
            [
                Chu(d.Msts), Chu(d.HoTen), Chu(d.Lop), Chu(d.SoMay), Chu(d.TenDeCon),
                So(d.SoCauDung), So(d.SoCauSai), So(d.TongSoCau), So(d.Diem, KieuDiem), Chu(NhanTrangThai(d.TrangThai)),
                Chu(d.TgNop is { } nop ? GioVN(nop).ToString("dd/MM/yyyy HH:mm:ss", CultureInfo.InvariantCulture) : null)
            ]));
        }

        return hang;
    }

    private static List<Row> SheetThongKe(ThongKeKetQuaDto tk)
    {
        var cs = tk.ChiSo;
        var hang = new List<Row>
        {
            Hang(1, [Chu(tk.KyThi.TenKT, KieuTieuDe)]),
            Hang(3, [Chu("Chỉ số", KieuDam), Chu("Giá trị", KieuDam)]),
            Hang(4, [Chu("Được phân công"), So(cs.SoPhanCong)]),
            Hang(5, [Chu("Đã thi"), So(cs.SoDaThi)]),
            Hang(6, [Chu("Điểm trung bình"), So(cs.DiemTrungBinh, KieuDiem)]),
            Hang(7, [Chu("Điểm cao nhất"), So(cs.DiemCaoNhat, KieuDiem)]),
            Hang(8, [Chu("Điểm thấp nhất"), So(cs.DiemThapNhat, KieuDiem)]),
            Hang(9, [Chu($"Tỷ lệ đạt (điểm ≥ {QuyTacKetQua.DiemDat:0}) %"), So(cs.TyLeDat)]),
            Hang(11, [Chu("Phổ điểm", KieuDam), Chu("Số bài", KieuDam)])
        };
        uint so = 12;
        foreach (var k in tk.PhoDiem)
        {
            var den = k.Den >= 10 ? "10]" : $"{k.Den:0})";
            hang.Add(Hang(so++, [Chu($"[{k.Tu:0}–{den}"), So(k.SoBai)]));
        }

        so++;
        hang.Add(Hang(so++, new[] { "Mã câu", "Nội dung", "Số lượt", "Số sai", "Chọn sai", "Bỏ trống", "Tỷ lệ sai %" }
            .Select(t => Chu(t, KieuDam)).ToArray()));
        foreach (var c in tk.CauSaiNhieuNhat)
        {
            hang.Add(Hang(so++, [Chu(c.MaCauHoi), Chu(c.NoiDung), So(c.SoLuot), So(c.SoSai), So(c.SoChonSai), So(c.SoBoTrong), So(c.TyLeSai)]));
        }

        if (tk.CauSaiNhieuNhat.Count == 0)
        {
            hang.Add(Hang(so, [Chu("Chưa có câu trả lời sai.")]));
        }

        return hang;
    }

    /// <summary>
    /// Mỗi thí sinh đã thi một dòng, mỗi câu của đề gốc một cột (dòng tiêu đề thứ hai là mã câu hỏi):
    /// "Đ" đúng, "S" chọn sai, "–" bỏ trống.
    /// </summary>
    private static List<Row> SheetChiTiet(KyThiKetQuaDto kt, BangChiTietDto chiTiet)
    {
        var hang = new List<Row>
        {
            Hang(1, [Chu(kt.TenKT, KieuTieuDe)]),
            Hang(2, [Chu("Đ = đúng, S = sai, – = bỏ trống. Cột theo thứ tự câu của đề gốc (mỗi mã đề con xếp câu khác nhau); dòng 5 là mã câu hỏi.")]),
            Hang(4, [.. new[] { "Mã số thí sinh", "Họ tên", "Mã đề", "Điểm", "Đúng", "Sai" }.Select(t => Chu(t, KieuDam)),
                .. chiTiet.Cot.Select(c => Chu($"Câu {c.ThuTu}", KieuDam))]),
            Hang(5, [Chu(null), Chu(null), Chu(null), Chu(null), Chu(null), Chu(null), .. chiTiet.Cot.Select(c => Chu(c.MaCauHoi))])
        };
        uint so = 6;
        foreach (var d in chiTiet.Dong)
        {
            hang.Add(Hang(so++,
            [
                Chu(d.Msts), Chu(d.HoTen), Chu(d.TenDeCon), So(d.Diem, KieuDiem), So(d.SoCauDung), So(d.SoCauSai),
                .. d.KetQua.Select(k => Chu(k switch { KetQuaCau.Dung => "Đ", KetQuaCau.Sai => "S", _ => "–" }))
            ]));
        }

        if (chiTiet.Dong.Count == 0)
        {
            hang.Add(Hang(so, [Chu("Chưa có bài đã nộp.")]));
        }

        return hang;
    }

    /// <summary>Hai bảng KQHT × mức độ: tỷ lệ trả lời đúng (%) và số câu của đề gốc.</summary>
    private static List<Row> SheetTheoKqht(KyThiKetQuaDto kt, BangTyLeDungDto bang)
    {
        var tieuDeCot = bang.MucDo.Select(md => md.TenMD).Append("Tổng").ToArray();
        var hang = new List<Row>
        {
            Hang(1, [Chu(kt.TenKT, KieuTieuDe)]),
            Hang(2, [Chu("Tỷ lệ = số lượt trả lời đúng / số lượt (mỗi câu × mỗi bài đã thi); bỏ trống tính là sai.")])
        };
        uint so = 4;
        foreach (var (tenBang, giaTri) in new (string, Func<OTyLeDungDto, Cell>)[]
                 {
                     ("Tỷ lệ trả lời đúng %", o => So(o.TyLeDung)),
                     ("Số câu trong đề", o => So(o.SoCau))
                 })
        {
            hang.Add(Hang(so++, [Chu(tenBang, KieuDam), .. tieuDeCot.Select(t => Chu(t, KieuDam))]));
            foreach (var d in bang.Dong)
            {
                hang.Add(Hang(so++, [Chu($"{d.KyHieu} – {d.TenKQHT}"), .. d.TheoMucDo.Select(giaTri), giaTri(d.Tong)]));
            }

            hang.Add(Hang(so++, [Chu("Tổng", KieuDam), .. bang.TongTheoMucDo.Select(giaTri), giaTri(bang.TongCong)]));
            so++;
        }

        return hang;
    }

    private static void ThemSheet(WorkbookPart workbook, Sheets sheets, uint id, string ten, List<Row> hang, double[] doRong)
    {
        var part = workbook.AddNewPart<WorksheetPart>();
        part.Worksheet = new Worksheet(
            new Columns(doRong.Select((w, i) => new Column { Min = (uint)(i + 1), Max = (uint)(i + 1), Width = w, CustomWidth = true })),
            new SheetData(hang));
        sheets.Append(new Sheet { Id = workbook.GetIdOfPart(part), SheetId = id, Name = ten });
    }

    private static string NhanTrangThai(TrangThaiKetQuaThiSinh trangThai) => trangThai switch
    {
        TrangThaiKetQuaThiSinh.DaNop => "Đã nộp",
        TrangThaiKetQuaThiSinh.HeThongThu => "Hệ thống thu",
        TrangThaiKetQuaThiSinh.DangLam => "Đang làm",
        TrangThaiKetQuaThiSinh.VangThi => "Vắng thi",
        _ => "Chưa vào"
    };

    private static Row Hang(uint so, Cell[] o)
    {
        for (var i = 0; i < o.Length; i++)
        {
            o[i].CellReference = TenCot(i + 1) + so;
        }

        return new Row(o) { RowIndex = so };
    }

    private static Cell Chu(string? giaTri, uint kieu = 0) => new()
    {
        DataType = CellValues.InlineString,
        InlineString = new InlineString(new Text(LocKyTuXml(giaTri)) { Space = SpaceProcessingModeValues.Preserve }),
        StyleIndex = kieu
    };

    /// <summary>Bỏ ký tự XML không hợp lệ (ký tự điều khiển dán từ Word/Excel) để tệp không hỏng khi lưu.</summary>
    private static string LocKyTuXml(string? giaTri) =>
        string.IsNullOrEmpty(giaTri) ? "" : new string(giaTri.Where(XmlConvert.IsXmlChar).ToArray());

    private static Cell So(decimal? giaTri, uint kieu = 0) => giaTri is null
        ? new Cell { StyleIndex = kieu }
        : new Cell { DataType = CellValues.Number, CellValue = new CellValue(giaTri.Value), StyleIndex = kieu };

    private static Cell So(int? giaTri) => So((decimal?)giaTri);

    private static string TenCot(int so)
    {
        var ten = "";
        for (; so > 0; so = (so - 1) / 26)
        {
            ten = (char)('A' + (so - 1) % 26) + ten;
        }

        return ten;
    }

    /// <summary>Giờ Việt Nam của một thời điểm UTC (thi tập trung tại trường).</summary>
    public static DateTime GioVN(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), GioVietNam);

    private static TimeZoneInfo TimGioVietNam()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            if (TimeZoneInfo.TryFindSystemTimeZoneById(id, out var tz))
            {
                return tz;
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("UTC+7", TimeSpan.FromHours(7), "UTC+7", "UTC+7");
    }
}
