using CampusExam.Application.BaiLam;

namespace CampusExam.Api.Common;

/// <summary>
/// Tác vụ nền quét mỗi 30 giây: thu và chấm bài quá hạn (kể cả khi thí sinh đã đóng trình duyệt),
/// chuyển trạng thái kỳ thi theo giờ. Mọi request bài làm cũng tự kiểm tra hạn nộp.
/// </summary>
public sealed class TacVuThuBai(IServiceScopeFactory scopeFactory, ILogger<TacVuThuBai> logger) : BackgroundService
{
    private static readonly TimeSpan ChuKy = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(ChuKy);
        do
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var dichVu = scope.ServiceProvider.GetRequiredService<IDichVuBaiLam>();
                var soBai = await dichVu.XuLyDinhKyAsync(stoppingToken);
                if (soBai > 0)
                {
                    logger.LogInformation("Đã tự thu {SoBai} bài quá hạn.", soBai);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Tác vụ thu bài gặp lỗi; sẽ thử lại ở chu kỳ sau.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
