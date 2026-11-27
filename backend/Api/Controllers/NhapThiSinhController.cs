using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.NhapCauHoi;
using CampusExam.Application.NhapThiSinh;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Nhập danh sách thí sinh từ tệp Excel hai bước: xem trước rồi xác nhận.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/nhap-thi-sinh")]
public sealed class NhapThiSinhController(IDichVuNhapThiSinh importService) : ControllerBase
{
    private const long KichThuocToiDa = 5 * 1024 * 1024;

    [HttpGet("tep-mau")]
    public FileContentResult TepMau() => File(
        importService.TaoTepMau(),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "mau-nhap-thi-sinh.xlsx");

    /// <summary>
    /// Đọc tệp, kiểm tra từng dòng và đối chiếu database. Không còn dòng lỗi thì giữ tệp 30 phút và
    /// trả <c>maXemTruoc</c> để xác nhận.
    /// </summary>
    [HttpPost("xem-truoc")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(KichThuocToiDa)]
    [ProducesResponseType<XemTruocNhapThiSinh>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status413PayloadTooLarge)]
    public async Task<ActionResult<XemTruocNhapThiSinh>> XemTruoc(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(LoiApi.Create(HttpContext, StatusCodes.Status400BadRequest,
                "Tệp nhập bị trống", MaLoi.StudentImportEmptyFile));
        }

        if (file.Length > KichThuocToiDa)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge, LoiApi.Create(HttpContext,
                StatusCodes.Status413PayloadTooLarge, "Tệp nhập vượt quá 5 MB", MaLoi.StudentImportFileTooLarge));
        }

        if (!Path.GetExtension(file.FileName).Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(LoiApi.Create(HttpContext, StatusCodes.Status400BadRequest,
                "Chỉ hỗ trợ định dạng XLSX", MaLoi.StudentImportUnsupportedFileType,
                "Tệp .xls hoặc .csv cần mở bằng Excel và lưu lại dạng .xlsx."));
        }

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        try
        {
            return Ok(await importService.XemTruocAsync(stream, Path.GetFileName(file.FileName), NguoiThucHien(), cancellationToken));
        }
        catch (LoiDinhDangNhapThiSinh exception)
        {
            return BadRequest(LoiApi.Create(HttpContext, StatusCodes.Status400BadRequest,
                "Không đọc được tệp Excel", MaLoi.StudentImportInvalidFile, exception.Message));
        }
    }

    /// <summary>
    /// Tạo toàn bộ thí sinh và tài khoản trong một transaction. Dữ liệu đổi từ lúc xem trước ⇒
    /// 409 STUDENT_IMPORT_HAS_ERRORS; quá 30 phút ⇒ 410 IMPORT_PREVIEW_EXPIRED.
    /// </summary>
    [HttpPost("xem-truoc/{maXemTruoc}/xac-nhan")]
    [ProducesResponseType<LanImportDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status410Gone)]
    public async Task<ActionResult<LanImportDto>> XacNhan(string maXemTruoc, CancellationToken cancellationToken)
    {
        var ketQua = await importService.XacNhanAsync(maXemTruoc, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong
            ? StatusCode(StatusCodes.Status201Created, ketQua.GiaTri)
            : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Lịch sử các lần nhập thí sinh, mới nhất trước.</summary>
    [HttpGet]
    [ProducesResponseType<TrangDuLieu<LanImportDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<TrangDuLieu<LanImportDto>>> GetPage(
        [FromQuery] TruyVanTrang truyVan,
        CancellationToken cancellationToken) =>
        Ok(await importService.GetPageAsync(truyVan, cancellationToken));

    private NguoiThucHien NguoiThucHien() => new(
        int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value),
        HttpContext.Connection.RemoteIpAddress?.ToString());
}
