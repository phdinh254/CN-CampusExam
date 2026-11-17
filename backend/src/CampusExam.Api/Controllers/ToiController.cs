using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.BaiLam;
using CampusExam.Application.Common;
using CampusExam.Application.ThiSinh;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CampusExam.Api.Controllers;

/// <summary>
/// Không gian của thí sinh đang đăng nhập. Luôn lấy thí sinh từ
/// token, không nhận MSTS trên URL.
/// </summary>
[ApiController]
[Authorize(Policy = ChinhSachQuyen.CandidateOnly)]
[Route("api/toi")]
public class ToiController(
    ITruyXuatThiSinh thiSinhQuery,
    IDichVuBaiLam baiLamService,
    ILuuTruTep fileStorage) : ControllerBase
{
    /// <summary>Hồ sơ cá nhân cho trang "Tài khoản cá nhân". Thí sinh không tự sửa hồ sơ.</summary>
    [HttpGet("ho-so")]
    [ProducesResponseType<HoSoCaNhanDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HoSoCaNhanDto>> GetHoSo(CancellationToken cancellationToken)
    {
        var thiSinh = await thiSinhQuery.GetByMstsAsync(Msts(), cancellationToken);
        if (thiSinh is null)
        {
            return NotFound(LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy hồ sơ",
                MaLoi.StudentNotFound, "Tài khoản không còn gắn với hồ sơ thí sinh."));
        }

        return Ok(new HoSoCaNhanDto(
            thiSinh.Msts,
            thiSinh.HoTen,
            thiSinh.NgaySinh,
            thiSinh.GioiTinh,
            thiSinh.Lop,
            thiSinh.NoiSinh,
            thiSinh.Cccd,
            thiSinh.NgayTao));
    }

    /// <summary>Kỳ thi đã phát hành mà thí sinh được phân công, kèm giờ máy chủ.</summary>
    [HttpGet("ky-thi")]
    [ProducesResponseType<DanhSachKyThiCuaToiDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DanhSachKyThiCuaToiDto>> GetKyThi(CancellationToken cancellationToken)
    {
        return Ok(await baiLamService.DanhSachKyThiAsync(Msts(), cancellationToken));
    }

    [HttpGet("ky-thi/{maKT:int}")]
    [ProducesResponseType<KyThiCuaToiDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<KyThiCuaToiDto>> GetKyThiById(int maKT, CancellationToken cancellationToken)
    {
        var kyThi = await baiLamService.ChiTietKyThiAsync(Msts(), maKT, cancellationToken);
        return kyThi is null
            ? NotFound(LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy kỳ thi",
                MaLoi.ExamNotFound, $"Bạn không được phân công vào kỳ thi {maKT} hoặc kỳ thi chưa được phát hành."))
            : Ok(kyThi);
    }

    /// <summary>Bắt đầu hoặc tiếp tục bài làm; gọi nhiều lần vẫn chỉ một bài.</summary>
    [HttpPost("ky-thi/{maKT:int}/bai-lam")]
    [ProducesResponseType<BaiLamDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BaiLamDto>> BatDau(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await baiLamService.BatDauAsync(
            Msts(), maKT, HttpContext.Connection.RemoteIpAddress?.ToString(), cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    [HttpGet("ky-thi/{maKT:int}/bai-lam")]
    [ProducesResponseType<BaiLamDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BaiLamDto>> GetBaiLam(int maKT, CancellationToken cancellationToken)
    {
        var ketQua = await baiLamService.LayAsync(Msts(), maKT, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Tự lưu một lô thay đổi; hết giờ trả 409 ATTEMPT_CLOSED.</summary>
    [HttpPut("ky-thi/{maKT:int}/bai-lam/tra-loi")]
    [ProducesResponseType<KetQuaLuuDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<KetQuaLuuDto>> LuuTraLoi(
        int maKT,
        LoTraLoiRequest lo,
        CancellationToken cancellationToken)
    {
        var ketQua = await baiLamService.LuuAsync(Msts(), maKT, lo, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Nộp bài kèm lô thay đổi cuối; chấm ngay. Gọi lại trả kết quả lần đầu.</summary>
    [HttpPost("ky-thi/{maKT:int}/bai-lam/nop")]
    [ProducesResponseType<KetQuaNopDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<KetQuaNopDto>> Nop(
        int maKT,
        LoTraLoiRequest lo,
        CancellationToken cancellationToken)
    {
        var ketQua = await baiLamService.NopAsync(Msts(), maKT, lo, cancellationToken);
        return ketQua.ThanhCong ? Ok(ketQua.GiaTri) : LoiApi.FromLoi(HttpContext, ketQua.Loi!);
    }

    /// <summary>Hình của câu theo vị trí hiển thị; chỉ trong thời gian làm bài.</summary>
    [HttpGet("ky-thi/{maKT:int}/bai-lam/hinh-anh/{ttCau:int}/{viTri}/{thuTu:int}")]
    [ProducesResponseType<FileStreamResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHinhAnh(
        int maKT,
        int ttCau,
        string viTri,
        short thuTu,
        CancellationToken cancellationToken)
    {
        var hinh = await baiLamService.HinhAsync(Msts(), maKT, ttCau, viTri, thuTu, cancellationToken);
        var stream = hinh is null ? null : await fileStorage.OpenReadAsync(hinh.StorageKey, cancellationToken);
        if (hinh is null || stream is null)
        {
            return NotFound(LoiApi.Create(HttpContext, StatusCodes.Status404NotFound, "Không tìm thấy hình",
                MaLoi.QuestionMediaNotFound, "Không có hình này hoặc bài làm đã đóng."));
        }

        Response.Headers.CacheControl = "private, no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.ContentSecurityPolicy = "default-src 'none'; sandbox";
        return File(stream, hinh.MimeType);
    }

    private string Msts() => User.FindFirst(TenClaim.Msts)!.Value;
}
