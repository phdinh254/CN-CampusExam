import { useEffect, useState } from "react";

import { BieuTuong } from "../../components/BieuTuong";
import type { KetQuaPhanCong, ThiSinhTomTat, TrangDuLieu } from "../../types/api";
import { laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { thiSinhApi } from "../thi-sinh/api";
import { kyThiApi } from "./api";

type Props = {
  maKT: number;
  /** Mã số thí sinh đã được phân công, hiện sẵn dấu và không chọn lại được. */
  daCo: ReadonlySet<string>;
  onDong: () => void;
  onDaThem: (ketQua: KetQuaPhanCong) => void;
};

const KICH_THUOC_TRANG = 100;

/** Chọn thí sinh theo lớp hoặc tìm kiếm, tick từng người hoặc cả trang, rồi phân công. */
export function HopThoaiChonThiSinh({ maKT, daCo, onDong, onDaThem }: Props) {
  const [dsLop, setDsLop] = useState<string[]>([]);
  const [lop, setLop] = useState("");
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trang, setTrang] = useState(1);
  const [data, setData] = useState<TrangDuLieu<ThiSinhTomTat> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [dangLuu, setDangLuu] = useState(false);
  const [loiLuu, setLoiLuu] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    thiSinhApi.lop(controller.signal).then(setDsLop).catch(() => { /* Bộ lọc lớp là phụ. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setTuKhoa(tuKhoaNhap.trim()); setTrang(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [tuKhoaNhap]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    thiSinhApi.danhSach({ lop: lop || undefined, tuKhoa: tuKhoa || undefined, trangThai: "hoat_dong", trang, kichThuocTrang: KICH_THUOC_TRANG, sapXep: "msts" }, controller.signal)
      .then(setData)
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [lop, tuKhoa, trang]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !dangLuu) onDong(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dangLuu, onDong]);

  const items = data?.duLieu ?? [];
  const chonDuoc = items.filter((ts) => !daCo.has(ts.msts));
  const daChonCaTrang = chonDuoc.length > 0 && chonDuoc.every((ts) => chon.has(ts.msts));

  function batTat(msts: string) {
    setChon((hienTai) => {
      const moi = new Set(hienTai);
      if (moi.has(msts)) moi.delete(msts); else moi.add(msts);
      return moi;
    });
  }

  function chonCaTrang() {
    setChon((hienTai) => {
      const moi = new Set(hienTai);
      for (const ts of chonDuoc) {
        if (daChonCaTrang) moi.delete(ts.msts); else moi.add(ts.msts);
      }
      return moi;
    });
  }

  async function phanCong() {
    if (chon.size === 0) return;
    setDangLuu(true);
    setLoiLuu(null);
    try {
      onDaThem(await kyThiApi.phanCong(maKT, [...chon]));
    } catch (error) {
      setLoiLuu(thongBaoLoi(error));
    } finally {
      setDangLuu(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !dangLuu) onDong(); }}>
      <section aria-labelledby="pick-students-title" aria-modal="true" className="form-dialog pick-students-dialog" role="dialog">
        <header>
          <div><span className="dialog-icon"><BieuTuong name="users" size={20} /></span><div><h3 id="pick-students-title">Thêm thí sinh vào kỳ thi</h3></div></div>
          <button aria-label="Đóng" className="dialog-close" disabled={dangLuu} onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <div className="dialog-body">
          {loiLuu && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiLuu}</span></div>}
          <div className="table-toolbar pick-toolbar">
            <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm thí sinh" autoFocus onChange={(event) => setTuKhoaNhap(event.target.value)} placeholder="Tìm mã số hoặc họ tên" value={tuKhoaNhap} /></div>
            <select aria-label="Lọc lớp" onChange={(event) => { setLop(event.target.value); setTrang(1); }} value={lop}>
              <option value="">Tất cả lớp</option>
              {dsLop.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>

          {loadError ? (
            <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được thí sinh</strong><span>{loadError}</span></div>
          ) : (
            <div className="table-scroll pick-list">
              <table className="data-table">
                <thead>
                  <tr>
                    <th><input aria-label="Chọn cả trang" checked={daChonCaTrang} disabled={chonDuoc.length === 0} onChange={chonCaTrang} type="checkbox" /></th>
                    <th>MÃ SỐ</th><th>HỌ TÊN</th><th>LỚP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((ts) => {
                    const daPhanCong = daCo.has(ts.msts);
                    return (
                      <tr className={daPhanCong ? "pick-row-disabled" : undefined} key={ts.msts} onClick={() => { if (!daPhanCong) batTat(ts.msts); }}>
                        <td><input aria-label={`Chọn ${ts.hoTen}`} checked={daPhanCong || chon.has(ts.msts)} disabled={daPhanCong} onChange={() => batTat(ts.msts)} onClick={(event) => event.stopPropagation()} type="checkbox" /></td>
                        <td><strong>{ts.msts}</strong></td>
                        <td>{ts.hoTen}{daPhanCong && <small className="pick-note">Đã trong kỳ thi</small>}</td>
                        <td>{ts.lop ?? <span className="muted-cell">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && items.length === 0 && <div className="empty-state"><BieuTuong name="users" size={28} /><strong>Không có thí sinh phù hợp</strong><span>Đổi lớp hoặc từ khóa tìm kiếm.</span></div>}
            </div>
          )}
          <div className="table-footer">
            <span>{data?.tongSoDong ?? 0} thí sinh</span>
            {data && data.tongSoTrang > 1 && (
              <div className="pagination">
                <button aria-label="Trang trước" disabled={loading || trang <= 1} onClick={() => setTrang((x) => x - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
                <span>Trang {data.trang} / {data.tongSoTrang}</span>
                <button aria-label="Trang sau" disabled={loading || trang >= data.tongSoTrang} onClick={() => setTrang((x) => x + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
              </div>
            )}
          </div>
        </div>
        <footer>
          <span className="pick-count">Đã chọn <strong>{chon.size}</strong> thí sinh</span>
          <button className="button button-secondary" disabled={dangLuu} onClick={onDong} type="button">Hủy</button>
          <button className="button button-primary" disabled={dangLuu || chon.size === 0} onClick={() => void phanCong()} type="button"><BieuTuong name="plus" size={16} /> {dangLuu ? "Đang thêm…" : `Thêm ${chon.size || ""} thí sinh`}</button>
        </footer>
      </section>
    </div>
  );
}
