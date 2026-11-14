namespace CampusExam.Application.MucDo;

public interface ITruyXuatMucDo
{
    Task<IReadOnlyList<MucDoDto>> GetAllAsync(
        CancellationToken cancellationToken);
}
