import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import { useXacThuc, useTaiKhoan } from "./NhaCungCapXacThuc";
import { thongBaoLoiDoiMatKhau, trangChuTheoVaiTro } from "./tienIchXacThuc";

type LoiTruong = Partial<Record<"matKhauCu" | "matKhauMoi" | "xacNhan", string>>;

/** Đổi mật khẩu: dùng chung cho quản trị viên và thí sinh. */
export default function TrangDoiMatKhau() {
  const navigate = useNavigate();
  const { doiMatKhau } = useXacThuc();
  const taiKhoan = useTaiKhoan();
  const [matKhauCu, setMatKhauCu] = useState("");
  const [matKhauMoi, setMatKhauMoi] = useState("");
  const [xacNhan, setXacNhan] = useState("");
  const [loiTruong, setLoiTruong] = useState<LoiTruong>({});
  const [loiChung, setLoiChung] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  const khop = xacNhan.length > 0 && xacNhan === matKhauMoi;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const loi: LoiTruong = {};
    if (!matKhauCu) loi.matKhauCu = "Nhập mật khẩu hiện tại.";
    if (!matKhauMoi) loi.matKhauMoi = "Nhập mật khẩu mới.";
    // Chỉ kiểm tra độ dài tối thiểu; các điều kiện còn lại do server kiểm tra và trả lỗi về trường này.
    else if (matKhauMoi.length < 8) loi.matKhauMoi = "Mật khẩu phải có ít nhất 8 ký tự.";
    if (matKhauMoi && xacNhan !== matKhauMoi) loi.xacNhan = "Mật khẩu nhập lại không khớp.";
    setLoiTruong(loi);
    setLoiChung(null);
    if (Object.keys(loi).length > 0) return;

    setDangGui(true);
    try {
      const moi = await doiMatKhau({ matKhauCu, matKhauMoi });
      navigate(trangChuTheoVaiTro(moi.vaiTro), { replace: true });
    } catch (error) {
      if (error instanceof LoiApiHttp && Object.keys(error.errors).length > 0) {
        setLoiTruong({
          matKhauCu: error.errors.matKhauCu?.join(" "),
          matKhauMoi: error.errors.matKhauMoi?.join(" "),
        });
      } else {
        setLoiChung(thongBaoLoiDoiMatKhau(error));
      }
    } finally {
      setDangGui(false);
    }
  }

  return (
    <div className="dmk-main">
      <section aria-labelledby="dmk-tieu-de" className="dmk-card">
        <div className="dmk-head">
          <h1 id="dmk-tieu-de">Đổi mật khẩu</h1>
          <p>Tài khoản <strong>{taiKhoan.msts ?? taiKhoan.tenDN}</strong> · {taiKhoan.hoTen}</p>
        </div>

        <form noValidate onSubmit={handleSubmit}>
          {loiChung && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiChung}</span></div>}

          <TruongMatKhau
            autoComplete="current-password"
            id="matKhauCu"
            label="Mật khẩu hiện tại"
            loi={loiTruong.matKhauCu}
            onChange={setMatKhauCu}
            value={matKhauCu}
          />
          <TruongMatKhau autoComplete="new-password" id="matKhauMoi" label="Mật khẩu mới" loi={loiTruong.matKhauMoi} onChange={setMatKhauMoi} value={matKhauMoi} />
          <TruongMatKhau
            autoComplete="new-password"
            goiY={xacNhan.length > 0 ? (khop ? { dat: true, text: "Mật khẩu nhập lại khớp." } : { dat: false, text: "Chưa khớp với mật khẩu mới." }) : undefined}
            id="xacNhan"
            label="Nhập lại mật khẩu mới"
            loi={loiTruong.xacNhan}
            onChange={setXacNhan}
            value={xacNhan}
          />

          <button className="button button-primary button-lg dmk-submit" disabled={dangGui} type="submit">
            {dangGui ? "Đang lưu…" : "Lưu mật khẩu mới"}
          </button>
        </form>

        <div className="dmk-foot">
          <button className="button button-ghost" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(trangChuTheoVaiTro(taiKhoan.vaiTro)))} type="button"><BieuTuong name="arrow-left" size={16} /> Quay lại</button>
        </div>
      </section>
    </div>
  );
}

type TruongMatKhauProps = {
  id: string;
  label: string;
  value: string;
  loi?: string;
  goiY?: { dat: boolean; text: string };
  autoComplete: string;
  onChange: (value: string) => void;
};

function TruongMatKhau({ id, label, value, loi, goiY, autoComplete, onChange }: TruongMatKhauProps) {
  const [hien, setHien] = useState(false);
  const moTa = loi ? `${id}-loi` : goiY ? `${id}-goi-y` : undefined;

  return (
    <div className="dmk-field">
      <label htmlFor={id}>{label}</label>
      <div className={`dmk-input ${loi ? "loi" : ""}`}>
        <BieuTuong name="lock" size={18} />
        <input
          aria-describedby={moTa}
          aria-invalid={loi ? true : undefined}
          autoComplete={autoComplete}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          type={hien ? "text" : "password"}
          value={value}
        />
        <button aria-label={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={hien} title={hien ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setHien((cu) => !cu)} type="button">
          <BieuTuong name={hien ? "eye-off" : "eye"} size={20} />
        </button>
      </div>
      {loi && <p className="field-error" id={`${id}-loi`}>{loi}</p>}
      {!loi && goiY && <p className={`dmk-hint ${goiY.dat ? "dat" : "chua"}`} id={`${id}-goi-y`}>{goiY.text}</p>}
    </div>
  );
}
