using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.Kqht;

public interface IDichVuLenhKqht
{
    Task<KetQuaTaoKqht> CreateAsync(
        LenhTaoKqht command,
        CancellationToken cancellationToken);

    /// <summary>Sửa tên, mô tả, thứ tự. Không đổi được thứ tự khi KQHT đã có câu hỏi.</summary>
    Task<KetQua<KqhtDto>> UpdateAsync(
        int maKQHT,
        LenhSuaKqht command,
        CancellationToken cancellationToken);

    Task<KetQua<KqhtDto>> DoiTrangThaiAsync(
        int maKQHT,
        TrangThaiSuDung trangThai,
        CancellationToken cancellationToken);

    /// <summary>Xóa cứng; chỉ khi chưa có câu hỏi hoặc ma trận nào tham chiếu.</summary>
    Task<KetQua<KhongCo>> XoaAsync(
        int maKQHT,
        CancellationToken cancellationToken);
}
