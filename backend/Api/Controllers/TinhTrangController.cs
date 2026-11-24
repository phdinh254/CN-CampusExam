using Microsoft.AspNetCore.Authorization;
using CampusExam.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/health")]
public class TinhTrangController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            message = "CampusExam API đang hoạt động"
        });
    }

    [HttpGet("database")]
    public async Task<IActionResult> CheckDatabase(
        [FromServices] IKiemTraTinhTrang kiemTra,
        CancellationToken cancellationToken)
    {
        if (!await kiemTra.KetNoiDuocDatabaseAsync(cancellationToken))
        {
            return StatusCode(503, new
            {
                message = "Chưa kết nối được database"
            });
        }

        return Ok(new
        {
            message = "Kết nối database thành công"
        });
    }
}