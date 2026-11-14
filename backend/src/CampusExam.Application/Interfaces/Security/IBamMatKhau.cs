namespace CampusExam.Application.Interfaces.Security;

public enum KetQuaKiemTraMatKhau
{
    Failed,
    Success,
    SuccessRehashNeeded
}

public interface IBamMatKhau
{
    string Hash(string password);

    KetQuaKiemTraMatKhau Verify(string hash, string password);
}
