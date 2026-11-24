using CampusExam.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CampusExam.Infrastructure.Persistence.Configurations;

internal sealed class CauHinhCauHoi : IEntityTypeConfiguration<CauHoi>
{
    public void Configure(EntityTypeBuilder<CauHoi> entity)
    {
        entity.ToTable("CAUHOI", "dbo");

        entity.HasKey(x => x.MaCH).HasName("PK_CAUHOI").IsClustered();
        entity.HasAlternateKey(x => x.MaCauHoi).HasName("AK_AK_CAUHOI_MACAUHOI_CAUHOI");
        entity.HasAlternateKey(x => new { x.MaKQHT, x.MaMD, x.Stt }).HasName("AK_AK_CAUHOI_KQHT_MUC_CAUHOI");
        entity.HasIndex(x => x.MaMD).HasDatabaseName("CO_MUC_DO_FK");
        entity.HasIndex(x => x.MaLanImport).HasDatabaseName("NHAP_TU_FK");

        entity.Property(x => x.MaCH).HasColumnName("MACH").UseIdentityColumn();
        entity.Property(x => x.MaLanImport).HasColumnName("MALANIMPORT");
        entity.Property(x => x.MaMD).HasColumnName("MAMD").HasColumnType("tinyint");
        entity.Property(x => x.MaKQHT).HasColumnName("MAKQHT");
        entity.Property(x => x.Stt).HasColumnName("STT");
        entity.Property(x => x.NoiDung).HasColumnName("NOIDUNG").HasColumnType("nvarchar(4000)").HasMaxLength(4000).IsRequired();
        entity.Property(x => x.DaA).HasColumnName("DAA").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.DaB).HasColumnName("DAB").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.DaC).HasColumnName("DAC").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.DaD).HasColumnName("DAD").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.DapAnDung).HasColumnName("DAPANDUNG").HasColumnType("char(1)").HasMaxLength(1).IsFixedLength().IsUnicode(false).IsRequired();
        entity.Property(x => x.CoDinhDa).HasColumnName("CODINHDA").HasColumnType("smallint");
        entity.Property(x => x.TrangThai).HasColumnName("TRANGTHAI").HasColumnType("smallint");
        entity.Property(x => x.NgayTao).HasColumnName("NGAYTAO");
        entity.Property(x => x.NgayCapNhat).HasColumnName("NGAYCAPNHAT");
        entity.Property(x => x.MaCauHoi).HasColumnName("MACAUHOI").HasColumnType("varchar(20)").HasMaxLength(20).IsUnicode(false).IsRequired();
        entity.Property(x => x.KyHieu).HasColumnName("KYHIEU").HasColumnType("char(1)").HasMaxLength(1).IsFixedLength().IsUnicode(false).IsRequired();
        entity.Property(x => x.PhienBan).HasColumnName("PHIENBAN").IsRowVersion();

        // Không khai báo quan hệ EF: khóa ngoại (MAMD), (MAKQHT, KYHIEU) do database thực thi,
        // truy vấn dùng join tường minh.
    }
}

internal sealed class CauHinhGomCau : IEntityTypeConfiguration<GomCau>
{
    public void Configure(EntityTypeBuilder<GomCau> entity)
    {
        entity.ToTable("GOM_CAU", "dbo");

        entity.HasKey(x => new { x.MaDe, x.MaCH }).HasName("PK_GOM_CAU");
        entity.HasAlternateKey(x => new { x.MaDe, x.ThuTuTrongDeGoc }).HasName("AK_AK_GOMCAU_DEGOC_TH_GOM_CAU");
        entity.HasIndex(x => x.MaCH).HasDatabaseName("GOM_CAU2_FK");

        entity.Property(x => x.MaDe).HasColumnName("MADE");
        entity.Property(x => x.MaCH).HasColumnName("MACH");
        entity.Property(x => x.ThuTuTrongDeGoc).HasColumnName("THUTUTRONGDEGOC");
        entity.Property(x => x.NoiDung).HasColumnName("NOIDUNGTAILUCTAO").HasColumnType("nvarchar(4000)").HasMaxLength(4000).IsRequired();
        entity.Property(x => x.PhuongAnA).HasColumnName("PHUONGANATAILUCTAO").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.PhuongAnB).HasColumnName("PHUONGANBTAILUCTAO").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.PhuongAnC).HasColumnName("PHUONGANCTAILUCTAO").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.PhuongAnD).HasColumnName("PHUONGANDTAILUCTAO").HasColumnType("nvarchar(1000)").HasMaxLength(1000).IsRequired();
        entity.Property(x => x.DapAnDungGoc).HasColumnName("DAPANDUNGGOC").HasColumnType("char(1)").HasMaxLength(1).IsFixedLength().IsUnicode(false).IsRequired();
    }
}
