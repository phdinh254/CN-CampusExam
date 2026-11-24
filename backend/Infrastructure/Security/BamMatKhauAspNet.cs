using CampusExam.Application.Interfaces.Security;
using Microsoft.AspNetCore.Identity;

namespace CampusExam.Infrastructure.Security;

/// <summary>Băm mật khẩu bằng PasswordHasher của ASP.NET Core Identity (PBKDF2, có salt).</summary>
public sealed class BamMatKhauAspNet : IBamMatKhau
{
    private static readonly object User = new();
    private readonly PasswordHasher<object> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(User, password);

    public KetQuaKiemTraMatKhau Verify(string hash, string password) =>
        _hasher.VerifyHashedPassword(User, hash, password) switch
        {
            PasswordVerificationResult.Success => KetQuaKiemTraMatKhau.Success,
            PasswordVerificationResult.SuccessRehashNeeded => KetQuaKiemTraMatKhau.SuccessRehashNeeded,
            _ => KetQuaKiemTraMatKhau.Failed
        };
}
