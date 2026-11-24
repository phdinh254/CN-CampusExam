using CampusExam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CampusExam.Infrastructure.Persistence.Configurations;

internal sealed class CauHinhPhanCongThi : IEntityTypeConfiguration<PhanCongThi>
{
    public void Configure(EntityTypeBuilder<PhanCongThi> entity)
    {
        entity.ToTable("PHANCONGTHI", "dbo");

        entity.HasKey(x => x.MaPhanCong).HasName("PK_PHANCONGTHI");
        entity.HasIndex(x => x.Msts).HasDatabaseName("PHAN_CONG_THI_SINH_FK");

        entity.Property(x => x.MaPhanCong).HasColumnName("MAPHANCONG").UseIdentityColumn();
        entity.Property(x => x.MaKT).HasColumnName("MAKT");
        entity.Property(x => x.Msts).HasColumnName("MSTS").HasColumnType("varchar(20)").HasMaxLength(20).IsUnicode(false);
        entity.Property(x => x.MaDeCon).HasColumnName("MADECON");
        entity.Property(x => x.SoMay).HasColumnName("SOMAY").HasColumnType("varchar(10)").HasMaxLength(10).IsUnicode(false);
        entity.Property(x => x.MaDe).HasColumnName("MADE");
    }
}

internal sealed class CauHinhBaiLam : IEntityTypeConfiguration<BaiLam>
{
    public void Configure(EntityTypeBuilder<BaiLam> entity)
    {
        entity.ToTable("BAILAM", "dbo");

        entity.HasKey(x => x.MaBL).HasName("PK_BAILAM");

        entity.Property(x => x.MaBL).HasColumnName("MABL").UseIdentityColumn();
        entity.Property(x => x.MaPhanCong).HasColumnName("MAPHANCONG");
        entity.Property(x => x.TrangThaiBaiLam).HasColumnName("TRANGTHAIBAILAM");
        entity.Property(x => x.TgBatDau).HasColumnName("TGBATDAU");
        entity.Property(x => x.PhutCongThem).HasColumnName("PHUTCONGTHEM");
        entity.Property(x => x.TgNop).HasColumnName("TGNOP");
        entity.Property(x => x.SoCauDung).HasColumnName("SOCAUDUNG");
        entity.Property(x => x.Diem).HasColumnName("DIEM").HasColumnType("decimal(4,2)");
        entity.Property(x => x.LanHdCuoi).HasColumnName("LANHDCUOI");
        entity.Property(x => x.DiaChiIP).HasColumnName("DIACHIIP").HasColumnType("varchar(45)").HasMaxLength(45).IsUnicode(false);
        entity.Property(x => x.MaDeCon).HasColumnName("MADECON");
        entity.Property(x => x.PhienBan).HasColumnName("PHIENBAN").IsRowVersion();
        entity.HasIndex(x => x.MaPhanCong).IsUnique().HasDatabaseName("AK_AK_BAILAM_PHANCONG_BAILAM");
    }
}

internal sealed class CauHinhTraLoi : IEntityTypeConfiguration<TraLoi>
{
    public void Configure(EntityTypeBuilder<TraLoi> entity)
    {
        entity.ToTable("TRA_LOI", "dbo");

        entity.HasKey(x => new { x.MaBL, x.MaCH }).HasName("PK_TRA_LOI").IsClustered();

        entity.Property(x => x.MaCH).HasColumnName("MACH");
        entity.Property(x => x.MaBL).HasColumnName("MABL");
        entity.Property(x => x.DapAnChon).HasColumnName("DAPANCHON").HasColumnType("char(1)").HasMaxLength(1).IsFixedLength().IsUnicode(false);
        entity.Property(x => x.DanhDau).HasColumnName("DANHDAU");
        entity.Property(x => x.LaDung).HasColumnName("LADUNG");
        entity.Property(x => x.ThoiGianChon).HasColumnName("THOIGIANCHON");
        entity.Property(x => x.MaDeCon).HasColumnName("MADECON");
    }
}
