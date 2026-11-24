using CampusExam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CampusExam.Infrastructure.Persistence.Configurations;

internal sealed class CauHinhDeCon : IEntityTypeConfiguration<DeCon>
{
    public void Configure(EntityTypeBuilder<DeCon> entity)
    {
        entity.ToTable("DECON", "dbo");

        entity.HasKey(x => x.MaDeCon).HasName("PK_DECON").IsClustered();
        entity.HasAlternateKey(x => new { x.MaDe, x.TenDeCon }).HasName("AK_AK_DECON_DEGOC_TEN_DECON");

        entity.Property(x => x.MaDeCon).HasColumnName("MADECON").UseIdentityColumn();
        entity.Property(x => x.MaDe).HasColumnName("MADE");
        entity.Property(x => x.TenDeCon).HasColumnName("TENDECON").HasColumnType("nvarchar(10)").HasMaxLength(10).IsRequired();
        entity.Property(x => x.NgayTao).HasColumnName("NGAYTAO");
    }
}

internal sealed class CauHinhHoanVi : IEntityTypeConfiguration<HoanVi>
{
    public void Configure(EntityTypeBuilder<HoanVi> entity)
    {
        entity.ToTable("HOAN_VI", "dbo");

        entity.HasKey(x => new { x.MaDeCon, x.MaCH }).HasName("PK_HOAN_VI").IsClustered();
        entity.HasAlternateKey(x => new { x.MaDeCon, x.TtCau }).HasName("AK_AK_HOANVI_DECON_TH_HOAN_VI");

        entity.Property(x => x.MaCH).HasColumnName("MACH");
        entity.Property(x => x.MaDeCon).HasColumnName("MADECON");
        entity.Property(x => x.TtCau).HasColumnName("TTCAU");
        entity.Property(x => x.TtDapAn).HasColumnName("TTDAPAN").HasColumnType("char(4)").HasMaxLength(4).IsFixedLength().IsUnicode(false).IsRequired();
        entity.Property(x => x.DapAnDungHienThi).HasColumnName("DAPANDUNGHIENTHI").HasColumnType("char(1)").HasMaxLength(1).IsFixedLength().IsUnicode(false).IsRequired();
        entity.Property(x => x.MaDe).HasColumnName("MADE");
    }
}

internal sealed class CauHinhTaiNguyenGomCau : IEntityTypeConfiguration<TaiNguyenGomCau>
{
    public void Configure(EntityTypeBuilder<TaiNguyenGomCau> entity)
    {
        entity.ToTable("TAINGUYEN_GOMCAU", "dbo");

        entity.HasKey(x => new { x.MaDe, x.MaCH, x.ViTri, x.ThuTu }).HasName("PK_TAINGUYEN_GOMCAU").IsClustered();

        entity.Property(x => x.MaDe).HasColumnName("MADE");
        entity.Property(x => x.MaCH).HasColumnName("MACH");
        entity.Property(x => x.ViTri).HasColumnName("VITRI").HasColumnType("varchar(10)").HasMaxLength(10).IsUnicode(false).IsRequired();
        entity.Property(x => x.ThuTu).HasColumnName("THUTU").HasColumnType("smallint");
        entity.Property(x => x.TenFile).HasColumnName("TENFILE").HasColumnType("nvarchar(255)").HasMaxLength(255).IsRequired();
        entity.Property(x => x.StorageKey).HasColumnName("STORAGEKEY").HasColumnType("varchar(500)").HasMaxLength(500).IsUnicode(false).IsRequired();
        entity.Property(x => x.MimeType).HasColumnName("MIMETYPE").HasColumnType("varchar(100)").HasMaxLength(100).IsUnicode(false).IsRequired();
        entity.Property(x => x.AltText).HasColumnName("ALTTEXT").HasColumnType("nvarchar(500)").HasMaxLength(500);
    }
}

internal sealed class CauHinhKyThi : IEntityTypeConfiguration<KyThi>
{
    public void Configure(EntityTypeBuilder<KyThi> entity)
    {
        entity.ToTable("KYTHI", "dbo");

        entity.HasKey(x => x.MaKT).HasName("PK_KYTHI").IsClustered();
        entity.HasIndex(x => x.MaDe).HasDatabaseName("UX_KYTHI_MADE").IsUnique().HasFilter("[MADE] IS NOT NULL");

        entity.Property(x => x.MaKT).HasColumnName("MAKT").UseIdentityColumn();
        entity.Property(x => x.MaTK).HasColumnName("MTK");
        entity.Property(x => x.MaDe).HasColumnName("MADE");
        entity.Property(x => x.TenKT).HasColumnName("TENKT").HasColumnType("nvarchar(200)").HasMaxLength(200).IsRequired();
        entity.Property(x => x.MonThi).HasColumnName("MONTHI").HasColumnType("nvarchar(200)").HasMaxLength(200).IsRequired();
        entity.Property(x => x.TgBatDau).HasColumnName("TGBATDAU");
        entity.Property(x => x.ThoiLuong).HasColumnName("THOILUONG");
        entity.Property(x => x.HienDiem).HasColumnName("HIENDIEM");
        entity.Property(x => x.CachPhanDe).HasColumnName("CACHPHANDE");
        entity.Property(x => x.TrangThaiKyThi).HasColumnName("TRANGTHAIKYTHI");
        entity.Property(x => x.NgayTao).HasColumnName("NGAYTAO");
        entity.Property(x => x.NgayPhatHanh).HasColumnName("NGAYPHATHANH");
        entity.Property(x => x.SoPhutChoVaoTre).HasColumnName("SOPHUTCHOVAOTRE");
        entity.Property(x => x.ChoXemLai).HasColumnName("CHOXEMLAI");
        entity.Property(x => x.PhienBan).HasColumnName("PHIENBAN").IsRowVersion();
    }
}
