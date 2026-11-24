using CampusExam.Api.Authorization;
using Microsoft.AspNetCore.Authorization;
using CampusExam.Application.MucDo;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/muc-do")]
public class MucDoController(
    ITruyXuatMucDo mucDoQuery) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MucDoDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var danhSach = await mucDoQuery.GetAllAsync(cancellationToken);

        return Ok(danhSach);
    }
}
