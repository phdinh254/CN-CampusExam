import { createBrowserRouter, Navigate } from "react-router-dom";

import TongQuanQuanTri from "../features/quan-tri/TongQuanQuanTri";
import TrangKyThi from "../features/ky-thi/TrangKyThi";
import TrangGanDeThiSinh from "../features/ky-thi/TrangGanDeThiSinh";
import TrangTheoDoiThi from "../features/ky-thi/TrangTheoDoiThi";
import TrangNganHangCauHoi from "../features/ngan-hang-cau-hoi/TrangNganHangCauHoi";
import TrangQuanLyThiSinh from "../features/thi-sinh/TrangQuanLyThiSinh";
import TrangNhapThiSinh from "../features/thi-sinh/TrangNhapThiSinh";
import TrangKetQuaHocTap from "../features/ket-qua-hoc-tap/TrangKetQuaHocTap";
import TrangNhapCauHoi from "../features/ngan-hang-cau-hoi/TrangNhapCauHoi";
import TrangMaTranDe from "../features/ma-tran-de/TrangMaTranDe";
import TrangSoanMaTran from "../features/ma-tran-de/TrangSoanMaTran";
import TrangSinhDe from "../features/de-thi/TrangSinhDe";
import TrangDanhSachDe from "../features/de-thi/TrangDanhSachDe";
import TrangXemDe from "../features/de-thi/TrangXemDe";
import TrangBaoCaoKetQua from "../features/bao-cao/TrangBaoCaoKetQua";
import TrangDoiMatKhau from "../features/xac-thuc/TrangDoiMatKhau";
import TrangDangNhap from "../features/xac-thuc/TrangDangNhap";
import YeuCauVaiTro, { ChuyenVeTrangChu } from "../features/xac-thuc/YeuCauVaiTro";
import TrangLamBai from "../features/phong-thi/TrangLamBai";
import TrangTaiKhoan from "../features/cong-thi-sinh/TrangTaiKhoan";
import { TrangChiTietKyThi, TrangKetQuaThi, TrangLichSuThi, TrangVaoThi } from "../features/cong-thi-sinh/TrangThiTrucTuyen";
import TongQuanThiSinh from "../features/cong-thi-sinh/TongQuanThiSinh";
import BoCucQuanTri from "../layouts/BoCucQuanTri";
import BoCucPhongThi from "../layouts/BoCucPhongThi";
import BoCucThiSinh from "../layouts/BoCucThiSinh";
import { useTaiKhoan } from "../features/xac-thuc/NhaCungCapXacThuc";

/** Trang dùng chung cho hai vai trò (đổi mật khẩu) nằm trong khung giao diện của vai trò đang đăng nhập. */
function BoCucTheoVaiTro() {
  return useTaiKhoan().vaiTro === "ADMIN" ? <BoCucQuanTri /> : <BoCucThiSinh />;
}

export const boDinhTuyen = createBrowserRouter([
  { path: "/", element: <ChuyenVeTrangChu /> },
  { path: "/dang-nhap", element: <TrangDangNhap /> },
  {
    element: <YeuCauVaiTro />,
    children: [{ path: "/doi-mat-khau", element: <BoCucTheoVaiTro />, children: [{ index: true, element: <TrangDoiMatKhau /> }] }],
  },
  {
    element: <YeuCauVaiTro vaiTro="ADMIN" />,
    children: [
      {
        path: "/quan-tri",
        element: <BoCucQuanTri />,
        children: [
          { index: true, element: <TongQuanQuanTri /> },
          { path: "ket-qua-hoc-tap", element: <TrangKetQuaHocTap /> },
          { path: "cau-hoi", element: <TrangNganHangCauHoi /> },
          { path: "cau-hoi/nhap", element: <TrangNhapCauHoi /> },
          { path: "ma-tran-de", element: <TrangMaTranDe /> },
          { path: "ma-tran-de/moi", element: <TrangSoanMaTran /> },
          { path: "ma-tran-de/:maMT", element: <TrangSoanMaTran /> },
          { path: "sinh-de", element: <TrangSinhDe /> },
          { path: "de-thi", element: <TrangDanhSachDe /> },
          { path: "de-thi/:maDe", element: <TrangXemDe /> },
          { path: "ky-thi", element: <TrangKyThi /> },
          { path: "phan-cong-thi", element: <TrangGanDeThiSinh /> },
          { path: "theo-doi-thi", element: <TrangTheoDoiThi /> },
          { path: "thi-sinh", element: <TrangQuanLyThiSinh /> },
          { path: "thi-sinh/nhap", element: <TrangNhapThiSinh /> },
          { path: "bao-cao", element: <TrangBaoCaoKetQua /> },
          { path: "*", element: <Navigate to="/quan-tri" replace /> },
        ],
      },
    ],
  },
  {
    element: <YeuCauVaiTro vaiTro="THISINH" />,
    children: [
      {
        path: "/thi-sinh",
        element: <BoCucThiSinh />,
        children: [
          { index: true, element: <TongQuanThiSinh /> },
          { path: "thi", element: <Navigate to="/thi-sinh/thi/tham-gia" replace /> },
          { path: "thi/tham-gia", element: <TrangVaoThi /> },
          { path: "thi/ket-qua", element: <TrangKetQuaThi /> },
          { path: "thi/lich-su", element: <TrangLichSuThi /> },
          { path: "thi/:maKT", element: <TrangChiTietKyThi /> },
          { path: "tai-khoan", element: <TrangTaiKhoan /> },
          { path: "*", element: <Navigate to="/thi-sinh" replace /> },
        ],
      },
      {
        path: "/phong-thi",
        element: <BoCucPhongThi />,
        children: [{ index: true, element: <TrangLamBai /> }],
      },
    ],
  },
  { path: "*", element: <ChuyenVeTrangChu /> },
]);
