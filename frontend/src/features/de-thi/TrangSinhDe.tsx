import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { KetQuaSinhDe, MaTranTomTat } from "../../types/api";
import { maTranApi } from "../ma-tran-de/api";
import { dinhDangNgay, laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { deThiApi } from "./api";

type LoiTruong = { maMT?: string; maDeGocHienThi?: string; soDeCon?: string };

export default function TrangSinhDe() {
  const [dsMaTran, setDsMaTran] = useState<MaTranTomTat[]>([]);
  const [maMT, setMaMT] = useState("");
  const [maDe, setMaDe] = useState("");
  const [soDeCon, setSoDeCon] = useState(4);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loiTruong, setLoiTruong] = useState<LoiTruong>({});
  const [ketQua, setKetQua] = useState<KetQuaSinhDe | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    maTranApi.danhSach({ trangThai: "su_dung", kichThuocTrang: 100 }, controller.signal)
      .then((data) => setDsMaTran(data.duLieu))
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const maTranChon = dsMaTran.find((mt) => mt.maMT === Number(maMT));
  const maDeHopLe = /^[A-Za-z0-9._-]{0,30}$/.test(maDe.trim());
  const coTheSinh = !!maTranChon && maDeHopLe && soDeCon >= 1 && soDeCon <= 50 && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!coTheSinh || !maTranChon) return;
    setSubmitting(true);
    setSubmitError(null);
    setLoiTruong({});
    setKetQua(null);
    try {
      setKetQua(await deThiApi.sinh({ maMT: maTranChon.maMT, maDeGocHienThi: maDe.trim() || undefined, soDeCon }));
      setMaDe("");
    } catch (error) {
      if (error instanceof LoiApiHttp && (error.errors.maMT || error.errors.maDeGocHienThi || error.errors.soDeCon)) {
        setLoiTruong({
          maMT: error.errors.maMT?.join(" "),
          maDeGocHienThi: error.errors.maDeGocHienThi?.join(" "),
          soDeCon: error.errors.soDeCon?.join(" "),
        });
      } else {
        setSubmitError(thongBaoLoi(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack paper-page">
      <section className="page-heading-row">
        <div>
          <h2>Sinh đề thi</h2>
          <p>Chọn câu theo ma trận, ưu tiên câu ít dùng, rồi hoán vị thành đề con.</p>
        </div>
      </section>

      {loading ? (
        <div className="outcomes-loading" aria-label="Đang tải ma trận">{[1, 2].map((x) => <span key={x} />)}</div>
      ) : loadError ? (
        <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được ma trận</strong><span>{loadError}</span></div>
      ) : dsMaTran.length === 0 ? (
        <div className="empty-state"><BieuTuong name="layers" size={28} /><strong>Chưa có ma trận đang sử dụng</strong><span>Kích hoạt một ma trận trước khi sinh đề.</span><Link className="button button-secondary" to="/admin/exam-matrices">Tới ma trận đề</Link></div>
      ) : (
        <div className="paper-layout">
        <form className="panel paper-generate" noValidate onSubmit={handleSubmit}>
          <header className="paper-panel-head"><h3>Thông tin sinh đề</h3><p>Chọn ma trận và số đề con cần tạo.</p></header>
          {submitError && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{submitError}</span></div>}
          <label className="dialog-field"><span>Ma trận đề <em>*</em></span>
            <select onChange={(event) => { setMaMT(event.target.value); setLoiTruong({}); }} value={maMT}>
              <option value="">Chọn ma trận đang sử dụng</option>
              {dsMaTran.map((mt) => <option key={mt.maMT} value={mt.maMT}>{mt.tenMT} — {mt.tongSoCau} câu, {mt.thoiGianLam} phút</option>)}
            </select>
            {loiTruong.maMT && <small className="field-error">{loiTruong.maMT}</small>}
          </label>
          <div className="dialog-field-grid">
            <label className="dialog-field"><span>Mã đề gốc</span>
              <input maxLength={30} onChange={(event) => setMaDe(event.target.value)} placeholder="Để trống để hệ thống tự đặt" value={maDe} />
              {!maDeHopLe && <small className="field-error">Chỉ gồm chữ không dấu, số và . _ -</small>}
              {loiTruong.maDeGocHienThi && <small className="field-error">{loiTruong.maDeGocHienThi}</small>}
            </label>
            <label className="dialog-field"><span>Số đề con <em>*</em></span>
              <input max={50} min={1} onChange={(event) => setSoDeCon(Math.trunc(Number(event.target.value)) || 0)} type="number" value={soDeCon} />
              {(soDeCon < 1 || soDeCon > 50) && <small className="field-error">Từ 1 đến 50 đề con.</small>}
              {loiTruong.soDeCon && <small className="field-error">{loiTruong.soDeCon}</small>}
            </label>
          </div>
          <footer className="paper-generate-footer">
            <button aria-busy={submitting} className="button button-primary" disabled={!coTheSinh} type="submit"><BieuTuong name="sparkles" size={16} /> {submitting ? "Đang sinh đề…" : "Sinh đề"}</button>
          </footer>
        </form>

        <aside className="panel paper-summary" aria-live="polite">
          <header className="paper-panel-head"><h3>Tóm tắt</h3><p>{maTranChon ? "Ma trận được dùng để sinh đề." : "Chọn ma trận để xem trước."}</p></header>
          {maTranChon ? (
            <>
              <strong className="paper-summary-name">{maTranChon.tenMT}</strong>
              <div className="paper-summary-stats">
                <div><small>Số câu / đề</small><strong>{maTranChon.tongSoCau}</strong></div>
                <div><small>Thời gian</small><strong>{maTranChon.thoiGianLam}<span> phút</span></strong></div>
                <div><small>Số KQHT</small><strong>{maTranChon.soKQHT}</strong></div>
                <div><small>Đề con</small><strong>{soDeCon >= 1 && soDeCon <= 50 ? soDeCon : "—"}</strong></div>
              </div>
              <ul className="paper-summary-notes">
                <li><BieuTuong name="clock" size={15} /> Cập nhật {dinhDangNgay(maTranChon.ngayCapNhat ?? maTranChon.ngayTao)}</li>
                <li><BieuTuong name="file" size={15} /> {maTranChon.daSinhDe ? "Đã từng sinh đề: câu ít dùng được ưu tiên để giảm trùng." : "Chưa sinh đề lần nào từ ma trận này."}</li>
              </ul>
            </>
          ) : (
            <ol className="paper-steps">
              <li><span>1</span>Chọn ma trận đang sử dụng</li>
              <li><span>2</span>Đặt mã đề gốc (hoặc để trống) và số đề con</li>
              <li><span>3</span>Bấm Sinh đề, xem lại đề trước khi dùng</li>
            </ol>
          )}
        </aside>
        </div>
      )}

      {ketQua && (
        <section className="panel paper-result" role="status">
          <div>
            <strong>Đã sinh đề {ketQua.maDeGocHienThi}</strong>
            <p>{ketQua.tongSoCau} câu · {ketQua.soDeCon} đề con · trùng {ketQua.soCauTrung}/{ketQua.tongSoCau} câu với các đề trước</p>
          </div>
          <Link className="button button-secondary" to={`/admin/exam-papers/${ketQua.maDe}`}><BieuTuong name="eye" size={16} /> Xem đề</Link>
        </section>
      )}
    </div>
  );
}
