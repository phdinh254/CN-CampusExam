using System.ComponentModel.DataAnnotations;

namespace CampusExam.Application.MaTran;

/// <summary>Một ô của ma trận gửi lên khi lưu.</summary>
public sealed class DongCauTrucCommand
{
    public int MaKQHT { get; init; }

    public byte MaMD { get; init; }

    public int SoCau { get; init; }

    /// <summary>% của mức độ trong KQHT; ba mức cộng lại 100, hoặc cả ba để trống.</summary>
    public decimal? TyLe { get; init; }
}

/// <summary>
/// Body của <c>POST /api/ma-tran</c>. Mỗi KQHT gửi đủ ba dòng mức độ 1, 2, 3 (dòng 0 câu vẫn gửi);
/// số câu đã được quy đổi từ tỷ lệ ở giao diện, backend chỉ kiểm tra tổng.
/// </summary>
public class LuuMaTranCommand : IValidatableObject
{
    public const int TongSoCauToiDa = 500;

    [Required(ErrorMessage = "Tên ma trận là bắt buộc.")]
    [StringLength(200, ErrorMessage = "Tên ma trận không được vượt quá 200 ký tự.")]
    public string TenMT { get; init; } = string.Empty;

    [Range(1, 600, ErrorMessage = "Thời gian làm bài phải từ 1 đến 600 phút.")]
    public int ThoiGianLam { get; init; }

    [Required(ErrorMessage = "Cấu trúc ma trận là bắt buộc.")]
    public List<DongCauTrucCommand> CauTruc { get; init; } = [];

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CauTruc is null || CauTruc.Count == 0)
        {
            yield return Loi("Ma trận phải có ít nhất một KQHT.");
            yield break;
        }

        foreach (var nhom in CauTruc.GroupBy(dong => dong.MaKQHT).OrderBy(nhom => nhom.Key))
        {
            var ten = $"KQHT mã {nhom.Key}";
            var dong = nhom.ToList();
            var mucDo = dong.Select(x => x.MaMD).OrderBy(x => x).ToList();

            if (nhom.Key <= 0)
            {
                yield return Loi("Mã KQHT không hợp lệ.");
                continue;
            }

            if (!mucDo.SequenceEqual(new byte[] { 1, 2, 3 }))
            {
                yield return Loi($"{ten} phải có đúng ba mức độ 1, 2, 3, mỗi mức một dòng.");
                continue;
            }

            if (dong.Any(x => x.SoCau < 0))
            {
                yield return Loi($"{ten} có số câu âm.");
            }

            if (dong.Any(x => x.TyLe is < 0 or > 100))
            {
                yield return Loi($"{ten} có tỷ lệ ngoài khoảng 0–100%.");
            }

            // Cột TYLE là decimal(5,2): nhận quá 2 chữ số thập phân thì database làm tròn và tổng lệch 100.
            if (dong.Any(x => x.TyLe is { } tyLe && decimal.Round(tyLe, 2) != tyLe))
            {
                yield return Loi($"{ten} có tỷ lệ quá 2 chữ số thập phân.");
            }

            if (dong.Sum(x => x.SoCau) <= 0)
            {
                yield return Loi($"{ten} phải có ít nhất một câu.");
            }

            var soDongCoTyLe = dong.Count(x => x.TyLe.HasValue);
            if (soDongCoTyLe is > 0 and < 3)
            {
                yield return Loi($"{ten} phải nhập tỷ lệ cho cả ba mức độ.");
            }
            else if (soDongCoTyLe == 3 && dong.Sum(x => x.TyLe!.Value) != 100m)
            {
                yield return Loi($"Tổng tỷ lệ của {ten} phải bằng 100%.");
            }
        }

        if (CauTruc.Sum(x => Math.Max(x.SoCau, 0)) > TongSoCauToiDa)
        {
            yield return Loi($"Tổng số câu của ma trận không được vượt quá {TongSoCauToiDa}.");
        }
    }

    private static ValidationResult Loi(string thongBao) => new(thongBao, [nameof(CauTruc)]);
}

/// <summary>Body của <c>PUT /api/ma-tran/{maMT}</c>.</summary>
public sealed class SuaMaTranCommand : LuuMaTranCommand
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

/// <summary>Body của <c>PATCH /api/ma-tran/{maMT}/trang-thai</c>.</summary>
public sealed class DoiTrangThaiMaTranRequest
{
    [Required(ErrorMessage = "Trạng thái là bắt buộc.")]
    public TrangThaiMaTran? TrangThai { get; init; }
}
