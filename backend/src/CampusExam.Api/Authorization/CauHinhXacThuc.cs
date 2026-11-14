using System.Text.Json;
using System.Threading.RateLimiting;
using CampusExam.Api.Common;
using CampusExam.Application.XacThuc;
using CampusExam.Application.Common;
using CampusExam.Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace CampusExam.Api.Authorization;

public static class CauHinhXacThuc
{
    public static IServiceCollection AddCampusExamAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<TuyChonXacThuc>(configuration.GetSection(TuyChonXacThuc.SectionName));
        services.AddSingleton<IDichVuToken, DichVuTokenJwt>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        // Cấu hình lúc chạy để khóa ký chỉ bắt buộc khi thật sự xác thực (lệnh bootstrap-admin không cần).
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<TuyChonXacThuc>>((jwt, authOptions) =>
            {
                var auth = authOptions.Value;
                jwt.MapInboundClaims = false;
                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = auth.Issuer,
                    ValidAudience = auth.Audience,
                    IssuerSigningKey = DichVuTokenJwt.TaoKhoaKy(auth),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    NameClaimType = TenClaim.TenDangNhap,
                    RoleClaimType = TenClaim.VaiTro,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
                jwt.Events = new JwtBearerEvents
                {
                    OnTokenValidated = KiemTraMaBaoMatAsync,
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        var hetHan = context.AuthenticateFailure is not null
                                     || context.Request.Headers.Authorization.Count > 0;
                        context.Response.Headers.WWWAuthenticate = "Bearer";
                        await GhiLoiAsync(context.HttpContext, StatusCodes.Status401Unauthorized,
                            hetHan ? "Phiên đăng nhập đã hết hạn" : "Chưa đăng nhập",
                            hetHan ? MaLoi.AuthTokenExpired : MaLoi.AuthUnauthenticated);
                    },
                    OnForbidden = context => GhiLoiAsync(context.HttpContext, StatusCodes.Status403Forbidden,
                        "Bạn không có quyền thực hiện thao tác này", MaLoi.Forbidden)
                };
            });

        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(ChinhSachQuyen.AdminOnly, policy => policy.RequireRole(TaiKhoan.VaiTroAdmin))
            .AddPolicy(ChinhSachQuyen.CandidateOnly, policy => policy
                .RequireRole(TaiKhoan.VaiTroThiSinh)
                .RequireClaim(TenClaim.Msts));

        services.AddRateLimiter(options =>
        {
            options.OnRejected = async (context, _) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
                }

                await GhiLoiAsync(context.HttpContext, StatusCodes.Status429TooManyRequests,
                    "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.", MaLoi.RateLimited);
            };
            options.AddPolicy(ChinhSachGioiHanTanSuat.DangNhap, httpContext =>
            {
                var auth = httpContext.RequestServices.GetRequiredService<IOptions<TuyChonXacThuc>>().Value;
                return RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "khong-ro",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = auth.LoginPermitsPerMinute,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    });
            });
        });

        return services;
    }

    /// <summary>Thứ tự: rate limit → xác thực → phân quyền.</summary>
    public static WebApplication UseCampusExamAuth(this WebApplication app)
    {
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }

    private static async Task KiemTraMaBaoMatAsync(TokenValidatedContext context)
    {
        var principal = context.Principal!;
        if (!int.TryParse(principal.FindFirst(TenClaim.MaTaiKhoan)?.Value, out var mtk)
            || !Guid.TryParse(principal.FindFirst(TenClaim.MaBaoMat)?.Value, out var maBaoMat))
        {
            context.Fail("Token thiếu claim bắt buộc.");
            return;
        }

        var authService = context.HttpContext.RequestServices.GetRequiredService<IDichVuXacThuc>();
        if (!await authService.AccessTokenConHieuLucAsync(mtk, maBaoMat, context.HttpContext.RequestAborted))
        {
            context.Fail("Tài khoản đã đổi mật khẩu, bị khóa hoặc không còn tồn tại.");
        }
    }

    private static Task GhiLoiAsync(HttpContext context, int status, string title, string code)
    {
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(
            LoiApi.Create(context, status, title, code),
            (JsonSerializerOptions?)null,
            "application/problem+json");
    }
}
