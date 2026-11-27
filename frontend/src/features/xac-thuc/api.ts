import { khachHttp } from "../../services/khachHttp";
import type { DangNhapRequest, DoiMatKhauRequest, PhienDangNhap } from "../../types/api";

/** Các lệnh dùng cookie refresh phải gửi header này (chống CSRF). */
const CSRF_HEADERS = { "X-CSRF": "1" };

export const xacThucApi = {
  dangNhap: (body: DangNhapRequest) =>
    khachHttp.post<PhienDangNhap>("/xac-thuc/dang-nhap", body, { skipAuth: true, credentials: "include" }),

  lamMoi: () =>
    khachHttp.post<PhienDangNhap>("/xac-thuc/lam-moi", undefined, {
      skipAuth: true,
      credentials: "include",
      headers: CSRF_HEADERS,
    }),

  dangXuat: () =>
    khachHttp.post<void>("/xac-thuc/dang-xuat", undefined, {
      skipAuth: true,
      credentials: "include",
      headers: CSRF_HEADERS,
    }),

  doiMatKhau: (body: DoiMatKhauRequest) =>
    khachHttp.post<PhienDangNhap>("/xac-thuc/doi-mat-khau", body, { credentials: "include" }),
};
