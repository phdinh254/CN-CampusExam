import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { BangTyLeDung, DongBangDiem, KhoangDiem, KyThiTomTat, OTyLeDung, ThongKeKetQua, TrangDuLieu, TrangThaiKetQuaThiSinh } from "../../types/api";
import { dinhDangNgayGio, khungGio, mauTrangThaiKyThi, nhanTrangThaiKyThi } from "../ky-thi/hienThiKyThi";
import { kyThiApi } from "../ky-thi/api";
import { mocTruc } from "../quan-tri/KhungLuotThi";
import { TrangThaiTrong } from "../quan-tri/TrangThaiTrong";
import { baoCaoApi } from "./api";
import { HopThoaiBaiLam } from "./HopThoaiBaiLam";

/*
 * Báo cáo kết quả một kỳ thi đang thi hoặc đã kết thúc. Mọi số liệu do máy chủ tính (cùng nguồn với
 * tệp Excel); kỳ thi đang xem nằm trên URL `?maKT=`.
 */

const KICH_THUOC_TRANG = 20;
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dinhDangPhanTram = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const dinhDangSo = new Intl.NumberFormat("vi-VN");

const NHAN_TRANG_THAI: Record<TrangThaiKetQuaThiSinh, string> = {
  da_nop: "Đã nộp",
  he_thong_thu: "Hệ thống thu",
  dang_lam: "Đang làm",
  vang_thi: "Vắng thi",
  chua_vao: "Chưa vào",
};

const LOP_TRANG_THAI: Record<TrangThaiKetQuaThiSinh, string> = {
  da_nop: "status-active",
  he_thong_thu: "status-active",
  dang_lam: "status-draft",
  vang_thi: "status-disabled",
  chua_vao: "status-disabled",
};

const thongBaoLoi = (error: unknown) =>
  error instanceof LoiApiHttp ? error.message : "Không thể kết nối máy chủ. Vui lòng thử lại.";
const laHuy = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
/** Mọi kỳ thi của một trạng thái, tải lần lượt từng trang 100 kỳ thi (API trả mới nhất trước). */
async function taiHet(trangThai: "dang_thi" | "da_ket_thuc", signal: AbortSignal) {
  const ds: KyThiTomTat[] = [];
  for (let trang = 1; ; trang++) {
    const kq = await kyThiApi.danhSach({ trangThai, trang, kichThuocTrang: 100 }, signal);
    ds.push(...kq.duLieu);
    if (trang >= kq.tongSoTrang || kq.duLieu.length === 0) return ds;
  }
}

const diem = (giaTri: number | null) => (giaTri === null ? "—" : dinhDangDiem.format(giaTri));

function PhoDiem({ phoDiem }: { phoDiem: KhoangDiem[] }) {
  const lonNhat = Math.max(0, ...phoDiem.map((k) => k.soBai));
  const dinh = mocTruc(lonNhat);
  const vach = [1, 0.75, 0.5, 0.25, 0];
  return (
    <div className="tq-chart bc-pho-diem" role="img" aria-label={`Phổ điểm: ${phoDiem.map((k) => `${k.tu}–${k.den}: ${k.soBai} bài`).join(", ")}`}>
      <div aria-hidden="true" className="tq-chart-axis">{vach.map((v) => <span key={v}>{dinhDangSo.format(Math.round(dinh * v))}</span>)}</div>
      <div className="tq-chart-plot">
        <div aria-hidden="true" className="tq-chart-grid">{vach.map((v) => <i key={v} />)}</div>
        <div className="tq-chart-bars">
          {phoDiem.map((k) => (
            <div className={`tq-col${k.tu >= 5 ? " bc-dat" : ""}`} key={k.tu}>
              <div className="tq-col-track">
                {k.soBai > 0 && <div className="tq-col-bar" style={{ height: `${(k.soBai / dinh) * 100}%` }} />}
                <span className="tq-tip">{k.tu}–{k.den} điểm: <strong>{dinhDangSo.format(k.soBai)}</strong> bài</span>
              </div>
              <small>{k.tu}–{k.den}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Ô tỷ lệ đúng: dưới 50% tô đỏ, từ 80% tô xanh để thấy nhanh phần kiến thức yếu/vững. */
function OTyLe({ o }: { o: OTyLeDung }) {
  if (o.soCau === 0) return <td className="bc-o-trong">—</td>;
  const muc = o.tyLeDung === null ? "" : o.tyLeDung < 50 ? " bc-thap" : o.tyLeDung >= 80 ? " bc-cao" : "";
  return (
    <td className={`bc-o${muc}`}>
      <strong>{o.tyLeDung === null ? "—" : `${dinhDangPhanTram.format(o.tyLeDung)}%`}</strong>
      <small>{dinhDangSo.format(o.soDung)}/{dinhDangSo.format(o.soLuot)} lượt · {o.soCau} câu</small>
    </td>
  );
}

function BangTheoKqht({ bang }: { bang: BangTyLeDung }) {
  return (
    <div className="table-scroll">
      <table className="data-table bc-bang-kqht">
        <thead>
          <tr>
            <th>KQHT</th>
            {bang.mucDo.map((md) => <th key={md.maMD}>{md.tenMD.toUpperCase()}</th>)}
            <th>TỔNG</th>
          </tr>
        </thead>
        <tbody>
          {bang.dong.map((d) => (
            <tr key={d.maKQHT}>
              <td><span className="bc-ma-cau">{d.kyHieu}</span> <span className="bc-ten-kqht" title={d.tenKQHT}>{d.tenKQHT}</span></td>
              {d.theoMucDo.map((o, i) => <OTyLe key={bang.mucDo[i].maMD} o={o} />)}
              <OTyLe o={d.tong} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Tổng</strong></td>
            {bang.tongTheoMucDo.map((o, i) => <OTyLe key={bang.mucDo[i].maMD} o={o} />)}
            <OTyLe o={bang.tongCong} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function TrangBaoCaoKetQua() {
  const [thamSo, setThamSo] = useSearchParams();
  const [dsKyThi, setDsKyThi] = useState<KyThiTomTat[] | null>(null);
  const [loiDanhSach, setLoiDanhSach] = useState<string | null>(null);
  const [thongKe, setThongKe] = useState<ThongKeKetQua | null>(null);
  const [loiThongKe, setLoiThongKe] = useState<string | null>(null);
  const [bangDiem, setBangDiem] = useState<TrangDuLieu<DongBangDiem> | null>(null);
  const [dangTaiBang, setDangTaiBang] = useState(false);
  const [loiBang, setLoiBang] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState<TrangThaiKetQuaThiSinh | "">("");
  const [trang, setTrang] = useState(1);
  const [lanTai, setLanTai] = useState(0);
  const [dangXuat, setDangXuat] = useState(false);
  const [loiXuat, setLoiXuat] = useState<string | null>(null);
  const [xemBai, setXemBai] = useState<string | null>(null);

  useEffect(() => {
    const huy = new AbortController();
    Promise.all([taiHet("dang_thi", huy.signal), taiHet("da_ket_thuc", huy.signal)])
      .then(([dang, xong]) => setDsKyThi([...dang, ...xong]))
      .catch((error: unknown) => { if (!laHuy(error)) setLoiDanhSach(thongBaoLoi(error)); });
    return () => huy.abort();
  }, []);

  // Mặc định: kỳ thi đầu danh sách (đang thi trước, rồi đã kết thúc gần nhất — API trả mới nhất trước).
  const maTrenUrl = Number(thamSo.get("maKT")) || null;
  const maKT = useMemo(() => {
    if (!dsKyThi || dsKyThi.length === 0) return null;
    return dsKyThi.some((kt) => kt.maKT === maTrenUrl) ? maTrenUrl : dsKyThi[0].maKT;
  }, [dsKyThi, maTrenUrl]);

  useEffect(() => {
    if (maKT === null) return;
    const huy = new AbortController();
    setThongKe(null);
    setLoiThongKe(null);
    baoCaoApi.thongKe(maKT, huy.signal)
      .then(setThongKe)
      .catch((error: unknown) => { if (!laHuy(error)) setLoiThongKe(thongBaoLoi(error)); });
    return () => huy.abort();
  }, [maKT, lanTai]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setTuKhoa(query.trim()); setTrang(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (maKT === null) return;
    const huy = new AbortController();
    setDangTaiBang(true);
    setLoiBang(null);
    baoCaoApi.bangDiem(maKT, { tuKhoa: tuKhoa || undefined, trangThai: trangThai || undefined, trang, kichThuocTrang: KICH_THUOC_TRANG }, huy.signal)
      .then(setBangDiem)
      .catch((error: unknown) => { if (!laHuy(error)) setLoiBang(thongBaoLoi(error)); })
      .finally(() => { if (!huy.signal.aborted) setDangTaiBang(false); });
    return () => huy.abort();
  }, [maKT, tuKhoa, trangThai, trang, lanTai]);

  function chonKyThi(ma: number) {
    setThamSo({ maKT: String(ma) });
    setQuery("");
    setTuKhoa("");
    setTrangThai("");
    setTrang(1);
    setBangDiem(null);
    setLoiXuat(null);
  }

  async function xuatExcel() {
    if (maKT === null) return;
    setDangXuat(true);
    setLoiXuat(null);
    try {
      const blob = await baoCaoApi.xuatExcel(maKT);
      const d = new Date();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ket-qua-${maKT}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLoiXuat(thongBaoLoi(error));
    } finally {
      setDangXuat(false);
    }
  }

  const kyThiChon = dsKyThi?.find((kt) => kt.maKT === maKT) ?? null;
  const cs = thongKe?.chiSo;
  const dangThi = thongKe?.kyThi.trangThai === "dang_thi";

  return (
    <div className="page-stack bc-page">
      <section className="page-heading-row">
        <div><h2>Báo cáo kết quả</h2></div>
        {dsKyThi && dsKyThi.length > 0 && (
          <div className="heading-actions">
            <select aria-label="Kỳ thi" className="bc-chon-ky-thi" onChange={(event) => chonKyThi(Number(event.target.value))} value={maKT ?? ""}>
              {dsKyThi.map((kt) => (
                <option key={kt.maKT} value={kt.maKT}>{kt.tenKT} · {dinhDangNgayGio(kt.tgBatDau).ngay}</option>
              ))}
            </select>
            <button aria-busy={dangXuat} className="button button-primary" disabled={dangXuat || !thongKe} onClick={xuatExcel} type="button">
              <BieuTuong name="file" size={17} /> {dangXuat ? "Đang xuất…" : "Xuất Excel"}
            </button>
          </div>
        )}
      </section>

      {loiDanhSach && <div className="panel"><TrangThaiTrong bieuTuong="alert" moTa={loiDanhSach} tieuDe="Chưa tải được danh sách kỳ thi" /></div>}
      {!loiDanhSach && dsKyThi === null && <div className="panel outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>}
      {dsKyThi && dsKyThi.length === 0 && (
        <div className="panel">
          <TrangThaiTrong bieuTuong="activity" moTa="Kết quả có khi kỳ thi bắt đầu. Hãy tạo và phát hành kỳ thi." tieuDe="Chưa có kỳ thi nào có kết quả">
            <Link className="button button-secondary" to="/admin/exams">Tới quản lý kỳ thi</Link>
          </TrangThaiTrong>
        </div>
      )}

      {kyThiChon && (
        <>
          <section className="bc-ky-thi">
            <span className={`exam-status ${mauTrangThaiKyThi[thongKe?.kyThi.trangThai ?? kyThiChon.trangThai]}`}>{nhanTrangThaiKyThi[thongKe?.kyThi.trangThai ?? kyThiChon.trangThai]}</span>
            <span>{kyThiChon.monThi}</span>
            <span>{dinhDangNgayGio(kyThiChon.tgBatDau).ngay} · {khungGio(kyThiChon.tgBatDau, kyThiChon.thoiLuong)}</span>
            {thongKe && <span>{thongKe.kyThi.tongSoCau} câu</span>}
            {dangThi && (
              <span className="bc-tam-thoi">
                Số liệu tạm thời, kỳ thi đang diễn ra
                <button className="tq-more tq-more-button" onClick={() => setLanTai((x) => x + 1)} type="button">Làm mới</button>
              </span>
            )}
          </section>
          {loiXuat && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiXuat}</span></div>}

          {loiThongKe && (
            <div className="panel">
              <TrangThaiTrong bieuTuong="alert" moTa={loiThongKe} tieuDe="Chưa tải được thống kê">
                <button className="button button-secondary" onClick={() => setLanTai((x) => x + 1)} type="button">Thử lại</button>
              </TrangThaiTrong>
            </div>
          )}

          <section className="stats-grid">
            {[
              { nhan: "Đã thi / được phân công", giaTri: cs ? `${dinhDangSo.format(cs.soDaThi)}/${dinhDangSo.format(cs.soPhanCong)}` : "…" },
              { nhan: "Điểm trung bình", giaTri: cs ? diem(cs.diemTrungBinh) : "…" },
              { nhan: "Cao nhất / thấp nhất", giaTri: cs ? (cs.diemCaoNhat === null ? "—" : `${diem(cs.diemCaoNhat)} / ${diem(cs.diemThapNhat)}`) : "…" },
              { nhan: "Tỷ lệ đạt (≥ 5)", giaTri: cs ? (cs.tyLeDat === null ? "—" : `${dinhDangPhanTram.format(cs.tyLeDat)}%`) : "…" },
            ].map((t) => (
              <div className="stat-card" key={t.nhan}>
                <div className="stat-card-main"><span>{t.nhan}</span><strong>{t.giaTri}</strong></div>
              </div>
            ))}
          </section>

          <section className="tq-grid">
            <article className="panel tq-panel">
              <header className="tq-panel-head"><h3>Phổ điểm</h3></header>
              {!thongKe && !loiThongKe && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
              {thongKe && thongKe.chiSo.soDaThi === 0 && <TrangThaiTrong bieuTuong="activity" tieuDe="Chưa có bài nộp" />}
              {thongKe && thongKe.chiSo.soDaThi > 0 && <PhoDiem phoDiem={thongKe.phoDiem} />}
            </article>

            <article className="panel tq-panel">
              <header className="tq-panel-head"><h3>Câu sai nhiều nhất</h3></header>
              {!thongKe && !loiThongKe && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
              {thongKe && thongKe.cauSaiNhieuNhat.length === 0 && (
                <TrangThaiTrong bieuTuong="check" tieuDe={thongKe.chiSo.soDaThi === 0 ? "Chưa có bài nộp" : "Chưa có câu trả lời sai"} />
              )}
              {thongKe && thongKe.cauSaiNhieuNhat.length > 0 && (
                <ol className="bc-cau-sai">
                  {thongKe.cauSaiNhieuNhat.map((c) => (
                    <li key={c.maCauHoi}>
                      <span className="bc-ma-cau">{c.maCauHoi}</span>
                      <div className="bc-cau-noi-dung">
                        <span title={c.noiDung}>{c.noiDung}</span>
                        <small>{c.soSai}/{c.soLuot} sai · chọn sai {c.soChonSai} · bỏ trống {c.soBoTrong}</small>
                      </div>
                      <span className="bc-ty-le">
                        <strong>{dinhDangPhanTram.format(c.tyLeSai)}%</strong>
                        <span className="tq-progress"><i style={{ width: `${c.tyLeSai}%` }} /></span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </section>

          <section className="panel tq-panel">
            <header className="tq-panel-head">
              <h3>Tỷ lệ trả lời đúng theo KQHT và mức độ</h3>
              <span className="bc-chu-thich">Bỏ trống tính là sai</span>
            </header>
            {!thongKe && !loiThongKe && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
            {thongKe && thongKe.chiSo.soDaThi === 0 && <TrangThaiTrong bieuTuong="activity" tieuDe="Chưa có bài nộp" />}
            {thongKe && thongKe.chiSo.soDaThi > 0 && <BangTheoKqht bang={thongKe.tyLeDungTheoKqht} />}
          </section>

          <section className="panel table-panel">
            <div className="table-toolbar">
              <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm thí sinh" maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm MSSV hoặc họ tên" value={query} /></div>
              <select aria-label="Trạng thái bài" onChange={(event) => { setTrangThai(event.target.value as TrangThaiKetQuaThiSinh | ""); setTrang(1); }} value={trangThai}>
                <option value="">Tất cả trạng thái</option>
                {(Object.keys(NHAN_TRANG_THAI) as TrangThaiKetQuaThiSinh[]).map((tt) => <option key={tt} value={tt}>{NHAN_TRANG_THAI[tt]}</option>)}
              </select>
            </div>
            {loiBang ? (
              <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được bảng điểm</strong><span>{loiBang}</span><button className="button button-secondary" onClick={() => setLanTai((x) => x + 1)} type="button">Thử lại</button></div>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead><tr><th>MSSV</th><th>HỌ TÊN</th><th>LỚP</th><th>MÁY</th><th>MÃ ĐỀ</th><th>ĐÚNG</th><th>SAI</th><th>ĐIỂM</th><th>TRẠNG THÁI</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                    <tbody>
                      {bangDiem?.duLieu.map((d) => (
                        <tr key={d.msts}>
                          <td>{d.msts}</td>
                          <td><strong>{d.hoTen}</strong></td>
                          <td>{d.lop ?? "—"}</td>
                          <td>{d.soMay ?? "—"}</td>
                          <td>{d.tenDeCon ?? "—"}</td>
                          <td>{d.soCauDung === null ? "—" : `${d.soCauDung}/${d.tongSoCau}`}</td>
                          <td>{d.soCauSai ?? "—"}</td>
                          <td><strong>{diem(d.diem)}</strong></td>
                          <td><span className={`status-dot ${LOP_TRANG_THAI[d.trangThai]}`}>{NHAN_TRANG_THAI[d.trangThai]}</span></td>
                          <td>
                            {(d.trangThai === "da_nop" || d.trangThai === "he_thong_thu") && (
                              <div className="row-actions">
                                <button aria-label={`Xem bài của ${d.msts}`} className="row-action" onClick={() => setXemBai(d.msts)} title="Xem bài làm" type="button"><BieuTuong name="eye" size={16} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {bangDiem && bangDiem.duLieu.length === 0 && (
                        <tr><td className="cell-loading" colSpan={10}>{tuKhoa || trangThai ? "Không có thí sinh phù hợp." : "Kỳ thi chưa phân công thí sinh."}</td></tr>
                      )}
                      {!bangDiem && <tr><td className="cell-loading" colSpan={10}>Đang tải…</td></tr>}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span><strong>{dinhDangSo.format(bangDiem?.tongSoDong ?? 0)}</strong> thí sinh</span>
                  <div className="pagination">
                    <button aria-label="Trang trước" disabled={dangTaiBang || trang <= 1} onClick={() => setTrang((x) => x - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
                    <span>Trang {bangDiem && bangDiem.tongSoTrang > 0 ? bangDiem.trang : 0} / {bangDiem?.tongSoTrang ?? 0}</span>
                    <button aria-label="Trang sau" disabled={dangTaiBang || !bangDiem || trang >= bangDiem.tongSoTrang} onClick={() => setTrang((x) => x + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {xemBai && maKT !== null && <HopThoaiBaiLam maKT={maKT} msts={xemBai} onDong={() => setXemBai(null)} />}
    </div>
  );
}
