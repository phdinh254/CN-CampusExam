using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.KetQua;

/// <summary>
/// Kết quả một kỳ thi cho quản trị viên. Chỉ kỳ thi đang thi hoặc đã kết thúc; không có kỳ thi trả
/// <c>EXAM_NOT_FOUND</c>, trạng thái khác trả <c>EXAM_NO_RESULTS</c>.
/// </summary>
public interface ITruyXuatKetQua
{
    Task<KetQua<ThongKeKetQuaDto>> ThongKeAsync(int maKT, CancellationToken cancellationToken);

    Task<KetQua<TrangDuLieu<DongBangDiemDto>>> BangDiemAsync(int maKT, TruyVanBangDiem truyVan, CancellationToken cancellationToken);

    /// <summary>Toàn bộ bảng điểm, sắp theo mã số, cho tệp Excel.</summary>
    Task<KetQua<IReadOnlyList<DongBangDiemDto>>> ToanBoBangDiemAsync(int maKT, CancellationToken cancellationToken);

    /// <summary>Tệp Excel (bảng điểm + thống kê) và ghi nhật ký "Xuất kết quả" (nhóm KYTHI).</summary>
    Task<KetQua<TepKetQuaDto>> XuatExcelAsync(int maKT, NguoiThucHien nguoiThucHien, CancellationToken cancellationToken);
}
