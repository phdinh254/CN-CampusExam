namespace CampusExam.Application.NhapCauHoi;

public interface IBoDocDocxCauHoi
{
    Task<XemTruocNhapCauHoi> PreviewAsync(
        Stream docxStream,
        CancellationToken cancellationToken);

    /// <summary>Đọc như <see cref="PreviewAsync"/> và kèm nội dung nhị phân của từng hình (dùng khi xác nhận nhập).</summary>
    Task<TaiLieuNhapCauHoi> ReadAsync(
        Stream docxStream,
        CancellationToken cancellationToken);
}

/// <summary>Nội dung một hình đã đặt vào câu hỏi; không trả qua API.</summary>
public sealed record NoiDungMediaNhapCauHoi(
    int RowNumber,
    string Position,
    short Order,
    string FileName,
    string ContentType,
    byte[] Data);

public sealed record TaiLieuNhapCauHoi(
    XemTruocNhapCauHoi Preview,
    IReadOnlyList<NoiDungMediaNhapCauHoi> Media);
