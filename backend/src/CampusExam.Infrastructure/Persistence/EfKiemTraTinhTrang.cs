using CampusExam.Application.Common;

namespace CampusExam.Infrastructure.Persistence;

public sealed class EfKiemTraTinhTrang(CampusExamDbContext dbContext) : IKiemTraTinhTrang
{
    public Task<bool> KetNoiDuocDatabaseAsync(CancellationToken cancellationToken) =>
        dbContext.Database.CanConnectAsync(cancellationToken);
}
