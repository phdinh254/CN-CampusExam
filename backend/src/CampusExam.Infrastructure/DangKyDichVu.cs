using CampusExam.Application.QuanTriVien;
using CampusExam.Application.XacThuc;
using CampusExam.Application.CauHoi;
using CampusExam.Application.Common;
using CampusExam.Infrastructure.Services;
using CampusExam.Application.Interfaces.Security;
using CampusExam.Application.Kqht;
using CampusExam.Application.MucDo;
using CampusExam.Application.NhapCauHoi;
using CampusExam.Application.NhapThiSinh;
using CampusExam.Application.ThiSinh;
using CampusExam.Infrastructure.Commands;
using CampusExam.Infrastructure.Imports;
using CampusExam.Infrastructure.Persistence;
using CampusExam.Infrastructure.Queries;
using CampusExam.Infrastructure.Security;
using Microsoft.Extensions.DependencyInjection;

namespace CampusExam.Infrastructure;

public static class DangKyDichVu
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddScoped<IDichVuLenhKqht, EfDichVuLenhKqht>();
        services.AddScoped<ITruyXuatKqht, EfTruyXuatKqht>();
        services.AddScoped<ITruyXuatCauHoi, EfTruyXuatCauHoi>();
        services.AddScoped<IDichVuLenhCauHoi, EfDichVuLenhCauHoi>();
        services.AddScoped<ITruyXuatThiSinh, EfTruyXuatThiSinh>();
        services.AddScoped<IDichVuLenhThiSinh, EfDichVuLenhThiSinh>();
        services.AddScoped<IDichVuNhapCauHoi, EfDichVuNhapCauHoi>();
        services.AddScoped<IDichVuNhapThiSinh, EfDichVuNhapThiSinh>();
        services.AddScoped<ITruyXuatMucDo, EfTruyXuatMucDo>();
        services.AddSingleton<IBoDocDocxCauHoi>(new BoDocDocxCauHoiOpenXml(GioiHanTepDocx.MacDinh));
        services.AddSingleton<IBamMatKhau, BamMatKhauAspNet>();
        services.AddScoped<IDichVuQuanTriDauTien, EfDichVuQuanTriDauTien>();
        services.AddScoped<IDichVuXacThuc, EfDichVuXacThuc>();
        services.AddScoped<IKiemTraTinhTrang, EfKiemTraTinhTrang>();
        services.AddSingleton(TimeProvider.System);
        services.AddMemoryCache();

        return services;
    }
}
