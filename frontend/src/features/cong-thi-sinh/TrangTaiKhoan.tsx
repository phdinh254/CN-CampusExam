import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { HoSoCaNhan } from "../../types/api";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";
import { chuCaiDau, DUONG_DAN_DOI_MAT_KHAU } from "../xac-thuc/tienIchXacThuc";
import { GIOI_TINH, dinhDangNgaySinh } from "../thi-sinh/bieuMauThiSinh";
import { toiApi } from "./api";

/**
 * Tài khoản cá nhân của thí sinh: thẻ định danh, thông tin cá nhân (chỉ xem)
 * và bảo mật tài khoản (đổi mật khẩu).
 */
export default function TrangTaiKhoan() {
  const taiKhoan = useTaiKhoan();
  const [hoSo, setHoSo] = useState<HoSoCaNhan | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    toiApi.hoSo(controller.signal)
      .then((duLieu) => { setHoSo(duLieu); setLoi(null); })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoi(error instanceof LoiApiHttp ? error.message : "Không thể kết nối máy chủ. Vui lòng thử lại.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const hoTen = hoSo?.hoTen ?? taiKhoan.hoTen;
  const thongTin: [string, string | null | undefined][] = hoSo
    ? [
        ["Ngày sinh", dinhDangNgaySinh(hoSo.ngaySinh)],
        ["Giới tính", hoSo.gioiTinh ? GIOI_TINH[hoSo.gioiTinh] : null],
        ["Lớp", hoSo.lop],
        ["Nơi sinh", hoSo.noiSinh],
        ["Số CCCD", hoSo.cccd],
      ]
    : [];

  return (
    <div className="student-dashboard">
      <section className="cand-page-head">
        <h1>Tài khoản cá nhân</h1>
        <p>Hồ sơ và mật khẩu đăng nhập.</p>
      </section>

      {/* Thẻ định danh: chữ cái đầu, họ tên, mã số thí sinh, lớp. */}
      <section className="panel cand-id-card">
        <span aria-hidden="true" className="cand-id-avatar">{chuCaiDau(hoTen)}</span>
        <div className="cand-id-main">
          <h2>{hoTen}</h2>
          <div className="cand-id-tags">
            <span><BieuTuong name="users" size={15} /> Mã số thí sinh: <strong>{taiKhoan.msts}</strong></span>
            {hoSo?.lop && <span><BieuTuong name="book" size={15} /> Lớp: <strong>{hoSo.lop}</strong></span>}
          </div>
        </div>
      </section>

      <div className="cand-account-layout">
        <section className="panel">
          <div className="panel-heading"><div><h3>Thông tin cá nhân</h3></div></div>
          {loi ? (
            <div className="empty-state error-state">
              <BieuTuong name="alert" size={28} />
              <strong>Chưa tải được hồ sơ</strong>
              <span>{loi}</span>
              <button className="cand-btn cand-btn-outline" onClick={() => setReloadKey((value) => value + 1)} type="button">Thử lại</button>
            </div>
          ) : !hoSo ? (
            <div aria-label="Đang tải hồ sơ" className="outcomes-loading">{[1, 2, 3].map((item) => <span key={item} />)}</div>
          ) : (
            <dl className="cand-facts">
              {thongTin.map(([nhan, giaTri]) => (
                <div key={nhan}><dt>{nhan}</dt><dd>{giaTri || <span className="muted-cell">Chưa khai báo</span>}</dd></div>
              ))}
            </dl>
          )}
        </section>

        <section className="panel cand-security">
          <div className="panel-heading"><div><h3>Bảo mật tài khoản</h3></div></div>
          <dl className="cand-facts">
            <div><dt>Tên đăng nhập</dt><dd>{taiKhoan.msts}</dd></div>
            <div><dt>Mật khẩu</dt><dd aria-label="Đã ẩn">••••••••</dd></div>
          </dl>
          <div className="cand-security-foot">
            <Link className="cand-btn cand-btn-primary" to={DUONG_DAN_DOI_MAT_KHAU}><BieuTuong name="lock" size={16} /> Đổi mật khẩu</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
