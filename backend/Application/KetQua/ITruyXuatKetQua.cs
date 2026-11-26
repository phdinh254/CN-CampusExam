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

    /// <summary>
    /// Bài làm chi tiết của một thí sinh (từng câu đúng/sai). Không được phân công trả <c>EXAM_ASSIGNMENT_NOT_FOUND</c>;
    /// chưa có bài đã nộp hoặc hệ thống thu trả <c>ATTEMPT_NOT_FOUND</c>.
    /// </summary>
    Task<KetQua<BaiLamChiTietDto>> BaiLamChiTietAsync(int maKT, string msts, CancellationToken cancellationToken);

    /// <summary>Tệp Excel (bảng điểm, thống kê, theo KQHT, chi tiết từng câu) và ghi nhật ký "Xuất kết quả" (nhóm KYTHI).</summary>
    Task<KetQua<TepKetQuaDto>> XuatExcelAsync(int maKT, NguoiThucHien nguoiThucHien, CancellationToken cancellationToken);
}
