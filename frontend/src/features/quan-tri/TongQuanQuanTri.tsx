import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { KyThiTomTat, NhatKy } from "../../types/api";
import { kyThiApi } from "../ky-thi/api";
import { mauTrangThaiKyThi, nhanTrangThaiKyThi } from "../ky-thi/hienThiKyThi";
import { cauHoiApi } from "../ngan-hang-cau-hoi/api";
import { thiSinhApi } from "../thi-sinh/api";
import { nhatKyApi } from "./api";
import { KhungLuotThi } from "./KhungLuotThi";
import { TrangThaiTrong } from "./TrangThaiTrong";

/*
 * Mọi số liệu lấy từ API. Lượt thi tính theo số bài đã nộp (kể cả hệ thống thu) của các kỳ thi,
 * gom theo ngày hoặc giờ bắt đầu kỳ thi.
 */

type LocKyThi = "tat_ca" | "dang_thi" | "da_phat_hanh";

const MOT_NGAY = 86_400_000;
const SO_NHAT_KY = 6;
/** Giới hạn của API nhật ký. */
const SO_NHAT_KY_TOI_DA = 50;
/** Số dòng mỗi trang trong hộp thoại "Xem tất cả". */
const SO_NHAT_KY_MOI_TRANG = 10;
const SO_KY_THI = 5;

const dinhDangNgay = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dinhDangNgayNgan = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
const dinhDangSo = new Intl.NumberFormat("vi-VN");
const dinhDangPhanTram = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

const NHAN_NHOM: Record<string, string> = {
  KYTHI: "Kỳ thi",
  MATRAN: "Ma trận",
  DETHI: "Đề thi",
  CAUHOI: "Câu hỏi",
  THISINH: "Thí sinh",
  TAIKHOAN: "Tài khoản",
  KQHT: "KQHT",
};

function truocDay(ms: number, now: number) {
  const phut = Math.max(0, Math.round(ms / 60_000));
  if (phut < 1) return "Vừa xong";
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.floor(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  const ngay = Math.floor(gio / 24);
  return ngay < 7 ? `${ngay} ngày trước` : dinhDangNgayNgan.format(new Date(now - ms));
}

function conBao(ms: number) {
  const phut = Math.max(0, Math.round(ms / 60_000));
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  return gio < 24 ? `${gio} giờ ${phut % 60 ? `${phut % 60} phút` : ""}`.trim() : `${Math.floor(gio / 24)} ngày`;
}

const thoiDiem = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** Bảng hoạt động: loại, nội dung, người thực hiện, thời gian. Dùng chung cho trang và hộp thoại "Xem tất cả". */
function BangHoatDong({ ds, now }: { ds: NhatKy[]; now: number }) {
  return (
    <div className="tq-activity" role="table" aria-label="Hoạt động gần đây">
      <div className="tq-activity-row tq-activity-head" role="row">
        <span role="columnheader">Loại</span>
        <span role="columnheader">Nội dung</span>
        <span role="columnheader">Người thực hiện</span>
        <span role="columnheader">Thời gian</span>
      </div>
      {ds.map((nk) => {
        const luc = new Date(nk.thoiGian);
        return (
          <div className="tq-activity-row" key={nk.maNhatKy} role="row">
            <span role="cell"><span className={`tq-activity-group nhom-${nk.nhom.toLowerCase()}`}>{NHAN_NHOM[nk.nhom] ?? nk.nhom}</span></span>
            <div className="tq-activity-main" role="cell">
              <strong>{nk.hanhDong}</strong>
              {nk.chiTiet && <span title={nk.chiTiet}>{nk.chiTiet}</span>}
            </div>
            <span className="tq-activity-user" role="cell" title={nk.nguoiThucHien ?? undefined}>{nk.nguoiThucHien ?? "—"}</span>
            <time dateTime={nk.thoiGian} role="cell" title={luc.toLocaleString("vi-VN")}>
              {truocDay(now - luc.getTime(), now)}
              <small>{thoiDiem.format(luc)}</small>
            </time>
          </div>
        );
      })}
    </div>
  );
}

function HopThoaiHoatDong({ now, onDong }: { now: number; onDong: () => void }) {
  const [ds, setDs] = useState<NhatKy[] | null>(null);
  const [loi, setLoi] = useState(false);
  const [trang, setTrang] = useState(1);
  const soTrang = ds ? Math.max(1, Math.ceil(ds.length / SO_NHAT_KY_MOI_TRANG)) : 1;
  const dsTrang = ds?.slice((trang - 1) * SO_NHAT_KY_MOI_TRANG, trang * SO_NHAT_KY_MOI_TRANG) ?? [];

  useEffect(() => {
    const huy = new AbortController();
    nhatKyApi.ganDay(SO_NHAT_KY_TOI_DA, huy.signal).then(setDs).catch(() => { if (!huy.signal.aborted) setLoi(true); });
    const dongBangPhim = (event: KeyboardEvent) => { if (event.key === "Escape") onDong(); };
    document.addEventListener("keydown", dongBangPhim);
    return () => { huy.abort(); document.removeEventListener("keydown", dongBangPhim); };
  }, [onDong]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onDong(); }}>
      <section aria-labelledby="activity-dialog-title" aria-modal="true" className="form-dialog tq-activity-dialog" role="dialog">
        <header>
          <div><span className="dialog-icon"><BieuTuong name="activity" size={20} /></span><h3 id="activity-dialog-title">Hoạt động gần đây</h3></div>
          <button aria-label="Đóng" autoFocus className="dialog-close" onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <div className="dialog-body">
          {loi && <TrangThaiTrong bieuTuong="alert" tieuDe="Chưa tải được nhật ký" moTa="Vui lòng thử lại sau." />}
          {!loi && ds === null && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>}
          {ds && ds.length === 0 && <TrangThaiTrong bieuTuong="activity" tieuDe="Chưa có hoạt động nào" />}
          {ds && ds.length > 0 && <BangHoatDong ds={dsTrang} now={now} />}
        </div>
        {ds && ds.length > 0 && (
          <footer className="tq-activity-dialog-foot">
            <span>{ds.length} hoạt động gần nhất</span>
            <div className="pagination">
              <button aria-label="Trang trước" disabled={trang <= 1} onClick={() => setTrang((x) => x - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
              <span>Trang {trang} / {soTrang}</span>
              <button aria-label="Trang sau" disabled={trang >= soTrang} onClick={() => setTrang((x) => x + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
            </div>
          </footer>
        )}
      </section>
    </div>
  );
}

export default function TongQuanQuanTri() {
  const [tongCauHoi, setTongCauHoi] = useState<{ tong: number; dangDung: number } | null>(null);
  const [tongThiSinh, setTongThiSinh] = useState<{ tong: number; chuaDoiMatKhau: number } | null>(null);
  const [dsKyThi, setDsKyThi] = useState<KyThiTomTat[] | null>(null);
  const [nhatKy, setNhatKy] = useState<NhatKy[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loc, setLoc] = useState<LocKyThi>("tat_ca");
  const [xemNhatKy, setXemNhatKy] = useState(false);
  const dongNhatKy = useCallback(() => setXemNhatKy(false), []);

  useEffect(() => {
    const huy = new AbortController();
    cauHoiApi.thongKe(huy.signal)
      .then((tk) => setTongCauHoi({ tong: tk.tongSo, dangDung: tk.dangSuDung }))
      .catch(() => undefined);
    Promise.all([
      thiSinhApi.danhSach({ kichThuocTrang: 1 }, huy.signal),
      thiSinhApi.danhSach({ kichThuocTrang: 1, daDoiMatKhau: false }, huy.signal),
    ])
      .then(([tatCa, chuaDoi]) => setTongThiSinh({ tong: tatCa.tongSoDong, chuaDoiMatKhau: chuaDoi.tongSoDong }))
      .catch(() => undefined);
    Promise.all([
      kyThiApi.danhSach({ trangThai: "dang_thi", kichThuocTrang: 100 }, huy.signal),
      kyThiApi.danhSach({ trangThai: "da_phat_hanh", kichThuocTrang: 100 }, huy.signal),
      kyThiApi.danhSach({ trangThai: "da_ket_thuc", kichThuocTrang: 100 }, huy.signal),
    ])
      .then((ketQua) => { setDsKyThi(ketQua.flatMap((t) => t.duLieu)); setNow(Date.now()); })
      .catch(() => setDsKyThi([]));
    nhatKyApi.ganDay(SO_NHAT_KY, huy.signal).then(setNhatKy).catch(() => setNhatKy([]));
    // Thời gian tương đối và "bắt đầu sau" cập nhật mỗi phút.
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { huy.abort(); window.clearInterval(timer); };
  }, []);

  const kyThi = useMemo(() => dsKyThi ?? [], [dsKyThi]);
  const dangThi = kyThi.filter((kt) => kt.trangThai === "dang_thi");
  const sapToi = kyThi.filter((kt) => kt.trangThai === "da_phat_hanh" && new Date(kt.tgBatDau).getTime() - now < 7 * MOT_NGAY);

  // Tỷ lệ hoàn thành: kỳ thi kết thúc trong 30 ngày, tổng bài đã nộp / tổng thí sinh được phân công.
  const daKetThuc30 = kyThi.filter((kt) => kt.trangThai === "da_ket_thuc" && now - new Date(kt.tgBatDau).getTime() < 30 * MOT_NGAY);
  const tongPhanCong = daKetThuc30.reduce((t, kt) => t + kt.soThiSinh, 0);
  const tongDaNop = daKetThuc30.reduce((t, kt) => t + kt.soDaNop, 0);

  const the = [
    {
      nhan: "Tổng số câu hỏi",
      giaTri: tongCauHoi ? dinhDangSo.format(tongCauHoi.tong) : "…",
      phu: tongCauHoi ? `${dinhDangSo.format(tongCauHoi.dangDung)} câu đang sử dụng` : "Đang tải",
      den: "/quan-tri/cau-hoi",
    },
    {
      nhan: "Kỳ thi đang diễn ra",
      giaTri: dsKyThi ? String(dangThi.length) : "…",
      phu: dsKyThi ? `${sapToi.length} kỳ thi sắp diễn ra trong 7 ngày` : "Đang tải",
      den: dangThi.length ? "/quan-tri/theo-doi-thi" : "/quan-tri/ky-thi",
    },
    {
      nhan: "Tổng số thí sinh",
      giaTri: tongThiSinh ? dinhDangSo.format(tongThiSinh.tong) : "…",
      phu: tongThiSinh ? `${dinhDangSo.format(tongThiSinh.chuaDoiMatKhau)} chưa đổi mật khẩu` : "Đang tải",
      den: "/quan-tri/thi-sinh",
    },
    {
      nhan: "Tỷ lệ hoàn thành bài thi",
      giaTri: !dsKyThi ? "…" : tongPhanCong ? `${dinhDangPhanTram.format((tongDaNop * 100) / tongPhanCong)}%` : "—",
      phu: !dsKyThi ? "Đang tải" : tongPhanCong ? `${dinhDangSo.format(tongDaNop)}/${dinhDangSo.format(tongPhanCong)} bài, 30 ngày qua` : "Chưa có kỳ thi kết thúc trong 30 ngày",
      den: "/quan-tri/bao-cao",
      dinhNghia: "Số bài đã nộp (kể cả hệ thống tự thu) chia số thí sinh được phân công, tính trên các kỳ thi đã kết thúc trong 30 ngày gần nhất.",
    },
  ];

  const dsHienThi = [...dangThi, ...sapToi]
    .filter((kt) => loc === "tat_ca" || kt.trangThai === loc)
    .sort((a, b) => (a.trangThai === b.trangThai ? a.tgBatDau.localeCompare(b.tgBatDau) : a.trangThai === "dang_thi" ? -1 : 1));

  return (
    <div className="page-stack dashboard-page">
      <section className="page-heading-row">
        <div>
          <h2>Tổng quan</h2>
        </div>
        <div className="date-chip"><BieuTuong name="calendar" size={18} /><span><small>Hôm nay</small><strong>{dinhDangNgay.format(new Date(now))}</strong></span></div>
      </section>

      <section className="stats-grid">
        {the.map((t) => (
          <Link aria-label={`${t.nhan}: ${t.giaTri}. Xem chi tiết`} className="stat-card stat-link" key={t.nhan} title={t.dinhNghia} to={t.den}>
            <div className="stat-card-main">
              <span>{t.nhan}</span>
              <strong>{t.giaTri}</strong>
              <small>{t.phu}</small>
            </div>
            <BieuTuong name="arrow-right" size={16} />
          </Link>
        ))}
      </section>

      <section className="tq-grid">
        <KhungLuotThi kyThi={dsKyThi} now={now} />

        <article className="panel tq-panel">
          <header className="tq-panel-head">
            <h3>Kỳ thi</h3>
            <div aria-label="Lọc theo trạng thái" className="segmented" role="group">
              {([["tat_ca", `Tất cả (${dangThi.length + sapToi.length})`], ["dang_thi", `Đang thi (${dangThi.length})`], ["da_phat_hanh", `Sắp diễn ra (${sapToi.length})`]] as const).map(([giaTri, nhan]) => (
                <button aria-pressed={loc === giaTri} key={giaTri} onClick={() => setLoc(giaTri)} type="button">{nhan}</button>
              ))}
            </div>
          </header>
          <ul className="tq-exams">
            {dsHienThi.slice(0, SO_KY_THI).map((kt) => {
              const batDau = new Date(kt.tgBatDau).getTime();
              const ketThuc = batDau + kt.thoiLuong * 60_000;
              const dang = kt.trangThai === "dang_thi";
              const phanTram = kt.soThiSinh ? Math.round((kt.soDaNop * 100) / kt.soThiSinh) : 0;
              return (
                <li className="tq-exam" key={kt.maKT}>
                  <div className="tq-exam-main">
                    <strong title={kt.tenKT}>{kt.tenKT}</strong>
                    <span>{kt.monThi}{kt.maDeGocHienThi && ` · Đề ${kt.maDeGocHienThi}`}</span>
                  </div>
                  <div className="tq-exam-meta">
                    <span className="tq-exam-time"><strong>{dinhDangGio.format(new Date(batDau))} – {dinhDangGio.format(new Date(ketThuc))}</strong> · {dinhDangNgayNgan.format(new Date(batDau))} · {dang ? `còn ${conBao(ketThuc - now)}` : `bắt đầu sau ${conBao(batDau - now)}`}</span>
                    {dang ? (
                      <span className="tq-exam-progress">
                        <span className="tq-progress"><i style={{ width: `${phanTram}%` }} /></span>
                        <small>{kt.soDaNop}/{kt.soThiSinh} đã nộp</small>
                      </span>
                    ) : <span className="tq-exam-progress"><small>{kt.soThiSinh} thí sinh</small></span>}
                  </div>
                  <span className={`exam-status ${mauTrangThaiKyThi[kt.trangThai]}`}>{nhanTrangThaiKyThi[kt.trangThai]}</span>
                  <Link aria-label={`${dang ? "Theo dõi" : "Chi tiết"} kỳ thi ${kt.tenKT}`} className="row-link" to={dang ? `/quan-tri/theo-doi-thi?maKT=${kt.maKT}` : `/quan-tri/phan-cong-thi?maKT=${kt.maKT}`}>{dang ? "Theo dõi" : "Chi tiết"}</Link>
                </li>
              );
            })}
          </ul>
          {dsKyThi && dsHienThi.length === 0 && (
            <TrangThaiTrong
              bieuTuong="calendar"
              moTa="Tạo kỳ thi, gắn đề và thí sinh rồi phát hành để kỳ thi xuất hiện tại đây."
              tieuDe={loc === "dang_thi" ? "Không có kỳ thi đang diễn ra" : loc === "da_phat_hanh" ? "Không có kỳ thi trong 7 ngày tới" : "Chưa có kỳ thi đang hoặc sắp diễn ra"}
            >
              <Link className="button button-secondary" to="/quan-tri/ky-thi"><BieuTuong name="plus" size={16} /> Tạo kỳ thi</Link>
            </TrangThaiTrong>
          )}
          {!dsKyThi && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>}
          {dsHienThi.length > 0 && (
            <Link className="tq-more tq-panel-foot" to="/quan-tri/ky-thi">
              {dsHienThi.length > SO_KY_THI ? `Xem tất cả (còn ${dsHienThi.length - SO_KY_THI} kỳ thi)` : "Xem tất cả kỳ thi"} <BieuTuong name="chevron-right" size={15} />
            </Link>
          )}
        </article>
      </section>

      <article className="panel tq-panel">
        <header className="tq-panel-head">
          <h3>Hoạt động gần đây</h3>
          {nhatKy && nhatKy.length > 0 && (
            <button className="tq-more tq-more-button" onClick={() => setXemNhatKy(true)} type="button">Xem tất cả <BieuTuong name="chevron-right" size={15} /></button>
          )}
        </header>
        {nhatKy === null && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
        {nhatKy && nhatKy.length === 0 && <TrangThaiTrong bieuTuong="activity" moTa="Các thao tác quản trị sẽ được ghi lại tại đây." tieuDe="Chưa có hoạt động nào" />}
        {nhatKy && nhatKy.length > 0 && <BangHoatDong ds={nhatKy} now={now} />}
      </article>

      {xemNhatKy && <HopThoaiHoatDong now={now} onDong={dongNhatKy} />}
    </div>
  );
}
