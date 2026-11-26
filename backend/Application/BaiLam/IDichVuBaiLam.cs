using CampusExam.Application.Common;
using CampusExam.Application.Common.Models;
using CampusExam.Application.KyThi;

namespace CampusExam.Application.BaiLam;

/// <summary>Kỳ thi và bài làm của thí sinh đang đăng nhập; luôn nhận MSTS từ token.</summary>
public interface IDichVuBaiLam
{
    /// <summary>Kỳ thi đã phát hành mà thí sinh được phân công.</summary>
    Task<DanhSachKyThiCuaToiDto> DanhSachKyThiAsync(string msts, CancellationToken cancellationToken);

    Task<KyThiCuaToiDto?> ChiTietKyThiAsync(string msts, int maKT, CancellationToken cancellationToken);

    /// <summary>Bắt đầu hoặc tiếp tục bài làm (idempotent: một bài mỗi phân công).</summary>
    Task<KetQua<BaiLamDto>> BatDauAsync(string msts, int maKT, string? diaChiIP, CancellationToken cancellationToken);

    /// <summary>Đề đã hoán vị, câu trả lời đã lưu và hạn nộp; bài hết hạn được thu ngay.</summary>
    Task<KetQua<BaiLamDto>> LayAsync(string msts, int maKT, CancellationToken cancellationToken);

    Task<KetQua<KetQuaLuuDto>> LuuAsync(string msts, int maKT, LoTraLoiRequest lo, CancellationToken cancellationToken);

    /// <summary>Lưu lô cuối rồi nộp và chấm; gọi lại trả kết quả lần đầu.</summary>
    Task<KetQua<KetQuaNopDto>> NopAsync(string msts, int maKT, LoTraLoiRequest lo, CancellationToken cancellationToken);

    /// <summary>Hình của câu theo vị trí hiển thị; chỉ khi bài đang làm.</summary>
    Task<HinhLuuTruBaiLamDto?> HinhAsync(string msts, int maKT, int ttCau, string viTri, short thuTu, CancellationToken cancellationToken);

    /// <summary>Tác vụ nền: thu và chấm bài quá hạn, chuyển trạng thái kỳ thi theo giờ. Trả số bài đã thu.</summary>
    Task<int> XuLyDinhKyAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Quản trị viên thu bài đang làm của một thí sinh (xử lý sự cố): chấm ngay như hệ thống thu, giờ nộp
    /// là lúc thu, có nhật ký kèm lý do.
    /// </summary>
    Task<KetQua<KhongCo>> ThuBaiAsync(int maKT, int maBL, ThuBaiRequest request, NguoiThucHien nguoi, CancellationToken cancellationToken);
}
