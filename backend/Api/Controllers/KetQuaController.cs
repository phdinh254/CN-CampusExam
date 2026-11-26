using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KetQua;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Kết quả một kỳ thi đang thi hoặc đã kết thúc: thống kê, bảng điểm, xuất Excel.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/ky-thi/{maKT:int}/ket-qua")]
public class KetQuaController(ITruyXuatKetQua ketQuaQuery) : ControllerBase
{
    private const string LoaiTepExcel = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    [HttpGet("thong-ke")]
    [ProducesResponseType<ThongKeKetQuaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ThongKeKetQuaDto>> ThongKe(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await ketQuaQuery.ThongKeAsync(maKT, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpGet("bang-diem")]
    [ProducesResponseType<TrangDuLieu<DongBangDiemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TrangDuLieu<DongBangDiemDto>>> BangDiem(
        int maKT,
        [FromQuery] TruyVanBangDiem truyVan,
        CancellationToken cancellationToken)
    {
        var ketQua = await ketQuaQuery.BangDiemAsync(maKT, truyVan, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Bài làm chi tiết của một thí sinh: điểm, số câu đúng/sai/bỏ trống và từng câu đúng hay sai.</summary>
    [HttpGet("thi-sinh/{msts}")]
    [ProducesResponseType<BaiLamChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BaiLamChiTietDto>> BaiLamChiTiet(int maKT, string msts, CancellationToken cancellationToken)
    {
        var ketQua = await ketQuaQuery.BaiLamChiTietAsync(maKT, msts, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Tệp Excel cùng số liệu với màn hình; ghi nhật ký "Xuất kết quả".</summary>
    [HttpGet("xuat-excel")]
    [ProducesResponseType<FileContentResult>(StatusCodes.Status200OK, LoaiTepExcel)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> XuatExcel(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await ketQuaQuery.XuatExcelAsync(
            maKT,
            new NguoiThucHien(int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value), HttpContext.Connection.RemoteIpAddress?.ToString()),
            cancellationToken);
        return ketQua.ThanhCong
            ? File(ketQua.GiaTri!.NoiDung, LoaiTepExcel, ketQua.GiaTri.TenTep)
            : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }
}
