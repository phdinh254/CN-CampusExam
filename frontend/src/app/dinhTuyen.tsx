import { createBrowserRouter, Navigate } from "react-router-dom";

import TongQuanQuanTri from "../features/quan-tri/TongQuanQuanTri";
import TrangKyThi from "../features/ky-thi/TrangKyThi";
import TrangNganHangCauHoi from "../features/ngan-hang-cau-hoi/TrangNganHangCauHoi";
import TrangQuanLyThiSinh from "../features/thi-sinh/TrangQuanLyThiSinh";
import TrangNhapThiSinh from "../features/thi-sinh/TrangNhapThiSinh";
import TrangKetQuaHocTap from "../features/ket-qua-hoc-tap/TrangKetQuaHocTap";
import TrangNhapCauHoi from "../features/ngan-hang-cau-hoi/TrangNhapCauHoi";
import TrangMucDo from "../features/ngan-hang-cau-hoi/TrangMucDo";
import TrangChuaTrienKhai from "../features/quan-tri/TrangChuaTrienKhai";
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

export const boDinhTuyen = createBrowserRouter([
  { path: "/", element: <ChuyenVeTrangChu /> },
  { path: "/login", element: <TrangDangNhap /> },
  {
    element: <YeuCauVaiTro />,
    children: [{ path: "/doi-mat-khau", element: <TrangDoiMatKhau /> }],
  },
  {
    element: <YeuCauVaiTro vaiTro="ADMIN" />,
    children: [
      {
        path: "/admin",
        element: <BoCucQuanTri />,
        children: [
          { index: true, element: <TongQuanQuanTri /> },
          { path: "learning-outcomes", element: <TrangKetQuaHocTap /> },
          { path: "questions", element: <TrangNganHangCauHoi /> },
          { path: "questions/import", element: <TrangNhapCauHoi /> },
          { path: "levels", element: <TrangMucDo /> },
          { path: "exam-matrices", element: <TrangChuaTrienKhai bieuTuong="layers" moTa="Quy định số câu theo KQHT và mức độ cho từng đề thi." tieuDe="Ma trận đề" /> },
          { path: "exam-generation", element: <TrangChuaTrienKhai bieuTuong="sparkles" moTa="Sinh đề gốc từ ma trận và hoán vị thành các đề con." tieuDe="Sinh đề thi" /> },
          { path: "exam-papers", element: <TrangChuaTrienKhai bieuTuong="file" moTa="Đề gốc, đề con và trạng thái sử dụng trong kỳ thi." tieuDe="Danh sách đề thi" /> },
          { path: "exams", element: <TrangKyThi /> },
          { path: "exam-assignments", element: <TrangChuaTrienKhai bieuTuong="users" moTa="Gán đề và phân công thí sinh, số máy cho từng kỳ thi." tieuDe="Gán đề và thí sinh" /> },
          { path: "exam-monitoring", element: <TrangChuaTrienKhai bieuTuong="activity" moTa="Theo dõi thí sinh đang làm bài, đã nộp và vắng thi theo thời gian thực." tieuDe="Theo dõi thi" /> },
          { path: "candidates", element: <TrangQuanLyThiSinh /> },
          { path: "candidates/import", element: <TrangNhapThiSinh /> },
          { path: "reports", element: <TrangChuaTrienKhai bieuTuong="activity" moTa="Điểm, tỷ lệ hoàn thành và thống kê theo kỳ thi, lớp, KQHT." tieuDe="Báo cáo kết quả" /> },
          { path: "settings", element: <TrangChuaTrienKhai bieuTuong="lock" moTa="Tham số đăng nhập, thời gian phiên và chính sách hiển thị điểm." tieuDe="Cài đặt hệ thống" /> },
          { path: "students", element: <Navigate to="/admin/candidates" replace /> },
          { path: "*", element: <Navigate to="/admin" replace /> },
        ],
      },
    ],
  },
  {
    element: <YeuCauVaiTro vaiTro="THISINH" />,
    children: [
      {
        path: "/candidate",
        element: <BoCucThiSinh />,
        children: [
          { index: true, element: <TongQuanThiSinh /> },
          { path: "thi", element: <Navigate to="/candidate/thi/tham-gia" replace /> },
          { path: "thi/tham-gia", element: <TrangVaoThi /> },
          { path: "thi/ket-qua", element: <TrangKetQuaThi /> },
          { path: "thi/lich-su", element: <TrangLichSuThi /> },
          { path: "thi/:maKT", element: <TrangChiTietKyThi /> },
          { path: "tai-khoan", element: <TrangTaiKhoan /> },
          { path: "*", element: <Navigate to="/candidate" replace /> },
        ],
      },
      {
        path: "/exam",
        element: <BoCucPhongThi />,
        children: [
          { index: true, element: <Navigate to="session" replace /> },
          { path: "session", element: <TrangLamBai /> },
        ],
      },
    ],
  },
  { path: "/student/*", element: <Navigate to="/candidate" replace /> },
  { path: "*", element: <ChuyenVeTrangChu /> },
]);
