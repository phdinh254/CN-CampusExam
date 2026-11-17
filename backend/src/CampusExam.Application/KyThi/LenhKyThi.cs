using System.ComponentModel.DataAnnotations;

namespace CampusExam.Application.KyThi;

/// <summary>Body của <c>POST /api/ky-thi</c>: tạo kỳ thi nháp.</summary>
public class LuuKyThiCommand : IValidatableObject
{
    [Required(ErrorMessage = "Tên kỳ thi là bắt buộc.")]
    [StringLength(200, ErrorMessage = "Tên kỳ thi không được vượt quá 200 ký tự.")]
    public string TenKT { get; init; } = string.Empty;

    [Required(ErrorMessage = "Môn thi là bắt buộc.")]
    [StringLength(200, ErrorMessage = "Môn thi không được vượt quá 200 ký tự.")]
    public string MonThi { get; init; } = string.Empty;

    [Required(ErrorMessage = "Giờ bắt đầu là bắt buộc.")]
    public DateTime? TgBatDau { get; init; }

    [Range(1, 600, ErrorMessage = "Thời lượng phải từ 1 đến 600 phút.")]
    public int ThoiLuong { get; init; }

    [Range(0, 120, ErrorMessage = "Số phút cho vào trễ phải từ 0 đến 120.")]
    public int SoPhutChoVaoTre { get; init; }

    public bool HienDiem { get; init; } = true;

    public bool ChoXemLai { get; init; }

    public CachPhanDe CachPhanDe { get; init; } = CachPhanDe.CanBang;

    /// <summary>Giờ bắt đầu quy về UTC; giờ không ghi múi được coi là UTC.</summary>
    public DateTime TgBatDauUtc => TgBatDau!.Value.Kind switch
    {
        DateTimeKind.Utc => TgBatDau.Value,
        DateTimeKind.Local => TgBatDau.Value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(TgBatDau.Value, DateTimeKind.Utc)
    };

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ThoiLuong > 0 && SoPhutChoVaoTre >= ThoiLuong)
        {
            yield return new ValidationResult(
                "Số phút cho vào trễ phải nhỏ hơn thời lượng làm bài.",
                [nameof(SoPhutChoVaoTre)]);
        }
    }
}

/// <summary>Body của <c>PUT /api/ky-thi/{maKT}</c>: chỉ sửa được kỳ thi nháp.</summary>
public sealed class SuaKyThiCommand : LuuKyThiCommand
{
    [Required(ErrorMessage = "Phiên bản là bắt buộc.")]
    public string PhienBan { get; init; } = string.Empty;

    public byte[]? PhienBanBytes()
    {
        var buffer = new byte[8];
        return Convert.TryFromBase64String(PhienBan, buffer, out var soByte) && soByte == 8 ? buffer : null;
    }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var loi in base.Validate(validationContext))
        {
            yield return loi;
        }

        if (!string.IsNullOrEmpty(PhienBan) && PhienBanBytes() is null)
        {
            yield return new ValidationResult("Phiên bản không hợp lệ.", [nameof(PhienBan)]);
        }
    }
}

/// <summary>Body của <c>PUT /api/ky-thi/{maKT}/de-goc</c>; để trống <c>maDe</c> để gỡ đề.</summary>
public sealed class GanDeGocRequest
{
    public int? MaDe { get; init; }
}

/// <summary>Body của <c>POST /api/ky-thi/{maKT}/thi-sinh</c>.</summary>
public sealed class PhanCongThiSinhRequest
{
    public const int SoThiSinhToiDa = 1000;

    [Required(ErrorMessage = "Danh sách thí sinh là bắt buộc.")]
    [MinLength(1, ErrorMessage = "Chọn ít nhất một thí sinh.")]
    [MaxLength(SoThiSinhToiDa, ErrorMessage = "Mỗi lần phân công tối đa 1000 thí sinh.")]
    public List<string> DsMsts { get; init; } = [];
}

/// <summary>Body của <c>PUT /api/ky-thi/{maKT}/thi-sinh/{msts}/so-may</c>.</summary>
public sealed class DoiSoMayRequest
{
    [StringLength(10, ErrorMessage = "Số máy không được vượt quá 10 ký tự.")]
    [RegularExpression("^[A-Za-z0-9._-]*$", ErrorMessage = "Số máy chỉ gồm chữ không dấu, số và . _ -")]
    public string? SoMay { get; init; }
}

/// <summary>Body của <c>POST /api/ky-thi/{maKT}/bai-lam/{maBL}/cong-gio</c>.</summary>
public sealed class CongGioRequest
{
    [Range(1, 120, ErrorMessage = "Số phút cộng thêm phải từ 1 đến 120.")]
    public int SoPhut { get; init; }

    [Required(ErrorMessage = "Lý do cộng giờ là bắt buộc.")]
    [StringLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    public string LyDo { get; init; } = string.Empty;
}
