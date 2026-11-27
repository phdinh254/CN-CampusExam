using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.RegularExpressions;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.Interfaces.Security;
using CampusExam.Application.NhapCauHoi;
using CampusExam.Application.NhapThiSinh;
using CampusExam.Application.ThiSinh;
using CampusExam.Domain.Entities;
using CampusExam.Domain.Rules;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Imports;

/// <summary>Nhập thí sinh từ Excel: mỗi dòng tạo hồ sơ và tài khoản (tên đăng nhập = MSTS, mật khẩu = ngày sinh).</summary>
public sealed partial class EfDichVuNhapThiSinh(
    CampusExamDbContext dbContext,
    IBamMatKhau passwordHasher,
    ILuuTruTep storage,
    TimeProvider timeProvider) : IDichVuNhapThiSinh
{
    private const string ThuMucTam = "tam/nhap-thi-sinh";

    public byte[] TaoTepMau() => TepExcelThiSinh.TaoMau();

    public async Task<XemTruocNhapThiSinh> XemTruocAsync(
        Stream xlsx,
        string tenFile,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        var now = timeProvider.GetUtcNow().UtcDateTime;
        await DonTepTamCuAsync(now, cancellationToken);

        var preview = await KiemTraAsync(TepExcelThiSinh.Doc(xlsx), cancellationToken);
        if (preview.TongDong == 0 || preview.SoDongLoi > 0)
        {
            return preview;
        }

        var maXemTruoc = Guid.NewGuid().ToString("N");
        var hetHan = now + IDichVuNhapThiSinh.ThoiHanXemTruoc;

        xlsx.Position = 0;
        await storage.SaveAsync(KeyTep(maXemTruoc), xlsx, cancellationToken);
        using var meta = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(new ThongTinXemTruoc(nguoi.MaTK, tenFile, hetHan)));
        await storage.SaveAsync(KeyThongTin(maXemTruoc), meta, cancellationToken);

        return preview with { MaXemTruoc = maXemTruoc, HetHan = hetHan };
    }

    public async Task<KetQua<LanImportDto>> XacNhanAsync(
        string maXemTruoc,
        NguoiThucHien nguoi,
        CancellationToken cancellationToken)
    {
        if (!MaXemTruocHopLe().IsMatch(maXemTruoc))
        {
            return KhongCoXemTruoc();
        }

        var thongTin = await DocThongTinAsync(maXemTruoc, cancellationToken);
        if (thongTin is null || thongTin.MaTK != nguoi.MaTK)
        {
            return KhongCoXemTruoc();
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        if (now > thongTin.HetHan)
        {
            await XoaXemTruocAsync(maXemTruoc, cancellationToken);
            return new LoiNghiepVu(
                LoaiLoi.HetHan,
                MaLoi.ImportPreviewExpired,
                "Bản xem trước đã hết hạn",
                "Bản xem trước chỉ giữ 30 phút. Hãy tải tệp lên lại.");
        }

        IReadOnlyList<DongExcelThiSinh> dongExcel;
        await using (var tep = await storage.OpenReadAsync(KeyTep(maXemTruoc), cancellationToken))
        {
            if (tep is null)
            {
                return KhongCoXemTruoc();
            }

            using var buffer = new MemoryStream();
            await tep.CopyToAsync(buffer, cancellationToken);
            buffer.Position = 0;
            dongExcel = TepExcelThiSinh.Doc(buffer);
        }

        // Kiểm tra lại: từ lúc xem trước có thể đã có người thêm thí sinh trùng mã hoặc CCCD.
        var preview = await KiemTraAsync(dongExcel, cancellationToken);
        if (preview.SoDongLoi > 0)
        {
            await XoaXemTruocAsync(maXemTruoc, cancellationToken);
            return CoLoi("Dữ liệu đã thay đổi kể từ lúc xem trước (mã số thí sinh hoặc CCCD bị trùng). Hãy tải tệp lên lại để xem lỗi.");
        }

        int maLanImport;
        try
        {
            maLanImport = await GhiDatabaseAsync(preview.Dong, thongTin.TenFile, nguoi, now, cancellationToken);
        }
        catch (DbUpdateException exception) when (SqlLoi.LaTrungKhoa(exception))
        {
            return CoLoi("Một số mã số thí sinh hoặc CCCD vừa được thêm trong lúc nhập. Hãy tải tệp lên lại để xem lỗi.");
        }

        await XoaXemTruocAsync(maXemTruoc, CancellationToken.None);
        return KetQua<LanImportDto>.Ok((await GetByIdAsync(maLanImport, CancellationToken.None))!);
    }

    public async Task<TrangDuLieu<LanImportDto>> GetPageAsync(TruyVanTrang truyVan, CancellationToken cancellationToken)
    {
        var nguon = dbContext.LanImports.AsNoTracking().Where(x => x.LoaiImport == LanImport.LoaiThiSinh);
        var tong = await nguon.CountAsync(cancellationToken);
        var duLieu = await ChieuDto(nguon
                .OrderByDescending(x => x.ThoiGian)
                .ThenByDescending(x => x.MaLanImport)
                .Skip(truyVan.SoDongBoQua)
                .Take(truyVan.KichThuocTrang))
            .ToListAsync(cancellationToken);
        return new TrangDuLieu<LanImportDto>(
            [.. duLieu.OrderByDescending(x => x.ThoiGian).ThenByDescending(x => x.MaLanImport)],
            truyVan.Trang,
            truyVan.KichThuocTrang,
            tong);
    }

    private Task<LanImportDto?> GetByIdAsync(int maLanImport, CancellationToken cancellationToken) =>
        ChieuDto(dbContext.LanImports.AsNoTracking()
                .Where(x => x.LoaiImport == LanImport.LoaiThiSinh && x.MaLanImport == maLanImport))
            .SingleOrDefaultAsync(cancellationToken);

    private IQueryable<LanImportDto> ChieuDto(IQueryable<LanImport> nguon) =>
        from lan in nguon
        join taiKhoan in dbContext.TaiKhoans.AsNoTracking() on lan.MaTK equals taiKhoan.MaTK
        select new LanImportDto(
            lan.MaLanImport,
            lan.TenFile,
            lan.TongDong,
            lan.SoThanhCong,
            lan.SoDongLoi,
            lan.ThoiGian,
            (TrangThaiLanImport)lan.TrangThai,
            taiKhoan.HoTen);

    private async Task<int> GhiDatabaseAsync(
        IReadOnlyList<XemTruocDongNhapThiSinh> dong,
        string tenFile,
        NguoiThucHien nguoi,
        DateTime now,
        CancellationToken cancellationToken)
    {
        // Băm mật khẩu tốn thời gian nên chạy song song trước khi mở transaction.
        var hash = new string[dong.Count];
        Parallel.For(0, dong.Count, i => hash[i] = passwordHasher.Hash(ChinhSachMatKhau.MatKhauMacDinh(dong[i].NgaySinh!.Value)));

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var lanImport = new LanImport
            {
                MaTK = nguoi.MaTK,
                LoaiImport = LanImport.LoaiThiSinh,
                TenFile = Cat(tenFile, 255),
                TongDong = dong.Count,
                SoThanhCong = dong.Count,
                SoDongLoi = 0,
                ThoiGian = now,
                TrangThai = (byte)TrangThaiLanImport.HoanTat
            };
            dbContext.LanImports.Add(lanImport);

            var taiKhoan = dong.Select((d, i) => TaiKhoan.TaoThiSinh(d.Msts!, d.HoTen!, hash[i], now)).ToList();
            dbContext.TaiKhoans.AddRange(taiKhoan);
            await dbContext.SaveChangesAsync(cancellationToken);

            for (var i = 0; i < dong.Count; i++)
            {
                var d = dong[i];
                dbContext.ThiSinhs.Add(new ThiSinh
                {
                    Msts = d.Msts!,
                    MaTK = taiKhoan[i].MaTK,
                    MaLanImport = lanImport.MaLanImport,
                    HoTen = d.HoTen!,
                    NgaySinh = d.NgaySinh!.Value,
                    GioiTinh = (short?)d.GioiTinh,
                    Lop = d.Lop,
                    NoiSinh = d.NoiSinh,
                    Cccd = d.Cccd,
                    NgayTao = now
                });
            }

            dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
            {
                MaTK = nguoi.MaTK,
                Nhom = "THISINH",
                HanhDong = "Nhập thí sinh",
                DoiTuong = $"LANIMPORT:{lanImport.MaLanImport}",
                ChiTiet = Cat($"{dong.Count} thí sinh từ {tenFile}", 2000),
                ThoiGian = now,
                DiaChiIP = nguoi.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoi.DiaChiIP
            });
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return lanImport.MaLanImport;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            dbContext.ChangeTracker.Clear();
            throw;
        }
    }

    /// <summary>Kiểm tra từng dòng theo cùng quy tắc với thêm thủ công, trùng trong tệp và trùng database.</summary>
    private async Task<XemTruocNhapThiSinh> KiemTraAsync(IReadOnlyList<DongExcelThiSinh> dongExcel, CancellationToken cancellationToken)
    {
        var msts = dongExcel.Select(x => x.Msts).OfType<string>().Distinct().ToList();
        var cccd = dongExcel.Select(x => x.Cccd).OfType<string>().Distinct().ToList();

        var mstsDaCo = (await dbContext.ThiSinhs.AsNoTracking().Where(x => msts.Contains(x.Msts)).Select(x => x.Msts)
                .Union(dbContext.TaiKhoans.AsNoTracking().Where(x => msts.Contains(x.TenDN)).Select(x => x.TenDN))
                .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var cccdDaCo = (await dbContext.ThiSinhs.AsNoTracking()
                .Where(x => x.Cccd != null && cccd.Contains(x.Cccd))
                .Select(x => x.Cccd!)
                .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.Ordinal);

        var demMsts = dongExcel.Where(x => x.Msts is not null).GroupBy(x => x.Msts!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);
        var demCccd = dongExcel.Where(x => x.Cccd is not null).GroupBy(x => x.Cccd!)
            .ToDictionary(g => g.Key, g => g.Count());

        var ketQua = dongExcel.Select(d =>
        {
            var loi = new List<string>();

            GioiTinh? gioiTinh = null;
            switch (d.GioiTinh?.ToLowerInvariant())
            {
                case null: break;
                case "nam": gioiTinh = GioiTinh.Nam; break;
                case "nữ" or "nu": gioiTinh = GioiTinh.Nu; break;
                default: loi.Add("Giới tính chỉ nhận Nam hoặc Nữ."); break;
            }

            if (d.NgaySinh is not null && d.NgaySinhSo is null)
            {
                loi.Add("Ngày sinh không đúng dạng ngày/tháng/năm (dd/MM/yyyy).");
            }

            var lenh = new TaoThiSinhCommand
            {
                Msts = d.Msts ?? "",
                HoTen = d.HoTen ?? "",
                NgaySinh = d.NgaySinhSo,
                GioiTinh = gioiTinh,
                Lop = d.Lop,
                NoiSinh = d.NoiSinh,
                Cccd = d.Cccd
            };
            var ketQuaKiemTra = new List<ValidationResult>();
            Validator.TryValidateObject(lenh, new ValidationContext(lenh), ketQuaKiemTra, validateAllProperties: true);
            foreach (var r in ketQuaKiemTra)
            {
                // Ngày sinh sai dạng đã báo ở trên, không báo thêm "bắt buộc".
                if (!(d.NgaySinh is not null && r.MemberNames.Contains(nameof(TaoThiSinhCommand.NgaySinh))))
                {
                    loi.Add(r.ErrorMessage!);
                }
            }

            if (d.Msts is { } ma)
            {
                if (demMsts[ma] > 1) loi.Add($"Mã số thí sinh {ma} bị lặp trong tệp.");
                if (mstsDaCo.Contains(ma)) loi.Add($"Mã số thí sinh {ma} đã có trong hệ thống.");
            }

            if (d.Cccd is { } so)
            {
                if (demCccd[so] > 1) loi.Add($"CCCD {so} bị lặp trong tệp.");
                if (cccdDaCo.Contains(so)) loi.Add($"CCCD {so} đã thuộc thí sinh khác.");
            }

            return new XemTruocDongNhapThiSinh(d.SoDong, d.Msts, d.HoTen, d.NgaySinhSo, gioiTinh, d.Lop, d.NoiSinh, d.Cccd, loi);
        }).ToList();

        return XemTruocNhapThiSinh.TuDong(ketQua);
    }

    private async Task<ThongTinXemTruoc?> DocThongTinAsync(string maXemTruoc, CancellationToken cancellationToken)
    {
        await using var stream = await storage.OpenReadAsync(KeyThongTin(maXemTruoc), cancellationToken);
        return stream is null
            ? null
            : await JsonSerializer.DeserializeAsync<ThongTinXemTruoc>(stream, cancellationToken: cancellationToken);
    }

    private async Task XoaXemTruocAsync(string maXemTruoc, CancellationToken cancellationToken)
    {
        await storage.DeleteAsync(KeyTep(maXemTruoc), cancellationToken);
        await storage.DeleteAsync(KeyThongTin(maXemTruoc), cancellationToken);
    }

    private async Task DonTepTamCuAsync(DateTime now, CancellationToken cancellationToken)
    {
        foreach (var key in storage.ListOlderThan(ThuMucTam, now.AddDays(-1)))
        {
            await storage.DeleteAsync(key, cancellationToken);
        }
    }

    private static string KeyTep(string maXemTruoc) => $"{ThuMucTam}/{maXemTruoc}.xlsx";

    private static string KeyThongTin(string maXemTruoc) => $"{ThuMucTam}/{maXemTruoc}.json";

    private static string Cat(string value, int max) => value.Length <= max ? value : value[..max];

    private static LoiNghiepVu KhongCoXemTruoc() => new(
        LoaiLoi.KhongTimThay,
        MaLoi.ImportPreviewNotFound,
        "Không tìm thấy bản xem trước",
        "Bản xem trước không tồn tại, đã được xác nhận hoặc thuộc tài khoản khác.");

    private static LoiNghiepVu CoLoi(string chiTiet) => new(
        LoaiLoi.XungDot,
        MaLoi.StudentImportHasErrors,
        "Tệp nhập còn lỗi",
        chiTiet);

    private sealed record ThongTinXemTruoc(int MaTK, string TenFile, DateTime HetHan);

    [GeneratedRegex("^[0-9a-f]{32}$", RegexOptions.CultureInvariant)]
    private static partial Regex MaXemTruocHopLe();
}
