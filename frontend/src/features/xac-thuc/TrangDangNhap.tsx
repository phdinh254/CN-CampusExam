import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { useXacThuc } from "./NhaCungCapXacThuc";
import { duongDanSauDangNhap, thongBaoLoiDangNhap } from "./tienIchXacThuc";
import { ManHinhCho } from "./YeuCauVaiTro";

type CheDo = "admin" | "candidate";

export default function TrangDangNhap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trangThai, taiKhoan, dangNhap } = useXacThuc();
  const [cheDo, setCheDo] = useState<CheDo>("admin");
  const [tenDN, setTenDN] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const trangYeuCau = (location.state as { from?: string } | null)?.from ?? null;

  if (trangThai === "dang_tai") return <ManHinhCho />;
  if (taiKhoan) return <Navigate to={duongDanSauDangNhap(taiKhoan, trangYeuCau)} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!tenDN.trim() || !matKhau) {
      setLoi("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setDangGui(true);
    setLoi(null);
    try {
      const daDangNhap = await dangNhap({ tenDN: tenDN.trim(), matKhau, ghiNho: false });
      navigate(duongDanSauDangNhap(daDangNhap, trangYeuCau), { replace: true });
    } catch (error) {
      setLoi(thongBaoLoiDangNhap(error));
      setMatKhau("");
    } finally {
      setDangGui(false);
    }
  }

  const laThiSinh = cheDo === "candidate";

  return (
    <main className="login-photo-page">
      <div className="login-photo-shade" aria-hidden="true" />

      <section className="photo-login-panel">
        <div className="photo-login-card">
          <div className="photo-login-heading">
            <h2>Đăng nhập</h2>
          </div>

          {/* Chỉ đổi gợi ý nhập liệu; vai trò thật do máy chủ trả về. */}
          <div className="login-role-tabs" role="group" aria-label="Chọn vai trò đăng nhập">
            <button aria-pressed={!laThiSinh} className={!laThiSinh ? "active" : ""} onClick={() => setCheDo("admin")} type="button"><BieuTuong name="dashboard" size={16} /> Quản trị viên</button>
            <button aria-pressed={laThiSinh} className={laThiSinh ? "active" : ""} onClick={() => setCheDo("candidate")} type="button"><BieuTuong name="users" size={16} /> Thí sinh</button>
          </div>

          <form noValidate onSubmit={handleSubmit}>
            {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}

            <label className="photo-field-label" htmlFor="username">{laThiSinh ? "Mã số thí sinh" : "Tên đăng nhập"}</label>
            <div className="photo-input">
              <BieuTuong name="users" size={18} />
              <input
                autoCapitalize="none"
                autoComplete="username"
                id="username"
                onChange={(event) => setTenDN(event.target.value)}
                placeholder={laThiSinh ? "Nhập mã số thí sinh" : "Nhập tên đăng nhập"}
                spellCheck={false}
                value={tenDN}
              />
            </div>

            <label className="photo-field-label" htmlFor="password">Mật khẩu</label>
            <div className="photo-input">
              <BieuTuong name="lock" size={18} />
              <input autoComplete="current-password" id="password" onChange={(event) => setMatKhau(event.target.value)} placeholder="Nhập mật khẩu" type={showPassword ? "text" : "password"} value={matKhau} />
              <button aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} type="button"><BieuTuong name={showPassword ? "eye-off" : "eye"} size={19} /></button>
            </div>

            <button className="button button-primary photo-login-submit" disabled={dangGui} type="submit">
              {dangGui ? <><span className="button-spinner" /> Đang đăng nhập…</> : "Đăng nhập"}
            </button>
          </form>

          <p className="photo-login-help"><BieuTuong name="lock" size={13} /> Quên mật khẩu? Liên hệ quản trị viên.</p>
        </div>
        <p className="photo-footer">© 2026 CampusExam</p>
      </section>
    </main>
  );
}
