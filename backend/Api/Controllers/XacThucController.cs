using CampusExam.Api.Authorization;
using CampusExam.Api.Common;
using CampusExam.Application.XacThuc;
using CampusExam.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace CampusExam.Api.Controllers;

/// <summary>Đăng nhập, phiên và mật khẩu.</summary>
[ApiController]
[Route("api/xac-thuc")]
public sealed class XacThucController(
    IDichVuXacThuc authService,
    IOptions<TuyChonXacThuc> authOptions) : ControllerBase
{
    public const string RefreshCookie = "ce_refresh";
    public const string RefreshCookiePath = "/api/xac-thuc";
    public const string CsrfHeader = "X-CSRF";

    [HttpPost("dang-nhap")]
    [AllowAnonymous]
    [EnableRateLimiting(ChinhSachGioiHanTanSuat.DangNhap)]
    [ProducesResponseType<PhienDangNhapResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PhienDangNhapResponse>> DangNhap(
        DangNhapRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.DangNhapAsync(request, NguCanh(), cancellationToken);

        switch (result.KetQua)
        {
            case KetQuaDangNhap.ThanhCong:
                GhiCookie(result.Phien!);
                return Ok(result.Phien!.ToResponse());

            case KetQuaDangNhap.TamKhoa:
                return LoiTamKhoa(result.KhoaDen);

            case KetQuaDangNhap.BiVoHieuHoa:
                return StatusCode(StatusCodes.Status403Forbidden, LoiApi.Create(HttpContext,
                    StatusCodes.Status403Forbidden, "Tài khoản đã bị khóa", MaLoi.AuthAccountDisabled,
                    "Liên hệ quản trị viên để được mở khóa."));

            default:
                return Unauthorized(LoiApi.Create(HttpContext, StatusCodes.Status401Unauthorized,
                    "Tên đăng nhập hoặc mật khẩu không đúng", MaLoi.AuthInvalidCredentials));
        }
    }

    [HttpPost("lam-moi")]
    [AllowAnonymous]
    [ProducesResponseType<PhienDangNhapResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<PhienDangNhapResponse>> LamMoi(CancellationToken cancellationToken)
    {
        if (!YeuCauCungNguon())
        {
            return LoiCsrf();
        }

        var refreshToken = Request.Cookies[RefreshCookie];
        var phien = string.IsNullOrEmpty(refreshToken)
            ? null
            : await authService.LamMoiAsync(refreshToken, NguCanh(), cancellationToken);

        if (phien is null)
        {
            XoaCookie();
            return Unauthorized(LoiApi.Create(HttpContext, StatusCodes.Status401Unauthorized,
                "Phiên đăng nhập đã hết hạn", MaLoi.AuthRefreshInvalid));
        }

        GhiCookie(phien);
        return Ok(phien.ToResponse());
    }

    [HttpPost("dang-xuat")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DangXuat(CancellationToken cancellationToken)
    {
        if (!YeuCauCungNguon())
        {
            return LoiCsrf();
        }

        var refreshToken = Request.Cookies[RefreshCookie];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            await authService.DangXuatAsync(refreshToken, NguCanh(), cancellationToken);
        }

        XoaCookie();
        return NoContent();
    }

    [HttpPost("doi-mat-khau")]
    [Authorize]
    // Dùng chung hạn mức với đăng nhập: chặn dò mật khẩu cũ bằng access token bị lộ.
    [EnableRateLimiting(ChinhSachGioiHanTanSuat.DangNhap)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<PhienDangNhapResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    public async Task<ActionResult<PhienDangNhapResponse>> DoiMatKhau(
        DoiMatKhauRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.DoiMatKhauAsync(
            MaTaiKhoan(), request, Request.Cookies[RefreshCookie], NguCanh(), cancellationToken);

        switch (result.KetQua)
        {
            case KetQuaDoiMatKhau.SaiMatKhauCu:
                return BadRequest(LoiApi.Validation(HttpContext,
                    new Dictionary<string, string[]> { ["matKhauCu"] = ["Mật khẩu hiện tại không đúng."] },
                    MaLoi.AuthCurrentPasswordIncorrect, "Mật khẩu hiện tại không đúng"));

            case KetQuaDoiMatKhau.TamKhoa:
                return LoiTamKhoa(result.KhoaDen);

            case KetQuaDoiMatKhau.MatKhauMoiKhongHopLe:
                return BadRequest(LoiApi.Validation(HttpContext,
                    new Dictionary<string, string[]> { ["matKhauMoi"] = [.. result.Loi!] }));

            default:
                GhiCookie(result.Phien!);
                return Ok(result.Phien!.ToResponse());
        }
    }

    private ObjectResult LoiTamKhoa(DateTime? khoaDen)
    {
        var locked = LoiApi.Create(HttpContext, StatusCodes.Status423Locked,
            "Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần", MaLoi.AuthAccountLocked,
            "Vui lòng thử lại sau ít phút.");
        locked.Extensions["khoaDen"] = khoaDen;
        return StatusCode(StatusCodes.Status423Locked, locked);
    }

    private int MaTaiKhoan() => int.Parse(User.FindFirst(TenClaim.MaTaiKhoan)!.Value);

    private NguCanhYeuCau NguCanh() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());

    /// <summary>
    /// Chống CSRF cho các lệnh dùng cookie: bắt buộc header tự đặt (trình duyệt khác origin phải preflight,
    /// mà API không bật CORS) và Origin, nếu có, phải thuộc allowlist hoặc trùng chính API.
    /// </summary>
    private bool YeuCauCungNguon()
    {
        if (Request.Headers[CsrfHeader] != "1")
        {
            return false;
        }

        var origin = Request.Headers.Origin.ToString().TrimEnd('/');
        if (string.IsNullOrEmpty(origin))
        {
            return true;
        }

        return origin.Equals($"{Request.Scheme}://{Request.Host}", StringComparison.OrdinalIgnoreCase)
               || authOptions.Value.AllowedOrigins.Any(allowed =>
                   allowed.TrimEnd('/').Equals(origin, StringComparison.OrdinalIgnoreCase));
    }

    private ObjectResult LoiCsrf() => StatusCode(StatusCodes.Status403Forbidden, LoiApi.Create(HttpContext,
        StatusCodes.Status403Forbidden, "Yêu cầu không hợp lệ", MaLoi.AuthCsrfFailed));

    private void GhiCookie(PhienDaCap phien) =>
        Response.Cookies.Append(RefreshCookie, phien.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = RefreshCookiePath,
            IsEssential = true,
            // Không ghi nhớ: cookie phiên trình duyệt, máy chủ vẫn giới hạn bằng HETHAN.
            Expires = phien.GhiNho ? new DateTimeOffset(phien.RefreshTokenHetHan) : null
        });

    private void XoaCookie() =>
        Response.Cookies.Delete(RefreshCookie, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = RefreshCookiePath
        });
}
