using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CampusExam.Infrastructure.Persistence;

internal sealed class BoChuyenNgayGioUtc() : ValueConverter<DateTime, DateTime>(
    value => ToUtc(value),
    value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
{
    // Giờ Local được đổi sang UTC; Unspecified coi như đã là UTC.
    internal static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}

internal sealed class BoChuyenNgayGioUtcNull() : ValueConverter<DateTime?, DateTime?>(
    value => value.HasValue ? BoChuyenNgayGioUtc.ToUtc(value.Value) : value,
    value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);
