import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { phienXacThuc } from "../../services/phienXacThuc";
import type { DangNhapRequest, DoiMatKhauRequest, PhienDangNhap, TaiKhoanHienTai } from "../../types/api";
import { xacThucApi } from "./api";

type TrangThaiPhien = "dang_tai" | "da_dang_nhap" | "chua_dang_nhap";

type AuthContextValue = {
  trangThai: TrangThaiPhien;
  taiKhoan: TaiKhoanHienTai | null;
  dangNhap: (body: DangNhapRequest) => Promise<TaiKhoanHienTai>;
  dangXuat: () => Promise<void>;
  doiMatKhau: (body: DoiMatKhauRequest) => Promise<TaiKhoanHienTai>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function NhaCungCapXacThuc({ children }: PropsWithChildren) {
  const [trangThai, setTrangThai] = useState<TrangThaiPhien>("dang_tai");
  const [taiKhoan, setTaiKhoan] = useState<TaiKhoanHienTai | null>(null);

  const apDungPhien = useCallback((phien: PhienDangNhap) => {
    phienXacThuc.setAccessToken(phien.accessToken);
    setTaiKhoan(phien.taiKhoan);
    setTrangThai("da_dang_nhap");
    return phien.taiKhoan;
  }, []);

  useEffect(() => {
    // khachHttp gọi handler này khi gặp 401; các lời gọi đồng thời dùng chung một request.
    phienXacThuc.setRefreshHandler(async () => {
      try {
        const phien = await xacThucApi.lamMoi();
        apDungPhien(phien);
        return phien.accessToken;
      } catch {
        return null;
      }
    });
    const huyLangNghe = phienXacThuc.onSessionExpired(() => {
      setTaiKhoan(null);
      setTrangThai("chua_dang_nhap");
    });

    // Tải lại trang: access token trong bộ nhớ đã mất, khôi phục bằng cookie refresh.
    void phienXacThuc.refresh();

    return () => {
      huyLangNghe();
      phienXacThuc.setRefreshHandler(null);
    };
  }, [apDungPhien]);

  const dangNhap = useCallback(
    async (body: DangNhapRequest) => apDungPhien(await xacThucApi.dangNhap(body)),
    [apDungPhien],
  );

  const doiMatKhau = useCallback(
    async (body: DoiMatKhauRequest) => apDungPhien(await xacThucApi.doiMatKhau(body)),
    [apDungPhien],
  );

  const dangXuat = useCallback(async () => {
    try {
      await xacThucApi.dangXuat();
    } finally {
      phienXacThuc.clear();
      setTaiKhoan(null);
      setTrangThai("chua_dang_nhap");
    }
  }, []);

  const value = useMemo(
    () => ({ trangThai, taiKhoan, dangNhap, dangXuat, doiMatKhau }),
    [trangThai, taiKhoan, dangNhap, dangXuat, doiMatKhau],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useXacThuc(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useXacThuc phải nằm trong NhaCungCapXacThuc.");
  return context;
}

/** Dùng trong layout đã được YeuCauVaiTro bảo vệ: chắc chắn đã đăng nhập. */
export function useTaiKhoan(): TaiKhoanHienTai {
  const { taiKhoan } = useXacThuc();
  if (!taiKhoan) throw new Error("useTaiKhoan chỉ dùng bên trong route đã đăng nhập.");
  return taiKhoan;
}
