using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.DeThi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>Đề gốc và đề con cho quản trị viên; có đáp án đúng.</summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.AdminOnly)]
[Route("api/de-goc")]
public class DeThiController(
    ITruyXuatDeThi deThiQuery,
    IDichVuLenhDeThi deThiCommandService,
    ILuuTruTep fileStorage) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<TrangDuLieu<DeGocTomTatDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TrangDuLieu<DeGocTomTatDto>>> GetPage(
        [FromQuery] TruyVanDeThi truyVan,
        CancellationToken cancellationToken)
    {
        return Ok(await deThiQuery.GetPageAsync(truyVan, cancellationToken));
    }

    [HttpGet("{maDe:int}")]
    [ProducesResponseType<DeGocChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeGocChiTietDto>> GetById(int maDe, CancellationToken cancellationToken)
    {
        var deGoc = await deThiQuery.GetByIdAsync(maDe, cancellationToken);
        return deGoc is null ? NotFound(KhongTimThay($"Không tồn tại đề gốc có mã {maDe}.")) : Ok(deGoc);
    }

    [HttpGet("{maDe:int}/de-con/{maDeCon:int}")]
    [ProducesResponseType<DeConChiTietDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeConChiTietDto>> GetDeCon(int maDe, int maDeCon, CancellationToken cancellationToken)
    {
        var deCon = await deThiQuery.GetDeConAsync(maDe, maDeCon, cancellationToken);
        return deCon is null ? NotFound(KhongTimThay($"Đề gốc {maDe} không có đề con {maDeCon}.")) : Ok(deCon);
    }

    /// <summary>Hình trong đề; header giống ảnh câu hỏi để tệp giả dạng ảnh không chạy được script.</summary>
    [HttpGet("{maDe:int}/hinh-anh/{maCH:int}/{viTri}/{thuTu:int}")]
    [ProducesResponseType<FileStreamResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHinhAnh(int maDe, int maCH, string viTri, short thuTu, CancellationToken cancellationToken)
    {
        var hinh = await deThiQuery.GetHinhAnhAsync(maDe, maCH, viTri, thuTu, cancellationToken);
        var stream = hinh is null ? null : await fileStorage.OpenReadAsync(hinh.StorageKey, cancellationToken);
        if (hinh is null || stream is null)
        {
            return NotFound(LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy hình",
                MaLoi.QuestionMediaNotFound, $"Đề {maDe} không có hình {viTri}/{thuTu} của câu {maCH}."));
        }

        Response.Headers.CacheControl = "private, max-age=86400, immutable";
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; sandbox";
        return File(stream, hinh.MimeType);
    }

    [HttpPost]
    [ProducesResponseType<KetQuaSinhDeDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KetQuaSinhDeDto>> Sinh(SinhDeCommand command, CancellationToken cancellationToken)
    {
        var ketQua = await deThiCommandService.SinhAsync(command, NguoiThucHien(), cancellationToken);
        if (!ketQua.ThanhCong)
        {
            return LoiApi.FromLoi(HttpContext, ketQua.Loi!);
        }

        return CreatedAtAction(nameof(GetById), new { maDe = ketQua.GiaTri!.MaDe }, ketQua.GiaTri);
    }

    /// <summary>Xóa đề chưa gắn kỳ thi; ngược lại 409 PAPER_IN_USE.</summary>
    [HttpDelete("{maDe:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int maDe, CancellationToken cancellationToken)
    {
        var ketQua = await deThiCommandService.XoaAsync(maDe, NguoiThucHien(), cancellationToken);
        return ketQua.ThanhCong ? NoContent() : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    private ProblemDetails KhongTimThay(string chiTiet) =>
        LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy đề", MaLoi.PaperNotFound, chiTiet);

    private NguoiThucHien NguoiThucHien() => new(
        int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value),
        HttpContext.Connection.RemoteIpAddress?.ToString());
}
