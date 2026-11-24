namespace CampusExam.Domain.Entities;

public class TaiKhoan
{
    public const string VaiTroAdmin = "ADMIN";
    public const string VaiTroThiSinh = "THISINH";

    public const short TrangThaiKhoa = 0;
    public const short TrangThaiHoatDong = 1;

    public int MaTK { get; set; }

    public string TenDN { get; set; } = string.Empty;

    public string MatKhauHash { get; set; } = string.Empty;

    public string VaiTro { get; set; } = string.Empty;

    public string HoTen { get; set; } = string.Empty;

    public short TrangThai { get; set; }

    public DateTime? LanDNCuoi { get; set; }

    public DateTime NgayTao { get; set; }

    /// <summary>true khi tài khoản còn dùng mật khẩu mặc định (chỉ để quản trị viên theo dõi, không bắt buộc đổi).</summary>
    public bool PhaiDoiMatKhau { get; set; }

    /// <summary>Đổi giá trị khi đổi mật khẩu hoặc khóa tài khoản để vô hiệu các phiên cũ.</summary>
    public Guid MaBaoMat { get; set; }

    public bool DangHoatDong => TrangThai == TrangThaiHoatDong;

    /// <summary>Tài khoản quản trị: tự đặt mật khẩu.</summary>
    public static TaiKhoan TaoQuanTri(string tenDN, string hoTen, string matKhauHash, DateTime now) =>
        Tao(tenDN, hoTen, matKhauHash, VaiTroAdmin, phaiDoiMatKhau: false, now);

    /// <summary>Tài khoản thí sinh: mật khẩu mặc định là ngày sinh.</summary>
    public static TaiKhoan TaoThiSinh(string msts, string hoTen, string matKhauHash, DateTime now) =>
        Tao(msts, hoTen, matKhauHash, VaiTroThiSinh, phaiDoiMatKhau: true, now);

    /// <summary>Đặt mật khẩu mới và vô hiệu mọi token đã cấp.</summary>
    public void DatMatKhau(string matKhauHash, bool phaiDoiMatKhau)
    {
        MatKhauHash = matKhauHash;
        PhaiDoiMatKhau = phaiDoiMatKhau;
        LamMoiMaBaoMat();
    }

    /// <summary>Băm lại cùng mật khẩu theo thuật toán mới; không đổi mật khẩu nên giữ các phiên.</summary>
    public void BamLaiMatKhau(string matKhauHash) => MatKhauHash = matKhauHash;

    public void GhiNhanDangNhap(DateTime now) => LanDNCuoi = now;

    /// <summary>Khóa tài khoản và vô hiệu mọi token đã cấp.</summary>
    public void Khoa()
    {
        TrangThai = TrangThaiKhoa;
        LamMoiMaBaoMat();
    }

    public void MoKhoa() => TrangThai = TrangThaiHoatDong;

    private void LamMoiMaBaoMat() => MaBaoMat = Guid.NewGuid();

    private static TaiKhoan Tao(string tenDN, string hoTen, string matKhauHash, string vaiTro, bool phaiDoiMatKhau, DateTime now) =>
        new()
        {
            TenDN = tenDN,
            HoTen = hoTen,
            MatKhauHash = matKhauHash,
            VaiTro = vaiTro,
            TrangThai = TrangThaiHoatDong,
            NgayTao = now,
            PhaiDoiMatKhau = phaiDoiMatKhau,
            MaBaoMat = Guid.NewGuid()
        };
}
