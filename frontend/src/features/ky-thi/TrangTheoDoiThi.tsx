import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { GiamSatKyThi, KyThiTomTat, ThiSinhGiamSat, TrangThaiThiSinhKyThi } from "../../types/api";
import { laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { kyThiApi } from "./api";
import { demNguoc, khungGio, lopTrangThaiThiSinh, mauTrangThaiKyThi, nhanTrangThaiKyThi, nhanTrangThaiThiSinh } from "./hienThiKyThi";

const CHU_KY_LAM_MOI_MS = 10_000;
/** Bài đang làm mà quá thời gian này không tự lưu thì đánh dấu để giám thị kiểm tra máy. */
const NGUONG_IM_LANG_MS = 2 * 60_000;
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dinhDangGioGiay = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function truocDay(ms: number) {
  const giay = Math.max(0, Math.round(ms / 1000));
  if (giay < 60) return `${giay} giây trước`;
  const phut = Math.floor(giay / 60);
  return phut < 60 ? `${phut} phút trước` : `${Math.floor(phut / 60)} giờ trước`;
}

function HopThoaiCongGio({ thiSinh, onDong, onXacNhan }: { thiSinh: ThiSinhGiamSat; onDong: () => void; onXacNhan: (soPhut: number, lyDo: string) => Promise<void> }) {
  const [soPhut, setSoPhut] = useState(5);
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !dangLuu) onDong(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dangLuu, onDong]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(soPhut) || soPhut < 1 || soPhut > 120) { setLoi("Số phút phải từ 1 đến 120."); return; }
    if (!lyDo.trim()) { setLoi("Nhập lý do cộng giờ."); return; }
    setDangLuu(true);
    setLoi(null);
    try {
      await onXacNhan(soPhut, lyDo.trim());
    } catch (error) {
      setLoi(thongBaoLoi(error));
      setDangLuu(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !dangLuu) onDong(); }}>
      <section aria-labelledby="extra-time-title" aria-modal="true" className="form-dialog" role="dialog">
        <header>
          <div><span className="dialog-icon"><BieuTuong name="clock" size={20} /></span><div><h3 id="extra-time-title">Cộng giờ — {thiSinh.hoTen}</h3></div></div>
          <button aria-label="Đóng" className="dialog-close" disabled={dangLuu} onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <form noValidate onSubmit={handleSubmit}>
          <div className="dialog-body">
            {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}
            <label className="dialog-field full"><span>Số phút cộng thêm <em>*</em></span><input autoFocus max={120} min={1} onChange={(event) => setSoPhut(Math.trunc(Number(event.target.value)) || 0)} type="number" value={soPhut} />{thiSinh.phutCongThem > 0 && <small className="field-help">Đã cộng {thiSinh.phutCongThem} phút.</small>}</label>
            <label className="dialog-field full"><span>Lý do <em>*</em></span><textarea maxLength={500} onChange={(event) => setLyDo(event.target.value)} placeholder="Ví dụ: Máy treo, phải khởi động lại" rows={3} value={lyDo} /></label>
          </div>
          <footer>
            <button className="button button-secondary" disabled={dangLuu} onClick={onDong} type="button">Hủy</button>
            <button aria-busy={dangLuu} className="button button-primary" disabled={dangLuu} type="submit"><BieuTuong name="plus" size={16} /> {dangLuu ? "Đang lưu…" : `Cộng ${soPhut || ""} phút`}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

/** Thu bài khi có sự cố (vi phạm quy chế, thí sinh rời phòng…): chấm ngay, không mở lại được. */
function HopThoaiThuBai({ thiSinh, tongSoCau, onDong, onXacNhan }: { thiSinh: ThiSinhGiamSat; tongSoCau: number; onDong: () => void; onXacNhan: (lyDo: string) => Promise<void> }) {
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !dangLuu) onDong(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dangLuu, onDong]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!lyDo.trim()) { setLoi("Nhập lý do thu bài."); return; }
    setDangLuu(true);
    setLoi(null);
    try {
      await onXacNhan(lyDo.trim());
    } catch (error) {
      setLoi(thongBaoLoi(error));
      setDangLuu(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !dangLuu) onDong(); }}>
      <section aria-labelledby="collect-title" aria-modal="true" className="form-dialog" role="dialog">
        <header>
          <div><span className="dialog-icon danger"><BieuTuong name="lock" size={20} /></span><div><h3 id="collect-title">Thu bài — {thiSinh.hoTen}</h3></div></div>
          <button aria-label="Đóng" className="dialog-close" disabled={dangLuu} onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <form noValidate onSubmit={handleSubmit}>
          <div className="dialog-body">
            {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}
            <p className="dialog-note">Bài của {thiSinh.msts} (đã làm {thiSinh.soCauDaLam}/{tongSoCau} câu) sẽ được chấm ngay với các câu đã lưu. Thí sinh không làm tiếp được và không thể hoàn tác.</p>
            <label className="dialog-field full"><span>Lý do <em>*</em></span><textarea autoFocus maxLength={500} onChange={(event) => setLyDo(event.target.value)} placeholder="Ví dụ: Sử dụng tài liệu trong giờ thi" rows={3} value={lyDo} /></label>
          </div>
          <footer>
            <button className="button button-secondary" disabled={dangLuu} onClick={onDong} type="button">Hủy</button>
            <button aria-busy={dangLuu} className="button button-danger" disabled={dangLuu} type="submit"><BieuTuong name="lock" size={16} /> {dangLuu ? "Đang thu…" : "Thu bài"}</button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function TrangTheoDoiThi() {
  const [params, setParams] = useSearchParams();
  const maKT = Number(params.get("maKT")) || null;

  const [dsKyThi, setDsKyThi] = useState<KyThiTomTat[]>([]);
  const [giamSat, setGiamSat] = useState<GiamSatKyThi | null>(null);
  const [capNhatLuc, setCapNhatLuc] = useState<Date | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [lanTai, setLanTai] = useState(0);
  const [doLech, setDoLech] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loc, setLoc] = useState<"" | TrangThaiThiSinhKyThi>("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [congGio, setCongGio] = useState<ThiSinhGiamSat | null>(null);
  const [thuBai, setThuBai] = useState<ThiSinhGiamSat | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);

  // Kỳ thi theo dõi được: đang thi, sắp diễn ra, đã kết thúc gần đây.
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      kyThiApi.danhSach({ trangThai: "dang_thi", kichThuocTrang: 50 }, controller.signal),
      kyThiApi.danhSach({ trangThai: "da_phat_hanh", kichThuocTrang: 50 }, controller.signal),
      kyThiApi.danhSach({ trangThai: "da_ket_thuc", kichThuocTrang: 20 }, controller.signal),
    ])
      .then(([dangThi, sapToi, daXong]) => {
        const ds = [...dangThi.duLieu, ...sapToi.duLieu.sort((a, b) => a.tgBatDau.localeCompare(b.tgBatDau)), ...daXong.duLieu];
        setDsKyThi(ds);
        if (!maKT && dangThi.duLieu[0]) setParams({ maKT: String(dangThi.duLieu[0].maKT) }, { replace: true });
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoi(thongBaoLoi(error)); });
    return () => controller.abort();
  }, [maKT, setParams]);

  // Số liệu giám sát, làm mới định kỳ.
  useEffect(() => {
    if (!maKT) { setGiamSat(null); return undefined; }
    const controller = new AbortController();
    const tai = () => kyThiApi.giamSat(maKT, controller.signal)
      .then((data) => {
        setGiamSat(data);
        setDoLech(new Date(data.gioServer).getTime() - Date.now());
        setCapNhatLuc(new Date());
        setLoi(null);
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoi(thongBaoLoi(error)); });
    void tai();
    const timer = window.setInterval(() => void tai(), CHU_KY_LAM_MOI_MS);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [maKT, lanTai]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lamMoi = useCallback(() => setLanTai((x) => x + 1), []);
  const gioServer = now + doLech;

  const hienThi = useMemo(() => {
    if (!giamSat) return [];
    const tu = tuKhoa.trim().toLowerCase();
    return giamSat.thiSinh.filter((ts) =>
      (!loc || ts.trangThai === loc)
      && (!tu || `${ts.msts} ${ts.hoTen} ${ts.lop ?? ""} ${ts.soMay ?? ""}`.toLowerCase().includes(tu)));
  }, [giamSat, loc, tuKhoa]);

  const batDau = giamSat ? new Date(giamSat.tgBatDau).getTime() : 0;
  const ketThuc = giamSat ? new Date(giamSat.ketThucLuc).getTime() : 0;
  const dongHo = !giamSat ? null
    : gioServer < batDau ? { nhan: "BẮT ĐẦU SAU", giaTri: demNguoc(batDau - gioServer) }
      : gioServer < ketThuc ? { nhan: "CÒN LẠI", giaTri: demNguoc(ketThuc - gioServer) }
        : { nhan: "ĐÃ HẾT GIỜ CHUNG", giaTri: dinhDangGio.format(new Date(ketThuc)) };

  const theStat: { nhan: string; giaTri: number; loc: "" | TrangThaiThiSinhKyThi }[] = giamSat ? [
    { nhan: "ĐƯỢC PHÂN CÔNG", giaTri: giamSat.soLuong.duocPhanCong, loc: "" },
    { nhan: "CHƯA VÀO THI", giaTri: giamSat.soLuong.chuaVao, loc: "chua_thi" },
    { nhan: "ĐANG LÀM BÀI", giaTri: giamSat.soLuong.dangLam, loc: "dang_thi" },
    { nhan: "ĐÃ NỘP", giaTri: giamSat.soLuong.daNop, loc: "da_nop" },
    { nhan: "HỆ THỐNG THU", giaTri: giamSat.soLuong.heThongThu, loc: "he_thong_thu" },
  ] : [];

  return (
    <div className="page-stack monitor-page">
      <section className="page-heading-row">
        <div>
          <h2>Theo dõi thi</h2>
        </div>
        <div className="heading-actions">
          <select aria-label="Chọn kỳ thi" className="assign-exam-select" onChange={(event) => setParams(event.target.value ? { maKT: event.target.value } : {})} value={maKT ?? ""}>
            <option value="">Chọn kỳ thi…</option>
            {dsKyThi.map((kt) => <option key={kt.maKT} value={kt.maKT}>{kt.tenKT} — {nhanTrangThaiKyThi[kt.trangThai]}</option>)}
          </select>
          <button aria-label="Làm mới" className="button button-secondary" disabled={!maKT} onClick={lamMoi} type="button"><BieuTuong name="activity" size={16} /> Làm mới</button>
        </div>
      </section>

      {thongBao && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> {thongBao}</span>
          <button aria-label="Đóng thông báo" onClick={() => setThongBao(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}
      {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}

      {!maKT ? (
        <section className="panel">
          <div className="empty-state">
            <BieuTuong name="activity" size={28} />
            <strong>{dsKyThi.length ? "Chọn kỳ thi cần theo dõi" : "Chưa có kỳ thi nào đã phát hành"}</strong>
            <span>Kỳ thi đang diễn ra sẽ được chọn tự động.</span>
            <Link className="button button-secondary" to="/quan-tri/ky-thi">Tới quản lý kỳ thi</Link>
          </div>
        </section>
      ) : !giamSat ? (
        <div className="outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>
      ) : (
        <>
          <section className="panel monitor-head">
            <div className="monitor-head-main">
              <span className={`exam-status ${mauTrangThaiKyThi[giamSat.trangThai]}`}>{nhanTrangThaiKyThi[giamSat.trangThai]}</span>
              <h3>{giamSat.tenKT}</h3>
              <p>{giamSat.monThi} · {khungGio(giamSat.tgBatDau, Math.round((ketThuc - batDau) / 60_000))} · vào thi muộn nhất {dinhDangGio.format(new Date(giamSat.dongCongLuc))} · {giamSat.tongSoCau} câu</p>
            </div>
            {dongHo && (
              <div className="monitor-clock">
                <span>{dongHo.nhan}</span>
                <strong>{dongHo.giaTri}</strong>
                {capNhatLuc && <small>Cập nhật {dinhDangGioGiay.format(capNhatLuc)}</small>}
              </div>
            )}
          </section>

          <section aria-label="Tóm tắt" className="mini-stats-grid monitor-stats">
            {theStat.map((the) => (
              <button aria-pressed={loc === the.loc && the.loc !== ""} className={`monitor-stat${loc === the.loc && the.loc !== "" ? " is-active" : ""}`} key={the.nhan} onClick={() => setLoc(loc === the.loc ? "" : the.loc)} type="button">
                <p><small>{the.nhan}</small><strong>{the.giaTri}</strong></p>
              </button>
            ))}
          </section>

          <section className="panel table-panel">
            <div className="table-toolbar">
              <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm thí sinh" onChange={(event) => setTuKhoa(event.target.value)} placeholder="Tìm mã số, họ tên, lớp, số máy" value={tuKhoa} /></div>
              <select aria-label="Lọc trạng thái" onChange={(event) => setLoc(event.target.value as typeof loc)} value={loc}>
                <option value="">Tất cả trạng thái</option>
                {(Object.keys(nhanTrangThaiThiSinh) as TrangThaiThiSinhKyThi[]).map((tt) => <option key={tt} value={tt}>{nhanTrangThaiThiSinh[tt]}</option>)}
              </select>
            </div>
            <div className="table-scroll">
              <table className="data-table monitor-table">
                <thead><tr><th>MÁY</th><th>THÍ SINH</th><th>ĐỀ</th><th>TRẠNG THÁI</th><th>TIẾN ĐỘ</th><th>VÀO LÚC</th><th>HOẠT ĐỘNG CUỐI</th><th>HẠN NỘP</th><th>ĐIỂM</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                <tbody>
                  {hienThi.map((ts) => {
                    const imLang = ts.trangThai === "dang_thi" && ts.lanHoatDongCuoi !== null && gioServer - new Date(ts.lanHoatDongCuoi).getTime() > NGUONG_IM_LANG_MS;
                    const phanTram = giamSat.tongSoCau ? Math.round((ts.soCauDaLam * 100) / giamSat.tongSoCau) : 0;
                    return (
                      <tr className={imLang ? "monitor-row-idle" : undefined} key={ts.msts}>
                        <td><strong>{ts.soMay ?? <span className="muted-cell">—</span>}</strong></td>
                        <td><div className="student-name-cell"><div><strong>{ts.hoTen}</strong><small>{ts.msts}{ts.lop ? ` · ${ts.lop}` : ""}</small></div></div></td>
                        <td><span className="tag">{ts.tenDeCon}</span></td>
                        <td><span className={`status-dot ${lopTrangThaiThiSinh[ts.trangThai]}`}>{nhanTrangThaiThiSinh[ts.trangThai]}</span></td>
                        <td>{ts.maBL ? <div className="progress-cell"><span><i style={{ width: `${phanTram}%` }} /></span><strong>{ts.soCauDaLam}/{giamSat.tongSoCau}</strong></div> : <span className="muted-cell">—</span>}</td>
                        <td>{ts.tgVaoThi ? dinhDangGio.format(new Date(ts.tgVaoThi)) : <span className="muted-cell">—</span>}</td>
                        <td>{ts.trangThai === "dang_thi" && ts.lanHoatDongCuoi ? <span className={imLang ? "monitor-idle" : undefined}>{imLang && <BieuTuong name="alert" size={14} />} {truocDay(gioServer - new Date(ts.lanHoatDongCuoi).getTime())}</span> : ts.tgNop ? `Nộp ${dinhDangGio.format(new Date(ts.tgNop))}` : <span className="muted-cell">—</span>}</td>
                        <td>{ts.hanNop ? <>{dinhDangGio.format(new Date(ts.hanNop))}{ts.phutCongThem > 0 && <small className="monitor-extra">+{ts.phutCongThem} phút</small>}</> : <span className="muted-cell">—</span>}</td>
                        <td>{ts.diem !== null ? <strong>{dinhDangDiem.format(ts.diem)}</strong> : <span className="muted-cell">—</span>}</td>
                        <td>
                          {ts.trangThai === "dang_thi" && ts.maBL && (
                            <div className="row-actions">
                              <button aria-label={`Cộng giờ cho ${ts.hoTen}`} className="row-action" onClick={() => setCongGio(ts)} title="Cộng giờ" type="button"><BieuTuong name="clock" size={16} /></button>
                              <button aria-label={`Thu bài của ${ts.hoTen}`} className="row-action danger" onClick={() => setThuBai(ts)} title="Thu bài" type="button"><BieuTuong name="lock" size={16} /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {giamSat.thiSinh.length === 0 && <div className="empty-state"><BieuTuong name="users" size={28} /><strong>Kỳ thi chưa có thí sinh</strong><Link className="button button-secondary" to={`/quan-tri/phan-cong-thi?maKT=${giamSat.maKT}`}>Phân công thí sinh</Link></div>}
            {giamSat.thiSinh.length > 0 && hienThi.length === 0 && <div className="empty-state"><BieuTuong name="search" size={28} /><strong>Không có thí sinh khớp bộ lọc</strong></div>}
            <div className="table-footer"><span><strong>{hienThi.length}</strong> / {giamSat.thiSinh.length} thí sinh</span><span>Dòng tô vàng: đang làm nhưng không có hoạt động quá 2 phút</span></div>
          </section>
        </>
      )}

      {congGio && giamSat && (
        <HopThoaiCongGio
          onDong={() => setCongGio(null)}
          onXacNhan={async (soPhut, lyDo) => {
            await kyThiApi.congGio(giamSat.maKT, congGio.maBL!, soPhut, lyDo);
            setThongBao(`Đã cộng ${soPhut} phút cho ${congGio.hoTen} (${congGio.msts}).`);
            setCongGio(null);
            lamMoi();
          }}
          thiSinh={congGio}
        />
      )}
      {thuBai && giamSat && (
        <HopThoaiThuBai
          onDong={() => setThuBai(null)}
          onXacNhan={async (lyDo) => {
            await kyThiApi.thuBai(giamSat.maKT, thuBai.maBL!, lyDo);
            setThongBao(`Đã thu bài của ${thuBai.hoTen} (${thuBai.msts}).`);
            setThuBai(null);
            lamMoi();
          }}
          thiSinh={thuBai}
          tongSoCau={giamSat.tongSoCau}
        />
      )}
    </div>
  );
}
