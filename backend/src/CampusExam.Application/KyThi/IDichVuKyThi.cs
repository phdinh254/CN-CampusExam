using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.KyThi;

public interface ITruyXuatKyThi
{
    Task<TrangDuLieu<KyThiTomTatDto>> GetPageAsync(TruyVanKyThi truyVan, CancellationToken cancellationToken);

    Task<KyThiChiTietDto?> GetByIdAsync(int maKT, CancellationToken cancellationToken);

    /// <summary>Toàn bộ thí sinh được phân công, sắp theo số máy rồi mã số; null khi không có kỳ thi.</summary>
    Task<IReadOnlyList<ThiSinhKyThiDto>?> GetThiSinhAsync(int maKT, CancellationToken cancellationToken);

    /// <summary>Điều kiện còn thiếu để phát hành; null khi không có kỳ thi.</summary>
    Task<KiemTraPhatHanhDto?> KiemTraPhatHanhAsync(int maKT, CancellationToken cancellationToken);

    /// <summary>Số liệu và danh sách thí sinh cho màn theo dõi thi; null khi không có kỳ thi.</summary>
    Task<GiamSatKyThiDto?> GiamSatAsync(int maKT, CancellationToken cancellationToken);
}

public interface IDichVuLenhKyThi
{
    Task<KetQua<KyThiChiTietDto>> TaoAsync(LuuKyThiCommand command, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Chỉ sửa kỳ thi nháp; bắt buộc đúng phiên bản.</summary>
    Task<KetQua<KyThiChiTietDto>> SuaAsync(int maKT, SuaKyThiCommand command, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Xóa kỳ thi nháp cùng phân công của nó.</summary>
    Task<KetQua<KhongCo>> XoaAsync(int maKT, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Gắn hoặc gỡ đề gốc; chỉ khi kỳ thi nháp và chưa phân công thí sinh.</summary>
    Task<KetQua<KyThiChiTietDto>> GanDeGocAsync(int maKT, int? maDe, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Phân công thí sinh, gán đề con theo cách phân đề của kỳ thi.</summary>
    Task<KetQua<KetQuaPhanCongDto>> PhanCongAsync(int maKT, IReadOnlyList<string> dsMsts, NguoiThucHien nguoi, CancellationToken cancellationToken);

    Task<KetQua<KhongCo>> DoiSoMayAsync(int maKT, string msts, string? soMay, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Gỡ phân công của thí sinh chưa vào làm bài.</summary>
    Task<KetQua<KhongCo>> BoPhanCongAsync(int maKT, string msts, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Nháp → đã phát hành khi đủ điều kiện.</summary>
    Task<KetQua<KyThiChiTietDto>> PhatHanhAsync(int maKT, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Hủy kỳ thi chưa có thí sinh nào vào làm bài; gỡ phân công và đề gốc để dùng lại.</summary>
    Task<KetQua<KyThiChiTietDto>> HuyAsync(int maKT, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Cộng phút cho một bài đang làm; không đổi giờ kết thúc chung, có nhật ký.</summary>
    Task<KetQua<KhongCo>> CongGioAsync(int maKT, int maBL, CongGioRequest request, NguoiThucHien nguoi, CancellationToken cancellationToken);
}
