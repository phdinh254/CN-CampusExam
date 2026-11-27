import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { BieuTuong } from "../components/BieuTuong";
import { LogoCampusExam } from "../components/LogoCampusExam";
import { MenuTaiKhoan } from "../components/MenuTaiKhoan";
import { useXacThuc, useTaiKhoan } from "../features/xac-thuc/NhaCungCapXacThuc";
import { chuCaiDau, DUONG_DAN_DOI_MAT_KHAU } from "../features/xac-thuc/tienIchXacThuc";
import "../styles/cong-thi-sinh.css";

/**
 * Menu cổng thí sinh: Trang chủ · Thi trực tuyến. Tài khoản cá nhân mở từ menu avatar trên header. Chi tiết kỳ thi và xác nhận
 * dự thi mở từ danh sách kỳ thi được phân công, không có mục menu riêng.
 */
const thiTrucTuyen = [
  { label: "Kỳ thi được phân công", to: "/thi-sinh/thi/tham-gia" },
  { label: "Kết quả thi", to: "/thi-sinh/thi/ket-qua" },
  { label: "Lịch sử thi", to: "/thi-sinh/thi/lich-su" },
];

export default function BoCucThiSinh() {
  const taiKhoan = useTaiKhoan();
  const { dangXuat } = useXacThuc();
  const location = useLocation();
  const [moMenuThi, setMoMenuThi] = useState(false);
  const menuThiRef = useRef<HTMLLIElement>(null);
  const dangOTrangThi = location.pathname.startsWith("/thi-sinh/thi");

  // Đóng menu con khi chuyển trang, bấm ra ngoài hoặc nhấn Escape.
  useEffect(() => setMoMenuThi(false), [location.pathname]);
  useEffect(() => {
    if (!moMenuThi) return undefined;
    const dong = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !menuThiRef.current?.contains(event.target as Node)) {
        setMoMenuThi(false);
      }
    };
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", dong);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", dong);
    };
  }, [moMenuThi]);

  return (
    <div className="student-shell">
      {/* Dải hero: logo và tên đồ án trên cùng, thanh điều hướng ngay bên dưới. */}
      <header className="cand-header">
        <div className="cand-topbar">
          <Link aria-label="CampusExam — về trang chủ" className="cand-brand" to="/thi-sinh">
            <LogoCampusExam className="cand-logo" nen="toi" size={36} />
            <span className="cand-brand-text">
              <strong>Campus<em className="brand-exam">Exam</em></strong>
            </span>
          </Link>

          <MenuTaiKhoan
            chuCai={chuCaiDau(taiKhoan.hoTen)}
            dongPhu={`Mã số thí sinh: ${taiKhoan.msts}`}
            hoTen={taiKhoan.hoTen}
            muc={[
              { to: "/thi-sinh/tai-khoan", nhan: "Tài khoản cá nhân", icon: "users" },
              { to: DUONG_DAN_DOI_MAT_KHAU, nhan: "Đổi mật khẩu", icon: "lock" },
            ]}
            onDangXuat={() => void dangXuat()}
          />
        </div>

        {/* Thanh điều hướng ngang: các mục ngăn bằng vạch dọc mảnh, không bo góc. */}
        <nav aria-label="Điều hướng thí sinh" className="cand-navbar">
          <ul>
            <li><NavLink end to="/thi-sinh"><BieuTuong name="home" size={16} /> Trang chủ</NavLink></li>
            <li className="cand-nav-dropdown" ref={menuThiRef}>
              <button
                aria-controls="menu-thi-truc-tuyen"
                aria-expanded={moMenuThi}
                className={dangOTrangThi ? "active" : undefined}
                onClick={() => setMoMenuThi((value) => !value)}
                type="button"
              >
                <BieuTuong name="file" size={16} /> Thi trực tuyến <span aria-hidden="true" className="cand-caret"><BieuTuong name="chevron-down" size={15} /></span>
              </button>
              {moMenuThi && (
                <div className="cand-submenu" id="menu-thi-truc-tuyen">
                  {thiTrucTuyen.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
                </div>
              )}
            </li>
            {/* Điện thoại: thanh cuộn ngang sẽ cắt dropdown, nên hiện thẳng các mục con. */}
            {thiTrucTuyen.map((item) => <li className="cand-nav-flat" key={item.to}><NavLink to={item.to}>{item.label}</NavLink></li>)}
          </ul>
        </nav>
      </header>
      <main className="student-content"><Outlet /></main>
    </div>
  );
}
