using CampusExam.Api.Authorization;
using CampusExam.Application.NhatKy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Nhật ký hoạt động gần đây cho trang tổng quan (chỉ đọc).</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/nhat-ky")]
public class NhatKyController(ITruyXuatNhatKy nhatKyQuery) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<NhatKyDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<NhatKyDto>>> GetGanDay(
        [FromQuery] TruyVanNhatKy truyVan,
        CancellationToken cancellationToken)
    {
        return Ok(await nhatKyQuery.GetGanDayAsync(truyVan, cancellationToken));
    }
}
