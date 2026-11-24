using System.Globalization;
using CampusExam.Application.BaiLam;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KetQua;
using CampusExam.Application.KyThi;
using CampusExam.Domain.Entities;
using CampusExam.Infrastructure.BaoCao;
using CampusExam.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace CampusExam.Infrastructure.Queries;

/// <summary>
/// Kết quả kỳ thi cho quản trị viên. Một kỳ thi có vài trăm thí sinh nên bảng điểm nạp một lần rồi
/// lọc, phân trang trong bộ nhớ; thống kê câu sai gom bằng hai truy vấn nhóm.
/// </summary>
public sealed class EfTruyXuatKetQua(
    CampusExamDbContext dbContext,
    TimeProvider timeProvider) : ITruyXuatKetQua
{
    private static readonly byte[] BaiDaThi = [BaiLam.DaNop, BaiLam.HeThongThu];

    public async Task<KetQua<ThongKeKetQuaDto>> ThongKeAsync(int maKT, CancellationToken cancellationToken)
    {
        var kyThi = await LayKyThiAsync(maKT, cancellationToken);
        if (kyThi.Loi is not null)
        {
            return kyThi.Loi;
        }

        var kt = kyThi.GiaTri!;
        var soPhanCong = await dbContext.PhanCongThis.CountAsync(pc => pc.MaKT == maKT, cancellationToken);
        var diem = await BaiDaThiCua(maKT)
            .Select(bl => bl.Diem ?? 0m)
            .ToListAsync(cancellationToken);

        var maDe = await dbContext.KyThis.Where(x => x.MaKT == maKT).Select(x => x.MaDe).SingleAsync(cancellationToken);
        var theoCau = await ThongKeTheoCauAsync(maKT, cancellationToken);

        return KetQua<ThongKeKetQuaDto>.Ok(new ThongKeKetQuaDto(
            kt,
            QuyTacKetQua.ChiSo(soPhanCong, diem),
            QuyTacKetQua.PhoDiem(diem),
            await CauSaiNhieuNhatAsync(maDe, theoCau, cancellationToken),
            await TyLeDungTheoKqhtAsync(maDe, theoCau, cancellationToken)));
    }

    public async Task<KetQua<TrangDuLieu<DongBangDiemDto>>> BangDiemAsync(
        int maKT,
        TruyVanBangDiem truyVan,
        CancellationToken cancellationToken)
    {
        var bangDiem = await ToanBoBangDiemAsync(maKT, cancellationToken);
        if (bangDiem.Loi is not null)
        {
            return bangDiem.Loi;
        }

        IEnumerable<DongBangDiemDto> dong = bangDiem.GiaTri!;
        if (!string.IsNullOrWhiteSpace(truyVan.TuKhoa))
        {
            var tuKhoa = truyVan.TuKhoa.Trim();
            dong = dong.Where(x =>
                x.Msts.Contains(tuKhoa, StringComparison.OrdinalIgnoreCase)
                || x.HoTen.Contains(tuKhoa, StringComparison.CurrentCultureIgnoreCase));
        }

        if (!string.IsNullOrEmpty(truyVan.TrangThai))
        {
            var trangThai = truyVan.TrangThai switch
            {
                "da_nop" => TrangThaiKetQuaThiSinh.DaNop,
                "he_thong_thu" => TrangThaiKetQuaThiSinh.HeThongThu,
                "dang_lam" => TrangThaiKetQuaThiSinh.DangLam,
                "vang_thi" => TrangThaiKetQuaThiSinh.VangThi,
                _ => TrangThaiKetQuaThiSinh.ChuaVao
            };
            dong = dong.Where(x => x.TrangThai == trangThai);
        }

        var loc = dong.ToList();
        var trang = loc.Skip(truyVan.SoDongBoQua).Take(truyVan.KichThuocTrang).ToList();
        return KetQua<TrangDuLieu<DongBangDiemDto>>.Ok(
            new TrangDuLieu<DongBangDiemDto>(trang, truyVan.Trang, truyVan.KichThuocTrang, loc.Count));
    }

    public async Task<KetQua<IReadOnlyList<DongBangDiemDto>>> ToanBoBangDiemAsync(int maKT, CancellationToken cancellationToken)
    {
        var kyThi = await LayKyThiAsync(maKT, cancellationToken);
        if (kyThi.Loi is not null)
        {
            return kyThi.Loi;
        }

        var kt = kyThi.GiaTri!;
        // Giống cổng thí sinh: chưa có bài mà đã quá giờ cho vào trễ (hoặc kỳ thi kết thúc) là vắng thi.
        var soPhutVaoTre = await dbContext.KyThis.Where(x => x.MaKT == maKT).Select(x => x.SoPhutChoVaoTre).SingleAsync(cancellationToken);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var hetGioVao = kt.TrangThai == TrangThaiKyThi.DaKetThuc || now > QuyTacBaiLam.DongCong(kt.TgBatDau, soPhutVaoTre);
        var dong = await (
                from pc in dbContext.PhanCongThis.AsNoTracking()
                join ts in dbContext.ThiSinhs.AsNoTracking() on pc.Msts equals ts.Msts
                join dc in dbContext.DeCons.AsNoTracking() on pc.MaDeCon equals dc.MaDeCon
                where pc.MaKT == maKT
                orderby pc.Msts
                select new
                {
                    pc.Msts,
                    ts.HoTen,
                    ts.Lop,
                    pc.SoMay,
                    dc.TenDeCon,
                    Bai = dbContext.BaiLams
                        .Where(bl => bl.MaPhanCong == pc.MaPhanCong)
                        .Select(bl => new { bl.TrangThaiBaiLam, bl.SoCauDung, bl.Diem, bl.TgNop })
                        .FirstOrDefault()
                })
            .ToListAsync(cancellationToken);

        IReadOnlyList<DongBangDiemDto> ketQua = dong
            .Select(x => new DongBangDiemDto(
                x.Msts,
                x.HoTen,
                x.Lop,
                x.SoMay,
                x.TenDeCon,
                x.Bai?.SoCauDung,
                kt.TongSoCau,
                x.Bai?.Diem,
                QuyTacKetQua.TrangThai(x.Bai?.TrangThaiBaiLam, hetGioVao),
                x.Bai?.TgNop))
            .ToList();
        return KetQua<IReadOnlyList<DongBangDiemDto>>.Ok(ketQua);
    }

    public async Task<KetQua<TepKetQuaDto>> XuatExcelAsync(int maKT, NguoiThucHien nguoiThucHien, CancellationToken cancellationToken)
    {
        var thongKe = await ThongKeAsync(maKT, cancellationToken);
        if (thongKe.Loi is not null)
        {
            return thongKe.Loi;
        }

        var bangDiem = await ToanBoBangDiemAsync(maKT, cancellationToken);
        if (bangDiem.Loi is not null)
        {
            return bangDiem.Loi;
        }

        var now = timeProvider.GetUtcNow().UtcDateTime;
        var noiDung = TepExcelKetQua.Tao(thongKe.GiaTri!, bangDiem.GiaTri!);
        var tenKT = thongKe.GiaTri!.KyThi.TenKT;
        dbContext.NhatKyHoatDongs.Add(new NhatKyHoatDong
        {
            MaTK = nguoiThucHien.MaTK,
            Nhom = "KYTHI",
            HanhDong = "Xuất kết quả",
            DoiTuong = $"KYTHI:{maKT}",
            ChiTiet = tenKT.Length > 500 ? tenKT[..500] : tenKT,
            ThoiGian = now,
            DiaChiIP = nguoiThucHien.DiaChiIP is { Length: > 45 } ip ? ip[..45] : nguoiThucHien.DiaChiIP
        });
        await dbContext.SaveChangesAsync(cancellationToken);

        return KetQua<TepKetQuaDto>.Ok(new TepKetQuaDto(noiDung, $"ket-qua-{maKT}-{TepExcelKetQua.GioVN(now).ToString("yyyyMMdd", CultureInfo.InvariantCulture)}.xlsx"));
    }

    private IQueryable<BaiLam> BaiDaThiCua(int maKT) =>
        from bl in dbContext.BaiLams.AsNoTracking()
        join pc in dbContext.PhanCongThis.AsNoTracking() on bl.MaPhanCong equals pc.MaPhanCong
        where pc.MaKT == maKT && BaiDaThi.Contains(bl.TrangThaiBaiLam)
        select bl;

    /// <summary>Số liệu của một câu trong các bài đã thi. Bỏ trống = số lượt − đúng − chọn sai.</summary>
    private sealed record ThongKeCau(int MaCH, int SoLuot, int SoDung, int SoChonSai)
    {
        public int SoBoTrong => SoLuot - SoDung - SoChonSai;
    }

    /// <summary>
    /// Số lượt của một câu = số bài đã thi có đề con chứa câu đó, nên câu bỏ trống (không có dòng
    /// TRA_LOI) vẫn được tính là sai.
    /// </summary>
    private async Task<IReadOnlyList<ThongKeCau>> ThongKeTheoCauAsync(int maKT, CancellationToken cancellationToken)
    {
        var bai = BaiDaThiCua(maKT);
        var soLuot = await (
                from bl in bai
                join hv in dbContext.HoanVis.AsNoTracking() on bl.MaDeCon equals hv.MaDeCon
                group hv by hv.MaCH into g
                select new { MaCH = g.Key, SoLuot = g.Count() })
            .ToListAsync(cancellationToken);
        if (soLuot.Count == 0)
        {
            return [];
        }

        var traLoi = await (
                from tl in dbContext.TraLois.AsNoTracking()
                join bl in bai on tl.MaBL equals bl.MaBL
                where tl.LaDung != null
                group tl by tl.MaCH into g
                select new
                {
                    MaCH = g.Key,
                    SoDung = g.Count(x => x.LaDung == 1),
                    SoChonSai = g.Count(x => x.LaDung == 0)
                })
            .ToDictionaryAsync(x => x.MaCH, cancellationToken);

        return soLuot
            .Select(x =>
            {
                var tl = traLoi.GetValueOrDefault(x.MaCH);
                return new ThongKeCau(x.MaCH, x.SoLuot, tl?.SoDung ?? 0, tl?.SoChonSai ?? 0);
            })
            .ToList();
    }

    private async Task<IReadOnlyList<CauSaiDto>> CauSaiNhieuNhatAsync(
        int? maDe,
        IReadOnlyList<ThongKeCau> theoCau,
        CancellationToken cancellationToken)
    {
        var thongKe = theoCau.Where(x => x.SoChonSai + x.SoBoTrong > 0).ToList();
        if (thongKe.Count == 0)
        {
            return [];
        }

        var maCH = thongKe.Select(x => x.MaCH).ToList();
        // Mã câu lấy từ ngân hàng; nội dung lấy từ bản chụp trong đề (GOM_CAU) để khớp câu thí sinh đã làm
        // dù câu trong ngân hàng bị sửa sau khi sinh đề.
        var maCauHoi = await dbContext.CauHois
            .AsNoTracking()
            .Where(ch => maCH.Contains(ch.MaCH))
            .ToDictionaryAsync(ch => ch.MaCH, ch => ch.MaCauHoi, cancellationToken);
        var noiDung = await dbContext.GomCaus
            .AsNoTracking()
            .Where(g => g.MaDe == maDe && maCH.Contains(g.MaCH))
            .ToDictionaryAsync(g => g.MaCH, g => g.NoiDung, cancellationToken);

        return thongKe
            .Select(x =>
            {
                var soSai = x.SoChonSai + x.SoBoTrong;
                return new CauSaiDto(
                    maCauHoi.GetValueOrDefault(x.MaCH) ?? $"#{x.MaCH}",
                    QuyTacKetQua.RutGon(noiDung.GetValueOrDefault(x.MaCH) ?? ""),
                    x.SoLuot,
                    soSai,
                    x.SoChonSai,
                    x.SoBoTrong,
                    Math.Round(soSai * 100m / x.SoLuot, 1, MidpointRounding.AwayFromZero));
            })
            .OrderByDescending(x => x.SoSai * 1m / x.SoLuot)
            .ThenByDescending(x => x.SoLuot)
            .ThenBy(x => x.MaCauHoi, StringComparer.Ordinal)
            .Take(QuyTacKetQua.SoCauSaiHienThi)
            .ToList();
    }

    /// <summary>
    /// Bảng KQHT × mức độ trên các câu của đề gốc. KQHT và mức độ lấy từ ngân hàng (không đổi được
    /// sau khi tạo câu vì quyết định mã câu hỏi). Ô không có câu nào có số câu 0 và tỷ lệ null.
    /// </summary>
    private async Task<BangTyLeDungDto> TyLeDungTheoKqhtAsync(
        int? maDe,
        IReadOnlyList<ThongKeCau> theoCau,
        CancellationToken cancellationToken)
    {
        var mucDo = await dbContext.MucDos
            .AsNoTracking()
            .OrderBy(md => md.MaMD)
            .Select(md => new MucDoCotDto(md.MaMD, md.TenMD))
            .ToListAsync(cancellationToken);
        var cauTrongDe = await (
                from g in dbContext.GomCaus.AsNoTracking()
                join ch in dbContext.CauHois.AsNoTracking() on g.MaCH equals ch.MaCH
                where g.MaDe == maDe
                select new { ch.MaCH, ch.MaKQHT, ch.MaMD })
            .ToListAsync(cancellationToken);
        var maKqht = cauTrongDe.Select(x => x.MaKQHT).Distinct().ToList();
        var kqht = await dbContext.KqHocTaps
            .AsNoTracking()
            .Where(k => maKqht.Contains(k.MaKQHT))
            .OrderBy(k => k.ThuTu)
            .ThenBy(k => k.MaKQHT)
            .Select(k => new { k.MaKQHT, k.KyHieu, k.TenKQHT })
            .ToListAsync(cancellationToken);

        var soLieu = theoCau.ToDictionary(x => x.MaCH);
        var cau = cauTrongDe
            .Select(x => (x.MaKQHT, x.MaMD, SoLuot: soLieu.GetValueOrDefault(x.MaCH)?.SoLuot ?? 0, SoDung: soLieu.GetValueOrDefault(x.MaCH)?.SoDung ?? 0))
            .ToList();
        OTyLeDungDto Gop(Func<(int MaKQHT, byte MaMD, int SoLuot, int SoDung), bool> loc)
        {
            var nhom = cau.Where(loc).ToList();
            return QuyTacKetQua.TyLeDung(nhom.Count, nhom.Sum(x => x.SoLuot), nhom.Sum(x => x.SoDung));
        }

        var dong = kqht
            .Select(k => new DongTyLeDungDto(
                k.MaKQHT,
                k.KyHieu,
                k.TenKQHT,
                mucDo.Select(md => Gop(x => x.MaKQHT == k.MaKQHT && x.MaMD == md.MaMD)).ToList(),
                Gop(x => x.MaKQHT == k.MaKQHT)))
            .ToList();
        return new BangTyLeDungDto(
            mucDo,
            dong,
            mucDo.Select(md => Gop(x => x.MaMD == md.MaMD)).ToList(),
            Gop(_ => true));
    }

    private async Task<KetQua<KyThiKetQuaDto>> LayKyThiAsync(int maKT, CancellationToken cancellationToken)
    {
        var kt = await dbContext.KyThis
            .AsNoTracking()
            .Where(x => x.MaKT == maKT)
            .Select(x => new
            {
                x.TenKT,
                x.MonThi,
                x.TgBatDau,
                x.ThoiLuong,
                x.TrangThaiKyThi,
                TongSoCau = dbContext.DeGocs.Where(de => de.MaDe == x.MaDe).Select(de => de.TongSoCau).FirstOrDefault()
            })
            .SingleOrDefaultAsync(cancellationToken);
        if (kt is null)
        {
            return new LoiNghiepVu(LoaiLoi.KhongTimThay, MaLoi.ExamNotFound, "Không tìm thấy kỳ thi",
                $"Không tồn tại kỳ thi có mã {maKT}.");
        }

        var trangThai = QuyTacKyThi.TrangThaiHienThi(kt.TrangThaiKyThi, kt.TgBatDau, kt.ThoiLuong, timeProvider.GetUtcNow().UtcDateTime);
        if (trangThai is not (TrangThaiKyThi.DangThi or TrangThaiKyThi.DaKetThuc))
        {
            return new LoiNghiepVu(LoaiLoi.XungDot, MaLoi.ExamNoResults, "Kỳ thi chưa có kết quả",
                "Chỉ xem được kết quả của kỳ thi đang thi hoặc đã kết thúc.");
        }

        return KetQua<KyThiKetQuaDto>.Ok(new KyThiKetQuaDto(maKT, kt.TenKT, kt.MonThi, kt.TgBatDau, kt.ThoiLuong, trangThai, kt.TongSoCau));
    }
}
