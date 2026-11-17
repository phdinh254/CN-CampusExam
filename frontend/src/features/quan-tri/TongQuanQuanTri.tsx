import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { KyThiTomTat, NhatKy } from "../../types/api";
import { kyThiApi } from "../ky-thi/api";
import { mauTrangThaiKyThi, nhanTrangThaiKyThi } from "../ky-thi/hienThiKyThi";
import { cauHoiApi } from "../ngan-hang-cau-hoi/api";
import { thiSinhApi } from "../thi-sinh/api";
import { nhatKyApi } from "./api";

/*
 * Mọi số liệu lấy từ API. Lượt thi tính theo số bài đã nộp (kể cả hệ thống thu) của các kỳ thi,
 * gom theo ngày hoặc giờ bắt đầu kỳ thi.
 */

type KhoangLuotThi = "30_ngay" | "hom_nay";
type LocKyThi = "tat_ca" | "dang_thi" | "da_phat_hanh";

const MOT_NGAY = 86_400_000;
const GIO_HOM_NAY = Array.from({ length: 11 }, (_, i) => 7 + i); // 7h–17h
const SO_NHAT_KY = 8;

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

const dauNgay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Mốc trên cùng của trục: 4 khoảng đều, mỗi khoảng là bước "đẹp" (1; 1,5; 2; 2,5; 3; 4; 5; 6; 8 × 10^k). */
function mocTruc(lonNhat: number) {
  if (lonNhat <= 4) return 4;
  const tho = lonNhat / 4;
  const bac = 10 ** Math.floor(Math.log10(tho));
  const buoc = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((he) => he * bac >= tho)! * bac;
  return buoc * 4;
}

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

type Cot = { nhan: string; nhanDayDu: string; luot: number; homNay: boolean };

function BieuDoLuotThi({ cot, khoang }: { cot: Cot[]; khoang: KhoangLuotThi }) {
  const lonNhat = Math.max(0, ...cot.map((c) => c.luot));
  const dinh = mocTruc(lonNhat);
  const vach = [1, 0.75, 0.5, 0.25, 0];
  const day = cot.length > 12;
  const trong = lonNhat === 0;

  return (
    <div className="tq-chart" role="img" aria-label={`Biểu đồ lượt thi ${khoang === "30_ngay" ? "30 ngày qua" : "hôm nay"}, cao nhất ${dinhDangSo.format(lonNhat)} lượt`}>
      <div aria-hidden="true" className="tq-chart-axis">
        {vach.map((v) => <span key={v}>{dinhDangSo.format(Math.round(dinh * v))}</span>)}
      </div>
      <div className="tq-chart-plot">
        <div aria-hidden="true" className="tq-chart-grid">{vach.map((v) => <i key={v} />)}</div>
        <div className={`tq-chart-bars${day ? " is-dense" : ""}`}>
          {cot.map((c, i) => {
            const hienNhan = !day || c.homNay || (cot.length - 1 - i) % 5 === 0;
            return (
              <div className={`tq-col${c.homNay ? " is-today" : ""}${c.luot === lonNhat && lonNhat > 0 ? " is-peak" : ""}`} key={c.nhanDayDu}>
                <div className="tq-col-track">
                  {c.luot > 0 && <div className="tq-col-bar" style={{ height: `${(c.luot / dinh) * 100}%` }} />}
                  <span className="tq-tip">{c.nhanDayDu}: <strong>{dinhDangSo.format(c.luot)}</strong> lượt</span>
                </div>
                <small>{hienNhan ? (c.homNay && day ? "Hôm nay" : c.nhan) : " "}</small>
              </div>
            );
          })}
        </div>
        {trong && <p className="tq-chart-empty">Chưa có lượt thi nào {khoang === "30_ngay" ? "trong 30 ngày qua" : "hôm nay"}.</p>}
      </div>
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
  const [khoang, setKhoang] = useState<KhoangLuotThi>("30_ngay");

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
      den: "/admin/questions",
    },
    {
      nhan: "Kỳ thi đang diễn ra",
      giaTri: dsKyThi ? String(dangThi.length) : "…",
      phu: dsKyThi ? `${sapToi.length} kỳ thi sắp diễn ra trong 7 ngày` : "Đang tải",
      den: dangThi.length ? "/admin/exam-monitoring" : "/admin/exams",
    },
    {
      nhan: "Tổng số thí sinh",
      giaTri: tongThiSinh ? dinhDangSo.format(tongThiSinh.tong) : "…",
      phu: tongThiSinh ? `${dinhDangSo.format(tongThiSinh.chuaDoiMatKhau)} chưa đổi mật khẩu` : "Đang tải",
      den: "/admin/candidates",
    },
    {
      nhan: "Tỷ lệ hoàn thành bài thi",
      giaTri: !dsKyThi ? "…" : tongPhanCong ? `${dinhDangPhanTram.format((tongDaNop * 100) / tongPhanCong)}%` : "—",
      phu: !dsKyThi ? "Đang tải" : tongPhanCong ? `${dinhDangSo.format(tongDaNop)}/${dinhDangSo.format(tongPhanCong)} bài, 30 ngày qua` : "Chưa có kỳ thi kết thúc trong 30 ngày",
      den: "/admin/reports",
      dinhNghia: "Số bài đã nộp (kể cả hệ thống tự thu) chia số thí sinh được phân công, tính trên các kỳ thi đã kết thúc trong 30 ngày gần nhất.",
    },
  ];

  // Biểu đồ: số bài đã nộp của các kỳ thi đang thi hoặc đã kết thúc, theo ngày (30 ngày) hoặc giờ (hôm nay).
  const cot = useMemo<Cot[]>(() => {
    const coBai = kyThi.filter((kt) => kt.trangThai === "dang_thi" || kt.trangThai === "da_ket_thuc");
    const homNay = dauNgay(now);
    if (khoang === "30_ngay") {
      return Array.from({ length: 30 }, (_, i) => {
        const ngay = homNay - (29 - i) * MOT_NGAY;
        const luot = coBai
          .filter((kt) => dauNgay(new Date(kt.tgBatDau).getTime()) === ngay)
          .reduce((t, kt) => t + kt.soDaNop, 0);
        const nhan = dinhDangNgayNgan.format(new Date(ngay));
        return { nhan, nhanDayDu: nhan, luot, homNay: i === 29 };
      });
    }
    const gioHienTai = new Date(now).getHours();
    return GIO_HOM_NAY.map((gio) => {
      const luot = coBai
        .filter((kt) => {
          const d = new Date(kt.tgBatDau);
          const g = Math.min(Math.max(d.getHours(), GIO_HOM_NAY[0]), GIO_HOM_NAY[GIO_HOM_NAY.length - 1]);
          return dauNgay(d.getTime()) === homNay && g === gio;
        })
        .reduce((t, kt) => t + kt.soDaNop, 0);
      return { nhan: `${gio}h`, nhanDayDu: `${gio}:00–${gio + 1}:00`, luot, homNay: gio === gioHienTai };
    });
  }, [kyThi, khoang, now]);

  const tongLuot = cot.reduce((t, c) => t + c.luot, 0);
  const cotCaoNhat = cot.reduce<Cot | null>((max, c) => (c.luot > (max?.luot ?? 0) ? c : max), null);
  const trungBinh = khoang === "30_ngay" ? tongLuot / 30 : null;

  const dsHienThi = [...dangThi, ...sapToi]
    .filter((kt) => loc === "tat_ca" || kt.trangThai === loc)
    .sort((a, b) => (a.trangThai === b.trangThai ? a.tgBatDau.localeCompare(b.tgBatDau) : a.trangThai === "dang_thi" ? -1 : 1));

  return (
    <div className="page-stack dashboard-page">
      <section className="page-heading-row">
        <div>
          <h2>Tổng quan</h2>
          <p>Câu hỏi, kỳ thi, thí sinh và hoạt động mới nhất.</p>
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
        <article className="panel tq-panel">
          <header className="tq-panel-head">
            <div>
              <h3>Lượt thi</h3>
              <p>Số bài đã nộp, kể cả bài hệ thống tự thu</p>
            </div>
            <div aria-label="Khoảng thời gian" className="segmented" role="group">
              {([["30_ngay", "30 ngày qua"], ["hom_nay", "Hôm nay"]] as const).map(([giaTri, nhan]) => (
                <button aria-pressed={khoang === giaTri} key={giaTri} onClick={() => setKhoang(giaTri)} type="button">{nhan}</button>
              ))}
            </div>
          </header>
          <dl className="tq-chart-summary">
            <div><dt>Tổng</dt><dd>{dinhDangSo.format(tongLuot)}</dd></div>
            {trungBinh !== null && <div><dt>Trung bình / ngày</dt><dd>{dinhDangPhanTram.format(trungBinh)}</dd></div>}
            <div><dt>Cao nhất</dt><dd>{cotCaoNhat ? <>{dinhDangSo.format(cotCaoNhat.luot)}<small> · {cotCaoNhat.nhanDayDu}</small></> : "—"}</dd></div>
          </dl>
          {dsKyThi ? <BieuDoLuotThi cot={cot} khoang={khoang} /> : <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
        </article>

        <article className="panel tq-panel">
          <header className="tq-panel-head">
            <div>
              <h3>Kỳ thi</h3>
              <p>Đang diễn ra và sắp diễn ra trong 7 ngày</p>
            </div>
            <Link className="tq-more" to="/admin/exams">Xem tất cả <BieuTuong name="chevron-right" size={15} /></Link>
          </header>
          <div className="tq-filter">
            <div aria-label="Lọc theo trạng thái" className="segmented" role="group">
              {([["tat_ca", `Tất cả (${dangThi.length + sapToi.length})`], ["dang_thi", `Đang thi (${dangThi.length})`], ["da_phat_hanh", `Sắp diễn ra (${sapToi.length})`]] as const).map(([giaTri, nhan]) => (
                <button aria-pressed={loc === giaTri} key={giaTri} onClick={() => setLoc(giaTri)} type="button">{nhan}</button>
              ))}
            </div>
          </div>
          <ul className="tq-exams">
            {dsHienThi.map((kt) => {
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
                  <Link aria-label={`${dang ? "Theo dõi" : "Chi tiết"} kỳ thi ${kt.tenKT}`} className="row-link" to={dang ? `/admin/exam-monitoring?maKT=${kt.maKT}` : `/admin/exam-assignments?maKT=${kt.maKT}`}>{dang ? "Theo dõi" : "Chi tiết"}</Link>
                </li>
              );
            })}
          </ul>
          {dsKyThi && dsHienThi.length === 0 && (
            <div className="tq-empty">
              <strong>{loc === "dang_thi" ? "Không có kỳ thi nào đang diễn ra" : "Chưa có kỳ thi nào trong 7 ngày tới"}</strong>
              <Link className="button button-secondary" to="/admin/exams">Tạo kỳ thi</Link>
            </div>
          )}
          {!dsKyThi && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>}
        </article>
      </section>

      <article className="panel tq-panel">
        <header className="tq-panel-head">
          <div>
            <h3>Hoạt động gần đây</h3>
            <p>Thao tác quản trị mới nhất, không gồm đăng nhập</p>
          </div>
        </header>
        {nhatKy === null && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
        {nhatKy && nhatKy.length === 0 && <div className="tq-empty"><strong>Chưa có hoạt động nào</strong></div>}
        {nhatKy && nhatKy.length > 0 && (
          <ol className="tq-activity">
            {nhatKy.map((nk) => (
              <li key={nk.maNhatKy}>
                <span className="tq-activity-group">{NHAN_NHOM[nk.nhom] ?? nk.nhom}</span>
                <div className="tq-activity-main">
                  <strong>{nk.hanhDong}</strong>
                  {nk.chiTiet && <span title={nk.chiTiet}>{nk.chiTiet}</span>}
                </div>
                <time dateTime={nk.thoiGian} title={new Date(nk.thoiGian).toLocaleString("vi-VN")}>
                  {truocDay(now - new Date(nk.thoiGian).getTime(), now)}
                  {nk.nguoiThucHien && <small>{nk.nguoiThucHien}</small>}
                </time>
              </li>
            ))}
          </ol>
        )}
      </article>
    </div>
  );
}
