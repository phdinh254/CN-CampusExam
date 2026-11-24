import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { BieuTuong, type TenBieuTuong } from "../components/BieuTuong";
import { LogoCampusExam } from "../components/LogoCampusExam";
import { MenuTaiKhoan } from "../components/MenuTaiKhoan";
import { useXacThuc, useTaiKhoan } from "../features/xac-thuc/NhaCungCapXacThuc";
import { chuCaiDau, DUONG_DAN_DOI_MAT_KHAU } from "../features/xac-thuc/tienIchXacThuc";
import "../styles/cong-thi-sinh.css";

type MucMenu = { label: string; to: string };
type NhomMenu = { tieuDe: string; icon: TenBieuTuong; muc: MucMenu[] };

// Nhóm theo quy trình nghiệp vụ: câu hỏi → đề thi → kỳ thi → kết quả.
const nhomMenu: NhomMenu[] = [
  {
    tieuDe: "Ngân hàng câu hỏi",
    icon: "book",
    muc: [
      { label: "Danh mục KQHT", to: "/admin/learning-outcomes" },
      { label: "Danh sách câu hỏi", to: "/admin/questions" },
    ],
  },
  {
    tieuDe: "Xây dựng đề thi",
    icon: "layers",
    muc: [
      { label: "Ma trận đề", to: "/admin/exam-matrices" },
      { label: "Sinh đề thi", to: "/admin/exam-generation" },
      { label: "Danh sách đề thi", to: "/admin/exam-papers" },
    ],
  },
  {
    tieuDe: "Tổ chức kỳ thi",
    icon: "calendar",
    muc: [
      { label: "Quản lý kỳ thi", to: "/admin/exams" },
      { label: "Gán đề và thí sinh", to: "/admin/exam-assignments" },
      { label: "Theo dõi thi", to: "/admin/exam-monitoring" },
    ],
  },
  {
    tieuDe: "Quản lý và báo cáo",
    icon: "users",
    muc: [
      { label: "Thí sinh", to: "/admin/candidates" },
      { label: "Báo cáo kết quả", to: "/admin/reports" },
    ],
  },
];

function MucCon({ item }: { item: MucMenu }) {
  return (
    <NavLink to={item.to}>{item.label}</NavLink>
  );
}

export default function BoCucQuanTri() {
  const taiKhoan = useTaiKhoan();
  const { dangXuat } = useXacThuc();
  const location = useLocation();
  const [nhomMo, setNhomMo] = useState<string | null>(null);
  const navRef = useRef<HTMLUListElement>(null);

  const thuocNhom = (nhom: NhomMenu) => nhom.muc.some((m) => location.pathname === m.to || location.pathname.startsWith(`${m.to}/`));

  // Đóng menu con khi chuyển trang, bấm ra ngoài hoặc nhấn Escape.
  useEffect(() => setNhomMo(null), [location.pathname]);
  useEffect(() => {
    if (!nhomMo) return undefined;
    const dong = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !navRef.current?.contains(event.target as Node)) {
        setNhomMo(null);
      }
    };
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", dong);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", dong);
    };
  }, [nhomMo]);

  return (
    <div className="admin-shell">
      <header className="cand-header">
        <div className="cand-topbar">
          <Link aria-label="CampusExam — về trang tổng quan" className="cand-brand" to="/admin">
            <LogoCampusExam className="cand-logo" nen="toi" size={36} />
            <span className="cand-brand-text">
              <strong>Campus<em className="brand-exam">Exam</em></strong>
              <span>Hệ thống tổ chức thi trắc nghiệm</span>
            </span>
          </Link>

          <MenuTaiKhoan
            chuCai={chuCaiDau(taiKhoan.hoTen)}
            dongPhu={`Quản trị viên · ${taiKhoan.tenDN}`}
            hoTen={taiKhoan.hoTen}
            muc={[{ to: DUONG_DAN_DOI_MAT_KHAU, nhan: "Đổi mật khẩu", icon: "lock" }]}
            onDangXuat={() => void dangXuat()}
          />
        </div>

        <nav aria-label="Điều hướng quản trị" className="cand-navbar">
          <ul ref={navRef}>
            <li><NavLink end to="/admin"><BieuTuong name="dashboard" size={16} /> Tổng quan</NavLink></li>
            {nhomMenu.map((nhom) => {
              const id = `menu-${nhom.muc[0].to.split("/").pop()}`;
              const mo = nhomMo === nhom.tieuDe;
              return (
                <li className="cand-nav-dropdown" key={nhom.tieuDe}>
                  <button
                    aria-controls={id}
                    aria-expanded={mo}
                    className={thuocNhom(nhom) ? "active" : undefined}
                    onClick={() => setNhomMo(mo ? null : nhom.tieuDe)}
                    type="button"
                  >
                    <BieuTuong name={nhom.icon} size={16} /> {nhom.tieuDe} <span aria-hidden="true" className="cand-caret"><BieuTuong name="chevron-down" size={15} /></span>
                  </button>
                  {mo && <div className="cand-submenu" id={id}>{nhom.muc.map((item) => <MucCon item={item} key={item.to} />)}</div>}
                </li>
              );
            })}
            {/* Điện thoại: thanh cuộn ngang sẽ cắt dropdown, nên hiện thẳng các mục con. */}
            {nhomMenu.flatMap((nhom) => nhom.muc).map((item) => <li className="cand-nav-flat" key={item.to}><MucCon item={item} /></li>)}
          </ul>
        </nav>
      </header>
      <main className="admin-content"><Outlet /></main>
    </div>
  );
}
