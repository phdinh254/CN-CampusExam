import { Navigate, Outlet, useLocation } from "react-router-dom";

import type { VaiTro } from "../../types/api";
import { useXacThuc } from "./NhaCungCapXacThuc";
import { trangChuTheoVaiTro } from "./tienIchXacThuc";

type Props = {
  /** Bỏ trống: chỉ cần đăng nhập. */
  vaiTro?: VaiTro;
};

export function ManHinhCho() {
  return (
    <div className="session-loading" role="status" aria-live="polite">
      <span className="session-spinner" aria-hidden="true" />
      <span>Đang kiểm tra phiên đăng nhập…</span>
    </div>
  );
}

export default function YeuCauVaiTro({ vaiTro }: Props) {
  const { trangThai, taiKhoan } = useXacThuc();
  const location = useLocation();

  if (trangThai === "dang_tai") return <ManHinhCho />;

  if (!taiKhoan) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname + location.search }} />;
  }

  if (vaiTro && taiKhoan.vaiTro !== vaiTro) {
    return <Navigate to={trangChuTheoVaiTro(taiKhoan.vaiTro)} replace />;
  }

  return <Outlet />;
}

/** "/" và đường dẫn lạ: về trang chủ của vai trò, hoặc trang đăng nhập. */
export function ChuyenVeTrangChu() {
  const { trangThai, taiKhoan } = useXacThuc();
  if (trangThai === "dang_tai") return <ManHinhCho />;
  return <Navigate to={taiKhoan ? trangChuTheoVaiTro(taiKhoan.vaiTro) : "/dang-nhap"} replace />;
}
