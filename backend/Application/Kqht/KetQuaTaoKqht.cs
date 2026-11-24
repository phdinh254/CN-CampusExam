namespace CampusExam.Application.Kqht;

public enum TrangThaiTaoKqht
{
    Created,
    DuplicateKyHieu
}

public sealed record KetQuaTaoKqht(
    TrangThaiTaoKqht Status,
    KqhtDto? Kqht)
{
    public static KetQuaTaoKqht Success(KqhtDto kqht) =>
        new(TrangThaiTaoKqht.Created, kqht);

    public static KetQuaTaoKqht Duplicate() =>
        new(TrangThaiTaoKqht.DuplicateKyHieu, null);
}
