using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.NhapCauHoi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Nhập câu hỏi từ DOCX hai bước.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/nhap-cau-hoi")]
public sealed class NhapCauHoiController(
    IDichVuNhapCauHoi importService) : ControllerBase
{
    private const long MaximumFileSize = 20 * 1024 * 1024;

    /// <summary>
    /// Đọc tệp, đối chiếu database. Không còn dòng lỗi thì giữ tệp 30 phút và trả
    /// <c>maXemTruoc</c> để xác nhận; còn lỗi thì <c>maXemTruoc</c> là null.
    /// </summary>
    [HttpPost("xem-truoc")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumFileSize)]
    [ProducesResponseType<XemTruocNhapCauHoi>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status413PayloadTooLarge)]
    public async Task<ActionResult<XemTruocNhapCauHoi>> Preview(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest(LoiApi.Create(
                HttpContext,
                StatusCodes.Status400BadRequest,
                "Tệp import bị trống",
                MaLoi.QuestionImportEmptyFile));
        }

        if (file.Length > MaximumFileSize)
        {
            return StatusCode(
                StatusCodes.Status413PayloadTooLarge,
                LoiApi.Create(
                    HttpContext,
                    StatusCodes.Status413PayloadTooLarge,
                    "Tệp import vượt quá 20 MB",
                    MaLoi.QuestionImportFileTooLarge));
        }

        if (!Path.GetExtension(file.FileName).Equals(
                ".docx",
                StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(LoiApi.Create(
                HttpContext,
                StatusCodes.Status400BadRequest,
                "Chỉ hỗ trợ định dạng DOCX",
                MaLoi.QuestionImportUnsupportedFileType,
                "Tệp DOC cũ cần được chuyển đổi sang DOCX trước khi import."));
        }

        await using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        try
        {
            var tenFile = Path.GetFileName(file.FileName);
            return Ok(await importService.XemTruocAsync(stream, tenFile, NguoiThucHien(), cancellationToken));
        }
        catch (LoiDinhDangNhapCauHoi exception)
        {
            return BadRequest(LoiApi.Create(
                HttpContext,
                StatusCodes.Status400BadRequest,
                "Không đọc được tệp DOCX",
                MaLoi.QuestionImportInvalidFile,
                exception.Message));
        }
    }

    /// <summary>
    /// Ghi toàn bộ câu hỏi và hình của bản xem trước trong một transaction. Còn lỗi (dữ liệu đổi từ
    /// lúc xem trước) ⇒ 409 QUESTION_IMPORT_HAS_ERRORS; quá 30 phút ⇒ 410 IMPORT_PREVIEW_EXPIRED.
    /// </summary>
    [HttpPost("xem-truoc/{maXemTruoc}/xac-nhan")]
    [ProducesResponseType<LanImportDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status410Gone)]
    public async Task<ActionResult<LanImportDto>> Confirm(string maXemTruoc, CancellationToken cancellationToken)
    {
        var ketQua = await importService.XacNhanAsync(maXemTruoc, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong
            ? CreatedAtAction(nameof(GetById), new { maLanImport = ketQua.GiaTri!.MaLanImport }, ketQua.GiaTri)
            : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Lịch sử các lần nhập câu hỏi, mới nhất trước.</summary>
    [HttpGet]
    [ProducesResponseType<TrangDuLieu<LanImportDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TrangDuLieu<LanImportDto>>> GetPage(
        [FromQuery] TruyVanTrang truyVan,
        CancellationToken cancellationToken) =>
        Ok(await importService.GetPageAsync(truyVan, cancellationToken));

    [HttpGet("{maLanImport:int}")]
    [ProducesResponseType<LanImportDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LanImportDto>> GetById(int maLanImport, CancellationToken cancellationToken)
    {
        var lan = await importService.GetByIdAsync(maLanImport, cancellationToken);
        return lan is null
            ? NotFound(LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy lần nhập",
                MaLoi.ImportNotFound, $"Không tồn tại lần nhập có mã {maLanImport}."))
            : Ok(lan);
    }

    private NguoiThucHien NguoiThucHien() => new(
        int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value),
        HttpContext.Connection.RemoteIpAddress?.ToString());
}
