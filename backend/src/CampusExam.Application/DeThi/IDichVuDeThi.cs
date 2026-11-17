using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;

namespace CampusExam.Application.DeThi;

public interface ITruyXuatDeThi
{
    Task<TrangDuLieu<DeGocTomTatDto>> GetPageAsync(TruyVanDeThi truyVan, CancellationToken cancellationToken);

    Task<DeGocChiTietDto?> GetByIdAsync(int maDe, CancellationToken cancellationToken);

    Task<DeConChiTietDto?> GetDeConAsync(int maDe, int maDeCon, CancellationToken cancellationToken);

    Task<HinhLuuTruDeDto?> GetHinhAnhAsync(int maDe, int maCH, string viTri, short thuTu, CancellationToken cancellationToken);
}

public interface IDichVuLenhDeThi
{
    /// <summary>Sinh đề gốc từ ma trận đang sử dụng và các đề con, trong một transaction.</summary>
    Task<KetQua<KetQuaSinhDeDto>> SinhAsync(SinhDeCommand command, NguoiThucHien nguoi, CancellationToken cancellationToken);

    /// <summary>Xóa đề gốc chưa gắn kỳ thi cùng đề con; không xóa file hình.</summary>
    Task<KetQua<KhongCo>> XoaAsync(int maDe, NguoiThucHien nguoi, CancellationToken cancellationToken);
}
