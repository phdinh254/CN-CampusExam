namespace CampusExam.Application.QuanTriVien;

public enum TrangThaiTaoQuanTriDauTien
{
    Created,
    AdminAlreadyExists,
    DuplicateTenDN
}

public sealed record KetQuaTaoQuanTriDauTien(TrangThaiTaoQuanTriDauTien Status, int? MaTK)
{
    public static KetQuaTaoQuanTriDauTien Success(int maTK) => new(TrangThaiTaoQuanTriDauTien.Created, maTK);

    public static KetQuaTaoQuanTriDauTien Failure(TrangThaiTaoQuanTriDauTien status) => new(status, null);
}
