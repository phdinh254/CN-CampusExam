namespace CampusExam.Api.Authorization;

/// <summary>Tên claim trong access token (không ánh xạ sang ClaimTypes dài của .NET).</summary>
public static class TenClaim
{
    public const string MaTaiKhoan = "sub";
    public const string TenDangNhap = "name";
    public const string VaiTro = "role";
    public const string Msts = "msts";
    public const string MaBaoMat = "sstamp";
}

public static class ChinhSachQuyen
{
    public const string AdminOnly = "AdminOnly";
    public const string CandidateOnly = "CandidateOnly";
}

public static class ChinhSachGioiHanTanSuat
{
    public const string DangNhap = "dang-nhap";
}
