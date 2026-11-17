import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { HopThoaiXacNhan } from "../../components/HopThoaiXacNhan";
import type { DeGocTomTat, MaTranTomTat, TrangDuLieu } from "../../types/api";
import { maTranApi } from "../ma-tran-de/api";
import { dinhDangNgay, laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { deThiApi } from "./api";

const KICH_THUOC_TRANG = 20;

export default function TrangDanhSachDe() {
  const [data, setData] = useState<TrangDuLieu<DeGocTomTat> | null>(null);
  const [dsMaTran, setDsMaTran] = useState<MaTranTomTat[]>([]);
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [maMT, setMaMT] = useState("");
  const [trang, setTrang] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [xoa, setXoa] = useState<DeGocTomTat | null>(null);
  const [xoaBusy, setXoaBusy] = useState(false);
  const [xoaError, setXoaError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    maTranApi.danhSach({ kichThuocTrang: 100 }, controller.signal).then((d) => setDsMaTran(d.duLieu)).catch(() => undefined);
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
    deThiApi.danhSach({ tuKhoa: tuKhoa || undefined, maMT: maMT ? Number(maMT) : undefined, trang, kichThuocTrang: KICH_THUOC_TRANG }, controller.signal)
      .then((result) => {
        if (result.duLieu.length === 0 && trang > 1 && result.tongSoTrang > 0) setTrang(result.tongSoTrang);
        else setData(result);
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tuKhoa, maMT, trang, reloadKey]);

  async function handleXoa() {
    if (!xoa) return;
    setXoaBusy(true);
    setXoaError(null);
    try {
      await deThiApi.xoa(xoa.maDe);
      setSuccess(`Đã xóa đề ${xoa.maDeGocHienThi}.`);
      setXoa(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setXoaError(thongBaoLoi(error));
    } finally {
      setXoaBusy(false);
    }
  }

  const items = data?.duLieu ?? [];

  return (
    <div className="page-stack paper-page">
      <section className="page-heading-row">
        <div>
          <h2>Danh sách đề thi</h2>
          <p>Đề gốc sinh từ ma trận và các đề con hoán vị.</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-primary" to="/admin/exam-generation"><BieuTuong name="sparkles" size={17} /> Sinh đề</Link>
        </div>
      </section>

      {success && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> {success}</span>
          <button aria-label="Đóng thông báo" onClick={() => setSuccess(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm đề" onChange={(event) => setTuKhoaNhap(event.target.value)} placeholder="Tìm theo mã đề" value={tuKhoaNhap} /></div>
          <select aria-label="Lọc ma trận" onChange={(event) => { setMaMT(event.target.value); setTrang(1); }} value={maMT}>
            <option value="">Tất cả ma trận</option>
            {dsMaTran.map((mt) => <option key={mt.maMT} value={mt.maMT}>{mt.tenMT}</option>)}
          </select>
        </div>

        {loadError ? (
          <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được dữ liệu</strong><span>{loadError}</span><button className="button button-secondary" onClick={() => setReloadKey((value) => value + 1)} type="button">Thử lại</button></div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>MÃ ĐỀ</th><th>MA TRẬN</th><th>SỐ CÂU</th><th>ĐỀ CON</th><th>KỲ THI</th><th>NGÀY SINH</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.maDe}>
                      <td><Link className="matrix-name" to={`/admin/exam-papers/${item.maDe}`}><strong>{item.maDeGocHienThi}</strong></Link></td>
                      <td>{item.tenMT}</td>
                      <td>{item.tongSoCau}</td>
                      <td>{item.soDeCon}</td>
                      <td>{item.daGanKyThi ? <span className="status-dot status-active">Đã gắn</span> : <span className="muted-cell">Chưa</span>}</td>
                      <td><span className="muted-cell">{dinhDangNgay(item.ngayTao)}</span></td>
                      <td>
                        <div className="row-actions">
                          <Link aria-label={`Xem ${item.maDeGocHienThi}`} className="row-action" title="Xem đề" to={`/admin/exam-papers/${item.maDe}`}><BieuTuong name="eye" size={16} /></Link>
                          {!item.daGanKyThi && (
                            <button aria-label={`Xóa ${item.maDeGocHienThi}`} className="row-action danger" onClick={() => { setXoaError(null); setXoa(item); }} title="Xóa đề" type="button"><BieuTuong name="x" size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && items.length === 0 && <div className="empty-state"><BieuTuong name="file" size={28} /><strong>Chưa có đề phù hợp</strong><span>Sinh đề từ một ma trận đang sử dụng.</span></div>}
            <div className="table-footer">
              <span><strong>{data?.tongSoDong ?? 0}</strong> đề gốc</span>
              <div className="pagination">
                <button aria-label="Trang trước" disabled={loading || trang <= 1} onClick={() => setTrang((value) => value - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
                <span>Trang {data && data.tongSoTrang > 0 ? data.trang : 0} / {data?.tongSoTrang ?? 0}</span>
                <button aria-label="Trang sau" disabled={loading || !data || trang >= data.tongSoTrang} onClick={() => setTrang((value) => value + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      {xoa && (
        <HopThoaiXacNhan busy={xoaBusy} confirmLabel="Xóa đề" danger error={xoaError} onCancel={() => setXoa(null)} onConfirm={handleXoa} title="Xóa đề thi?">
          <p>Xóa vĩnh viễn đề <strong>{xoa.maDeGocHienThi}</strong> và {xoa.soDeCon} đề con. Câu hỏi trong ngân hàng không bị ảnh hưởng.</p>
        </HopThoaiXacNhan>
      )}
    </div>
  );
}
