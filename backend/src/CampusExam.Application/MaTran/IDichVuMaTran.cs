using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.MaTran;

public interface ITruyXuatMaTran
{
    Task<TrangDuLieu<MaTranTomTatDto>> GetPageAsync(TruyVanMaTran truyVan, CancellationToken cancellationToken);

    Task<MaTranChiTietDto?> GetByIdAsync(int maMT, CancellationToken cancellationToken);

    /// <summary>Số câu đang sử dụng theo từng ô KQHT × mức độ, chỉ tính KQHT đang sử dụng.</summary>
    Task<IReadOnlyList<DoPhuDto>> GetDoPhuAsync(CancellationToken cancellationToken);
}

public interface IDichVuLenhMaTran
{
    /// <summary>Tạo ma trận ở trạng thái đang soạn.</summary>
    Task<KetQua<MaTranChiTietDto>> TaoAsync(LuuMaTranCommand command, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Chỉ sửa được ma trận đang soạn và chưa sinh đề; bắt buộc đúng phiên bản.</summary>
    Task<KetQua<MaTranChiTietDto>> SuaAsync(int maMT, SuaMaTranCommand command, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>
    /// Sử dụng: mọi ô đủ câu và mọi KQHT còn dùng. Về đang soạn: chưa sinh đề. Ngừng: luôn được.
    /// </summary>
    Task<KetQua<MaTranChiTietDto>> DoiTrangThaiAsync(int maMT, TrangThaiMaTran trangThai, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Xóa cứng; chỉ khi chưa sinh đề.</summary>
    Task<KetQua<KhongCo>> XoaAsync(int maMT, NguoiThucHien nguoi, CancellationToken cancellationToken);
}
