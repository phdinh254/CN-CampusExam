using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.MaTran;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Ma trận đề: số câu theo KQHT × mức độ.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/ma-tran")]
public class MaTranController(
    ITruyXuatMaTran maTranQuery,
    IDichVuLenhMaTran maTranCommandService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TrangDuLieu<MaTranTomTatDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TrangDuLieu<MaTranTomTatDto>>> GetPage(
        [FromQuery] TruyVanMaTran truyVan,
        CancellationToken cancellationToken)
    {
        return Ok(await maTranQuery.GetPageAsync(truyVan, cancellationToken));
    }

    /// <summary>Số câu đang sử dụng trong ngân hàng theo từng ô KQHT × mức độ.</summary>
    [HttpGet("do-phu")]
    [ProducesResponseType<IReadOnlyList<DoPhuDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DoPhuDto>>> GetDoPhu(CancellationToken cancellationToken)
    {
        return Ok(await maTranQuery.GetDoPhuAsync(cancellationToken));
    }

    [HttpGet("{maMT:int}")]
    [ProducesResponseType<MaTranChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MaTranChiTietDto>> GetById(int maMT, CancellationToken cancellationToken)
    {
        var maTran = await maTranQuery.GetByIdAsync(maMT, cancellationToken);
        if (maTran is null)
        {
            return NotFound(LoiApi.Create(
                HttpContext,
                StatusCodes.Status404NotFound,
                "Không tìm thấy ma trận đề",
                MaLoi.MatrixNotFound,
                $"Không tồn tại ma trận đề có mã {maMT}."));
        }

        return Ok(maTran);
    }

    [HttpPost]
    [ProducesResponseType<MaTranChiTietDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MaTranChiTietDto>> Create(
        LuuMaTranCommand command,
        CancellationToken cancellationToken)
    {
        var ketQua = await maTranCommandService.TaoAsync(command, NguoiThucHien(), cancellationToken);
        if (!ketQua.ThanhCong)
        {
            return LoiApi.FromLoi(HttpContext, ketQua.Loi!);
        }

        return CreatedAtAction(nameof(GetById), new { maMT = ketQua.GiaTri!.MaMT }, ketQua.GiaTri);
    }

    /// <summary>Sửa ma trận đang soạn, chưa sinh đề; bắt buộc gửi <c>phienBan</c>.</summary>
    [HttpPut("{maMT:int}")]
    [ProducesResponseType<MaTranChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MaTranChiTietDto>> Update(
        int maMT,
        SuaMaTranCommand command,
        CancellationToken cancellationToken)
    {
        var ketQua = await maTranCommandService.SuaAsync(maMT, command, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Kích hoạt, chuyển về đang soạn hoặc ngừng sử dụng.</summary>
    [HttpPatch("{maMT:int}/trang-thai")]
    [ProducesResponseType<MaTranChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MaTranChiTietDto>> DoiTrangThai(
        int maMT,
        DoiTrangThaiMaTranRequest request,
        CancellationToken cancellationToken)
    {
        var ketQua = await maTranCommandService.DoiTrangThaiAsync(
            maMT, request.TrangThai!.Value, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Xóa ma trận chưa sinh đề; ngược lại 409 MATRIX_IN_USE.</summary>
    [HttpDelete("{maMT:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int maMT, CancellationToken cancellationToken)
    {
        var ketQua = await maTranCommandService.XoaAsync(maMT, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    private NguoiThucHien NguoiThucHien() => new(
        int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value),
        HttpContext.Connection.RemoteIpAddress?.ToString());
}
