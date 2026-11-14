using System.Security.Claims;
using System.Text;
using CampusExam.Application.XacThuc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace CampusExam.Api.Authorization;

public sealed class DichVuTokenJwt(IOptions<TuyChonXacThuc> options, TimeProvider timeProvider) : IDichVuToken
{
    private readonly JsonWebTokenHandler _handler = new();

    public (string Token, DateTime HetHan) TaoAccessToken(ThongTinToken thongTin)
    {
        var auth = options.Value;
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var hetHan = now.AddMinutes(auth.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(TenClaim.MaTaiKhoan, thongTin.Mtk.ToString()),
            new(TenClaim.TenDangNhap, thongTin.TenDN),
            new(TenClaim.VaiTro, thongTin.VaiTro),
            new(TenClaim.MaBaoMat, thongTin.MaBaoMat.ToString())
        };
        if (thongTin.Msts is not null)
        {
            claims.Add(new Claim(TenClaim.Msts, thongTin.Msts));
        }

        var token = _handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = auth.Issuer,
            Audience = auth.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = hetHan,
            SigningCredentials = new SigningCredentials(TaoKhoaKy(auth), SecurityAlgorithms.HmacSha256)
        });

        return (token, hetHan);
    }

    public static SymmetricSecurityKey TaoKhoaKy(TuyChonXacThuc auth)
    {
        var bytes = Encoding.UTF8.GetBytes(auth.SigningKey ?? string.Empty);
        if (bytes.Length < 32)
        {
            throw new InvalidOperationException(
                "Chưa cấu hình Auth:SigningKey (tối thiểu 32 byte). Đặt bằng User Secrets: " +
                "dotnet user-secrets set \"Auth:SigningKey\" \"<chuỗi ngẫu nhiên>\" --project src/CampusExam.Api");
        }

        return new SymmetricSecurityKey(bytes);
    }
}
