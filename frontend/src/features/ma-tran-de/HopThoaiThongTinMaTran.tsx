import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { BieuTuong } from "../../components/BieuTuong";

type Props = {
  tieuDe: string;
  nutXacNhan: ReactNode;
  tenMT?: string;
  thoiGianLam?: number;
  onXacNhan: (tenMT: string, thoiGianLam: number) => void;
  onDong: () => void;
};

/** Hộp thoại nhập tên và thời gian làm bài, dùng chung khi tạo và sửa ma trận. */
export function HopThoaiThongTinMaTran({ tieuDe, nutXacNhan, tenMT = "", thoiGianLam = 45, onXacNhan, onDong }: Props) {
  const [ten, setTen] = useState(tenMT);
  const [thoiGian, setThoiGian] = useState(thoiGianLam);
  const [loi, setLoi] = useState<{ tenMT?: string; thoiGianLam?: string }>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onDong(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onDong]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const moi: typeof loi = {};
    if (!ten.trim()) moi.tenMT = "Nhập tên ma trận.";
    if (!Number.isInteger(thoiGian) || thoiGian < 1 || thoiGian > 600) moi.thoiGianLam = "Thời gian làm bài phải từ 1 đến 600 phút.";
    if (moi.tenMT || moi.thoiGianLam) { setLoi(moi); return; }
    onXacNhan(ten.trim(), thoiGian);
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onDong(); }}>
      <section aria-labelledby="matrix-info-title" aria-modal="true" className="form-dialog" role="dialog">
        <header><div><span className="dialog-icon"><BieuTuong name="layers" size={20} /></span><div><h3 id="matrix-info-title">{tieuDe}</h3></div></div><button aria-label="Đóng" className="dialog-close" onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button></header>
        <form noValidate onSubmit={handleSubmit}>
          <div className="dialog-body">
            <label className="dialog-field full"><span>Tên ma trận <em>*</em></span><input autoFocus maxLength={200} onChange={(event) => { setTen(event.target.value); setLoi((x) => ({ ...x, tenMT: undefined })); }} placeholder="Ví dụ: Tin học cơ bản – giữa kỳ" value={ten} />{loi.tenMT && <small className="field-error">{loi.tenMT}</small>}<small className="field-counter">{ten.length}/200</small></label>
            <label className="dialog-field full"><span>Thời gian làm bài (phút) <em>*</em></span><input max={600} min={1} onChange={(event) => { setThoiGian(Number(event.target.value)); setLoi((x) => ({ ...x, thoiGianLam: undefined })); }} type="number" value={thoiGian} />{loi.thoiGianLam && <small className="field-error">{loi.thoiGianLam}</small>}</label>
          </div>
          <footer><button className="button button-secondary" onClick={onDong} type="button">Hủy</button><button className="button button-primary" type="submit">{nutXacNhan}</button></footer>
        </form>
      </section>
    </div>
  );
}
