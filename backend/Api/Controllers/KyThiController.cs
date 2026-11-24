using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.BaiLam;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Kỳ thi: tạo nháp, gắn đề gốc, phân công thí sinh, phát hành, hủy.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/ky-thi")]
public class KyThiController(
    ITruyXuatKyThi kyThiQuery,
    IDichVuLenhKyThi kyThiCommandService,
    IDichVuBaiLam baiLamService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TrangDuLieu<KyThiTomTatDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TrangDuLieu<KyThiTomTatDto>>> GetPage(
        [FromQuery] TruyVanKyThi truyVan,
        CancellationToken cancellationToken)
    {
        return Ok(await kyThiQuery.GetPageAsync(truyVan, cancellationToken));
    }

    [HttpGet("{maKT:int}")]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<KyThiChiTietDto>> GetById(int maKT, CancellationToken cancellationToken)
    {
        var kyThi = await kyThiQuery.GetByIdAsync(maKT, cancellationToken);
        return kyThi is null ? NotFound(KhongTimThay(maKT)) : Ok(kyThi);
    }

    [HttpPost]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<KyThiChiTietDto>> Create(LuuKyThiCommand command, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.TaoAsync(command, NguoiThucHien(), cancellationToken);
        if (!ketQua.ThanhCong)
        {
            return LoiApi.FromLoi(HttpContext, ketQua.Loi!);
        }

        return CreatedAtAction(nameof(GetById), new { maKT = ketQua.GiaTri!.MaKT }, ketQua.GiaTri);
    }

    /// <summary>Sửa kỳ thi nháp; bắt buộc gửi <c>phienBan</c>.</summary>
    [HttpPut("{maKT:int}")]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KyThiChiTietDto>> Update(
        int maKT,
        SuaKyThiCommand command,
        CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.SuaAsync(maKT, command, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Xóa kỳ thi nháp.</summary>
    [HttpDelete("{maKT:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.XoaAsync(maKT, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Gắn hoặc gỡ đề gốc; chỉ khi kỳ thi nháp và chưa phân công thí sinh.</summary>
    [HttpPut("{maKT:int}/de-goc")]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KyThiChiTietDto>> GanDeGoc(
        int maKT,
        GanDeGocRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.GanDeGocAsync(maKT, request.MaDe, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpGet("{maKT:int}/thi-sinh")]
    [ProducesResponseType<IReadOnlyList<ThiSinhKyThiDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ThiSinhKyThiDto>>> GetThiSinh(int maKT, CancellationToken cancellationToken)
    {
        var dsThiSinh = await kyThiQuery.GetThiSinhAsync(maKT, cancellationToken);
        return dsThiSinh is null ? NotFound(KhongTimThay(maKT)) : Ok(dsThiSinh);
    }

    /// <summary>Phân công thí sinh; đề con được gán theo cách phân đề của kỳ thi.</summary>
    [HttpPost("{maKT:int}/thi-sinh")]
    [ProducesResponseType<KetQuaPhanCongDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KetQuaPhanCongDto>> PhanCong(
        int maKT,
        PhanCongThiSinhRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.PhanCongAsync(maKT, request.DsMsts, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpPut("{maKT:int}/thi-sinh/{msts}/so-may")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DoiSoMay(
        int maKT,
        string msts,
        DoiSoMayRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.DoiSoMayAsync(maKT, msts, request.SoMay, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Gỡ thí sinh chưa vào làm bài khỏi kỳ thi.</summary>
    [HttpDelete("{maKT:int}/thi-sinh/{msts}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> BoPhanCong(int maKT, string msts, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.BoPhanCongAsync(maKT, msts, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpGet("{maKT:int}/kiem-tra-phat-hanh")]
    [ProducesResponseType<KiemTraPhatHanhDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<KiemTraPhatHanhDto>> KiemTraPhatHanh(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiQuery.KiemTraPhatHanhAsync(maKT, cancellationToken);
        return ketQua is null ? NotFound(KhongTimThay(maKT)) : Ok(ketQua);
    }

    [HttpPost("{maKT:int}/phat-hanh")]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KyThiChiTietDto>> PhatHanh(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.PhatHanhAsync(maKT, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpPost("{maKT:int}/huy")]
    [ProducesResponseType<KyThiChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KyThiChiTietDto>> Huy(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.HuyAsync(maKT, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Số liệu theo dõi thi; giao diện gọi lại mỗi vài giây.</summary>
    [HttpGet("{maKT:int}/giam-sat")]
    [ProducesResponseType<GiamSatKyThiDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GiamSatKyThiDto>> GiamSat(int maKT, CancellationToken cancellationToken)
    {
        var giamSat = await kyThiQuery.GiamSatAsync(maKT, cancellationToken);
        return giamSat is null ? NotFound(KhongTimThay(maKT)) : Ok(giamSat);
    }

    /// <summary>Cộng phút cho một bài đang làm; có nhật ký.</summary>
    [HttpPost("{maKT:int}/bai-lam/{maBL:int}/cong-gio")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CongGio(
        int maKT,
        int maBL,
        CongGioRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await kyThiCommandService.CongGioAsync(maKT, maBL, request, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Thu và chấm ngay bài đang làm của một thí sinh (xử lý sự cố); có nhật ký kèm lý do.</summary>
    [HttpPost("{maKT:int}/bai-lam/{maBL:int}/thu-bai")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ThuBai(
        int maKT,
        int maBL,
        ThuBaiRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await baiLamService.ThuBaiAsync(maKT, maBL, request, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    private ProblemDetails KhongTimThay(int maKT) => LoiApi.Create(
        HttpContext,
        StatusCodes.Status404NotFound,
        "Không tìm thấy kỳ thi",
        MaLoi.ExamNotFound,
        $"Không tồn tại kỳ thi có mã {maKT}.");

    private NguoiThucHien NguoiThucHien() => new(
        int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value),
        HttpContext.Connection.RemoteIpAddress?.ToString());
}
