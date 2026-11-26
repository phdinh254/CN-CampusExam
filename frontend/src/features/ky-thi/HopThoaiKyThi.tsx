import { useEffect, useState, type FormEvent } from "react";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { CachPhanDe, KyThiChiTiet } from "../../types/api";
import { thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { kyThiApi } from "./api";
import { nhanCachPhanDe, sangGioDiaPhuong, sangIsoUtc } from "./hienThiKyThi";

type Props = {
  /** null: tạo mới. */
  kyThi: KyThiChiTiet | null;
  onDong: () => void;
  onDaLuu: (kyThi: KyThiChiTiet) => void;
};

type Form = {
  tenKT: string;
  monThi: string;
  tgBatDau: string;
  thoiLuong: number;
  soPhutChoVaoTre: number;
  cachPhanDe: CachPhanDe;
  hienDiem: boolean;
};

type LoiForm = Partial<Record<"tenKT" | "monThi" | "tgBatDau" | "thoiLuong" | "soPhutChoVaoTre", string>>;

/** 08:00 sáng mai theo giờ máy. */
function gioMacDinh() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return sangGioDiaPhuong(d.toISOString());
}

function formTu(kyThi: KyThiChiTiet | null): Form {
  return kyThi
    ? {
        tenKT: kyThi.tenKT, monThi: kyThi.monThi, tgBatDau: sangGioDiaPhuong(kyThi.tgBatDau), thoiLuong: kyThi.thoiLuong,
        soPhutChoVaoTre: kyThi.soPhutChoVaoTre, cachPhanDe: kyThi.cachPhanDe, hienDiem: kyThi.hienDiem,
      }
    : { tenKT: "", monThi: "", tgBatDau: gioMacDinh(), thoiLuong: 60, soPhutChoVaoTre: 10, cachPhanDe: "can_bang", hienDiem: true };
}

/** Hộp thoại tạo/sửa kỳ thi nháp. */
export function HopThoaiKyThi({ kyThi, onDong, onDaLuu }: Props) {
  const [form, setForm] = useState<Form>(() => formTu(kyThi));
  const [loi, setLoi] = useState<LoiForm>({});
  const [loiChung, setLoiChung] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !dangLuu) onDong(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dangLuu, onDong]);

  function capNhat<K extends keyof Form>(truong: K, giaTri: Form[K]) {
    setForm((hienTai) => ({ ...hienTai, [truong]: giaTri }));
    setLoi((hienTai) => ({ ...hienTai, [truong]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const moi: LoiForm = {};
    const tgBatDau = sangIsoUtc(form.tgBatDau);
    if (!form.tenKT.trim()) moi.tenKT = "Nhập tên kỳ thi.";
    if (!form.monThi.trim()) moi.monThi = "Nhập môn thi.";
    if (!tgBatDau) moi.tgBatDau = "Chọn giờ bắt đầu.";
    if (!Number.isInteger(form.thoiLuong) || form.thoiLuong < 1 || form.thoiLuong > 600) moi.thoiLuong = "Từ 1 đến 600 phút.";
    if (!Number.isInteger(form.soPhutChoVaoTre) || form.soPhutChoVaoTre < 0 || form.soPhutChoVaoTre > 120) moi.soPhutChoVaoTre = "Từ 0 đến 120 phút.";
    else if (form.soPhutChoVaoTre >= form.thoiLuong) moi.soPhutChoVaoTre = "Phải nhỏ hơn thời lượng.";
    if (Object.values(moi).some(Boolean)) { setLoi(moi); return; }

    const body = { ...form, tenKT: form.tenKT.trim(), monThi: form.monThi.trim(), tgBatDau: tgBatDau! };
    setDangLuu(true);
    setLoiChung(null);
    try {
      onDaLuu(kyThi ? await kyThiApi.sua(kyThi.maKT, { ...body, phienBan: kyThi.phienBan }) : await kyThiApi.tao(body));
    } catch (error) {
      if (error instanceof LoiApiHttp && Object.keys(error.errors).length > 0) {
        const theoTruong: LoiForm = {};
        for (const truong of ["tenKT", "monThi", "tgBatDau", "thoiLuong", "soPhutChoVaoTre"] as const) {
          if (error.errors[truong]) theoTruong[truong] = error.errors[truong].join(" ");
        }
        setLoi(theoTruong);
        if (!Object.values(theoTruong).some(Boolean)) setLoiChung(Object.values(error.errors).flat().join(" "));
      } else {
        setLoiChung(thongBaoLoi(error));
      }
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !dangLuu) onDong(); }}>
      <section aria-labelledby="exam-form-title" aria-modal="true" className="form-dialog exam-form-dialog" role="dialog">
        <header>
          <div><span className="dialog-icon"><BieuTuong name="calendar" size={20} /></span><div><h3 id="exam-form-title">{kyThi ? "Sửa kỳ thi" : "Tạo kỳ thi"}</h3></div></div>
          <button aria-label="Đóng" className="dialog-close" disabled={dangLuu} onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <form noValidate onSubmit={handleSubmit}>
          <div className="dialog-body">
            {loiChung && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiChung}</span></div>}
            <label className="dialog-field full"><span>Tên kỳ thi <em>*</em></span><input autoFocus maxLength={200} onChange={(event) => capNhat("tenKT", event.target.value)} placeholder="Ví dụ: Thi giữa kỳ – ca 1" value={form.tenKT} />{loi.tenKT && <small className="field-error">{loi.tenKT}</small>}</label>
            <label className="dialog-field full"><span>Môn thi <em>*</em></span><input maxLength={200} onChange={(event) => capNhat("monThi", event.target.value)} placeholder="Ví dụ: Công nghệ phần mềm" value={form.monThi} />{loi.monThi && <small className="field-error">{loi.monThi}</small>}</label>
            <div className="dialog-field-grid">
              <label className="dialog-field"><span>Giờ bắt đầu <em>*</em></span><input onChange={(event) => capNhat("tgBatDau", event.target.value)} type="datetime-local" value={form.tgBatDau} />{loi.tgBatDau && <small className="field-error">{loi.tgBatDau}</small>}</label>
              <label className="dialog-field"><span>Thời lượng (phút) <em>*</em></span><input max={600} min={1} onChange={(event) => capNhat("thoiLuong", Math.trunc(Number(event.target.value)) || 0)} type="number" value={form.thoiLuong} />{loi.thoiLuong && <small className="field-error">{loi.thoiLuong}</small>}</label>
            </div>
            <div className="dialog-field-grid">
              <label className="dialog-field"><span>Cho vào trễ tối đa (phút)</span><input max={120} min={0} onChange={(event) => capNhat("soPhutChoVaoTre", Math.trunc(Number(event.target.value)) || 0)} type="number" value={form.soPhutChoVaoTre} />{loi.soPhutChoVaoTre && <small className="field-error">{loi.soPhutChoVaoTre}</small>}</label>
              <label className="dialog-field"><span>Cách phân đề con</span>
                <select onChange={(event) => capNhat("cachPhanDe", event.target.value as CachPhanDe)} value={form.cachPhanDe}>
                  {(Object.keys(nhanCachPhanDe) as CachPhanDe[]).map((cach) => <option key={cach} value={cach}>{nhanCachPhanDe[cach]}</option>)}
                </select>
              </label>
            </div>
            <label className="checkbox-field"><input checked={form.hienDiem} onChange={(event) => capNhat("hienDiem", event.target.checked)} type="checkbox" /><span>Hiện điểm ngay sau khi nộp bài</span></label>
          </div>
          <footer>
            <button className="button button-secondary" disabled={dangLuu} onClick={onDong} type="button">Hủy</button>
            <button aria-busy={dangLuu} className="button button-primary" disabled={dangLuu} type="submit"><BieuTuong name="check" size={16} /> {dangLuu ? "Đang lưu…" : kyThi ? "Lưu thay đổi" : "Tạo kỳ thi"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
