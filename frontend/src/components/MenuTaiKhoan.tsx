import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong, type TenBieuTuong } from "./BieuTuong";

type MucTaiKhoan = { to: string; nhan: string; icon: TenBieuTuong };

type MenuTaiKhoanProps = {
  hoTen: string;
  /** Dòng phụ trong menu: vai trò hoặc mã số thí sinh. */
  dongPhu: string;
  chuCai: string;
  muc: MucTaiKhoan[];
  onDangXuat: () => void;
};

/**
 * Cụm tài khoản trên header: mặc định chỉ có avatar và mũi tên; nhấn vào mở menu có họ tên, dòng phụ,
 * các liên kết tài khoản và Đăng xuất. Đóng khi chọn một mục, bấm ra ngoài hoặc nhấn Escape.
 */
export function MenuTaiKhoan({ hoTen, dongPhu, chuCai, muc, onDangXuat }: MenuTaiKhoanProps) {
  const [mo, setMo] = useState(false);
  const vungRef = useRef<HTMLDivElement>(null);
  const nutRef = useRef<HTMLButtonElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!mo) return undefined;
    const dong = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setMo(false);
        nutRef.current?.focus();
        return;
      }
      if (!vungRef.current?.contains(event.target as Node)) setMo(false);
    };
    document.addEventListener("mousedown", dong);
    document.addEventListener("keydown", dong);
    return () => {
      document.removeEventListener("mousedown", dong);
      document.removeEventListener("keydown", dong);
    };
  }, [mo]);

  return (
    <div className="cand-user" ref={vungRef}>
      <button
        aria-controls={idMenu}
        aria-expanded={mo}
        aria-haspopup="menu"
        aria-label={`Tài khoản: ${hoTen}`}
        className="cand-user-btn"
        onClick={() => setMo((x) => !x)}
        ref={nutRef}
        title={hoTen}
        type="button"
      >
        <span aria-hidden="true" className="avatar avatar-teal">{chuCai}</span>
        <span aria-hidden="true" className="cand-caret"><BieuTuong name="chevron-down" size={15} /></span>
      </button>
      {mo && (
        <div className="cand-user-menu" id={idMenu} role="menu">
          <div className="cand-user-menu-head">
            <strong>{hoTen}</strong>
            <small>{dongPhu}</small>
          </div>
          {muc.map((m) => (
            <Link key={m.to} onClick={() => setMo(false)} role="menuitem" to={m.to}><BieuTuong name={m.icon} size={16} /> {m.nhan}</Link>
          ))}
          <button className="cand-user-menu-logout" onClick={onDangXuat} role="menuitem" type="button">
            <BieuTuong name="logout" size={16} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
