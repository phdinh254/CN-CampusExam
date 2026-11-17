using CampusExam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CampusExam.Infrastructure.Persistence.Configurations;

internal sealed class CauHinhMaTran : IEntityTypeConfiguration<MaTran>
{
    public void Configure(EntityTypeBuilder<MaTran> entity)
    {
        entity.ToTable("MATRAN", "dbo");

        entity.HasKey(x => x.MaMT).HasName("PK_MATRAN").IsClustered();

        entity.Property(x => x.MaMT).HasColumnName("MAMT").UseIdentityColumn();
        entity.Property(x => x.TenMT).HasColumnName("TENMT").HasColumnType("nvarchar(200)").HasMaxLength(200).IsRequired();
        entity.Property(x => x.TongSoCau).HasColumnName("TONGSOCAU");
        entity.Property(x => x.ThoiGianLam).HasColumnName("THOIGIANLAM");
        entity.Property(x => x.TrangThaiMaTran).HasColumnName("TRANGTHAIMATRAN").HasColumnType("tinyint");
        entity.Property(x => x.NgayTao).HasColumnName("NGAYTAO");
        entity.Property(x => x.NgayCapNhat).HasColumnName("NGAYCAPNHAT");
        entity.Property(x => x.PhienBan).HasColumnName("PHIENBAN").IsRowVersion();
    }
}

internal sealed class CauHinhCauTruc : IEntityTypeConfiguration<CauTruc>
{
    public void Configure(EntityTypeBuilder<CauTruc> entity)
    {
        entity.ToTable("CAU_TRUC", "dbo");

        entity.HasKey(x => new { x.MaMT, x.MaKQHT, x.MaMD }).HasName("PK_CAU_TRUC").IsClustered();
        entity.HasIndex(x => x.MaKQHT).HasDatabaseName("CAU_TRUC3_FK");

        entity.Property(x => x.MaMT).HasColumnName("MAMT");
        entity.Property(x => x.MaKQHT).HasColumnName("MAKQHT");
        entity.Property(x => x.MaMD).HasColumnName("MAMD").HasColumnType("tinyint");
        entity.Property(x => x.SoCau).HasColumnName("SOCAU");
        entity.Property(x => x.TyLe).HasColumnName("TYLE").HasColumnType("decimal(5,2)");

        // Không khai báo quan hệ EF: khóa ngoại tới MATRAN, KQHOCTAP, MUCDO do database thực thi.
    }
}

internal sealed class CauHinhDeGoc : IEntityTypeConfiguration<DeGoc>
{
    public void Configure(EntityTypeBuilder<DeGoc> entity)
    {
        entity.ToTable("DEGOC", "dbo");

        entity.HasKey(x => x.MaDe).HasName("PK_DEGOC").IsClustered();
        // Unique index thay vì alternate key để cập nhật được mã hiển thị sau khi có MADE.
        entity.HasIndex(x => x.MaDeGocHienThi).IsUnique().HasDatabaseName("AK_AK_DEGOC_MADEGOCHI_DEGOC");
        entity.HasIndex(x => x.MaMT).HasDatabaseName("BOC_TU_FK");
        entity.HasIndex(x => x.MaTK).HasDatabaseName("TAO_DE_FK");

        entity.Property(x => x.MaDe).HasColumnName("MADE").UseIdentityColumn();
        entity.Property(x => x.MaTK).HasColumnName("MTK");
        entity.Property(x => x.MaMT).HasColumnName("MAMT");
        entity.Property(x => x.MaDeGocHienThi).HasColumnName("MADEGOCHIENTHI").HasColumnType("varchar(30)").HasMaxLength(30).IsUnicode(false).IsRequired();
        entity.Property(x => x.TongSoCau).HasColumnName("TONGSOCAU");
        entity.Property(x => x.NgayTao).HasColumnName("NGAYTAO");
        entity.Property(x => x.HatGiong).HasColumnName("HATGIONG");
    }
}
