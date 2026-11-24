import { useEffect, useMemo, useRef, useState } from "react";

import { BieuTuong } from "../../components/BieuTuong";
import type { KyThiTomTat } from "../../types/api";
import { kyThiApi } from "../ky-thi/api";
import { TrangThaiTrong } from "./TrangThaiTrong";

/*
 * Lượt thi = số bài đã nộp (kể cả hệ thống thu) của kỳ thi đang thi hoặc đã kết thúc, gom theo thời điểm
 * bắt đầu kỳ thi. Kỳ thi đã kết thúc được tải thêm từng trang (API trả mới nhất trước) cho tới khi phủ
 * hết khoảng đang chọn.
 */

type LuaChon = "30" | "tuy_chinh";
type KieuNhom = "gio" | "ngay" | "tuan" | "thang";
type Cot = { nhan: string; nhanDayDu: string; luot: number; hienTai: boolean };

const MOT_NGAY = 86_400_000;
const KICH_THUOC_TRANG = 100;
const SO_NGAY_TOI_DA = 366;
const GIO_TRONG_NGAY = Array.from({ length: 11 }, (_, i) => 7 + i); // 7h–17h
/** Mặc định xem 30 ngày gần nhất; khoảng khác chọn qua "Tùy chỉnh". */
const SO_NGAY_MAC_DINH = 30;
const MOC_CO_SAN: [LuaChon, string][] = [["30", `${SO_NGAY_MAC_DINH} ngày`]];

const dinhDangSo = new Intl.NumberFormat("vi-VN");
const dinhDangPhanTram = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const ngayNgan = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });
const ngayDayDu = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const hai = (n: number) => String(n).padStart(2, "0");
/** dd/MM và MM/yyyy ghép tay: Intl vi-VN cho "tháng 05, 2026" và dấu gạch không đồng nhất. */
const ngayThang = (ms: number) => { const d = new Date(ms); return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}`; };
const thangNam = (d: Date) => `${hai(d.getMonth() + 1)}/${d.getFullYear()}`;

const dauNgay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const congNgay = (ms: number, soNgay: number) => { const d = new Date(ms); d.setDate(d.getDate() + soNgay); return d.getTime(); };
/** yyyy-mm-dd theo giờ máy, dùng cho input type="date". */
const sangChuoiNgay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tuChuoiNgay = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
const soNgayGiua = (tu: number, den: number) => Math.round((den - tu) / MOT_NGAY) + 1;

/** Mốc trên cùng của trục: 4 khoảng đều, mỗi khoảng là bước "đẹp" (1; 1,5; 2; 2,5; 3; 4; 5; 6; 8 × 10^k). */
export function mocTruc(lonNhat: number) {
  if (lonNhat <= 4) return 4;
  const tho = lonNhat / 4;
  const bac = 10 ** Math.floor(Math.log10(tho));
  // Lượt thi là số nguyên nên bước trục cũng phải nguyên (tránh vạch 2,5 hiện thành 3).
  return Math.ceil([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((he) => he * bac >= tho)! * bac) * 4;
}

/** Nhóm theo giờ khi chọn một ngày, theo ngày tới 31 ngày, theo tuần tới 186 ngày, còn lại theo tháng. */
function chonKieuNhom(soNgay: number): KieuNhom {
  if (soNgay <= 1) return "gio";
  if (soNgay <= 31) return "ngay";
  if (soNgay <= 186) return "tuan";
  return "thang";
}

function dungCot(coBai: KyThiTomTat[], tu: number, den: number, now: number): Cot[] {
  const kieu = chonKieuNhom(soNgayGiua(tu, den));
  const ketThuc = congNgay(den, 1); // mốc mở: hết ngày "đến"
  const homNay = dauNgay(now);
  const batDau = coBai.map((kt) => ({ ms: new Date(kt.tgBatDau).getTime(), luot: kt.soDaNop })).filter((x) => x.ms >= tu && x.ms < ketThuc);
  const dem = (a: number, b: number) => batDau.reduce((t, x) => (x.ms >= a && x.ms < b ? t + x.luot : t), 0);

  if (kieu === "gio") {
    const gioHienTai = tu === homNay ? new Date(now).getHours() : -1;
    return GIO_TRONG_NGAY.map((gio) => {
      // Giờ ngoài 7h–17h dồn vào cột đầu hoặc cuối.
      const luot = batDau.reduce((t, x) => {
        const g = Math.min(Math.max(new Date(x.ms).getHours(), GIO_TRONG_NGAY[0]), GIO_TRONG_NGAY[GIO_TRONG_NGAY.length - 1]);
        return g === gio ? t + x.luot : t;
      }, 0);
      return { nhan: `${gio}h`, nhanDayDu: `${gio}:00–${gio + 1}:00`, luot, hienTai: gio === gioHienTai };
    });
  }

  const cot: Cot[] = [];
  let moc = tu;
  while (moc < ketThuc) {
    let tiep: number;
    let nhan: string;
    let nhanDayDu: string;
    if (kieu === "ngay") {
      tiep = congNgay(moc, 1);
      nhan = ngayNgan.format(new Date(moc));
      nhanDayDu = ngayDayDu.format(new Date(moc));
    } else if (kieu === "tuan") {
      // Tuần bắt đầu thứ Hai; tuần đầu và cuối cắt theo khoảng đã chọn.
      const thu = (new Date(moc).getDay() + 6) % 7;
      tiep = Math.min(congNgay(moc, 7 - thu), ketThuc);
      nhan = ngayNgan.format(new Date(moc));
      nhanDayDu = `${ngayNgan.format(new Date(moc))} – ${ngayNgan.format(new Date(congNgay(tiep, -1)))}`;
    } else {
      const d = new Date(moc);
      tiep = Math.min(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), ketThuc);
      nhan = thangNam(d);
      nhanDayDu = `Tháng ${thangNam(d)}`;
    }
    cot.push({ nhan, nhanDayDu, luot: dem(moc, tiep), hienTai: homNay >= moc && homNay < tiep });
    moc = tiep;
  }
  return cot;
}

function BieuDo({ cot, moTa }: { cot: Cot[]; moTa: string }) {
  const lonNhat = Math.max(0, ...cot.map((c) => c.luot));
  const dinh = mocTruc(lonNhat);
  const vach = [1, 0.75, 0.5, 0.25, 0];
  const day = cot.length > 12;
  // Nhãn trục ngang: tối đa khoảng 7 nhãn, luôn giữ cột cuối.
  const buoc = Math.ceil(cot.length / 7);

  return (
    <div className="tq-chart" role="img" aria-label={`Biểu đồ lượt thi ${moTa}, cao nhất ${dinhDangSo.format(lonNhat)} lượt`}>
      <div aria-hidden="true" className="tq-chart-axis">
        {vach.map((v) => <span key={v}>{dinhDangSo.format(Math.round(dinh * v))}</span>)}
      </div>
      <div className="tq-chart-plot">
        <div aria-hidden="true" className="tq-chart-grid">{vach.map((v) => <i key={v} />)}</div>
        <div className={`tq-chart-bars${day ? " is-dense" : ""}`}>
          {cot.map((c, i) => {
            const hienNhan = !day || (cot.length - 1 - i) % buoc === 0;
            return (
              <div className={`tq-col${c.hienTai ? " is-today" : ""}${c.luot === lonNhat && lonNhat > 0 ? " is-peak" : ""}`} key={c.nhanDayDu}>
                <div className="tq-col-track">
                  {c.luot > 0 && <div className="tq-col-bar" style={{ height: `${(c.luot / dinh) * 100}%` }} />}
                  <span className="tq-tip">{c.nhanDayDu}: <strong>{dinhDangSo.format(c.luot)}</strong> lượt</span>
                </div>
                <small>{hienNhan ? c.nhan : " "}</small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChonKhoangNgay({ tuBanDau, denBanDau, homNay, onApDung, onDong }: {
  tuBanDau: number; denBanDau: number; homNay: number;
  onApDung: (tu: number, den: number) => void; onDong: () => void;
}) {
  const [tu, setTu] = useState(sangChuoiNgay(tuBanDau));
  const [den, setDen] = useState(sangChuoiNgay(denBanDau));
  const toiDa = sangChuoiNgay(homNay);

  let loi: string | null = null;
  if (!tu || !den) loi = "Chọn đủ ngày bắt đầu và kết thúc.";
  else if (tu > den) loi = "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  else if (den > toiDa) loi = "Ngày kết thúc không được sau hôm nay.";
  else if (soNgayGiua(tuChuoiNgay(tu), tuChuoiNgay(den)) > SO_NGAY_TOI_DA) loi = `Khoảng thời gian tối đa ${SO_NGAY_TOI_DA} ngày.`;

  return (
    <form
      aria-label="Chọn khoảng thời gian"
      className="tq-range-pop"
      noValidate
      onSubmit={(event) => { event.preventDefault(); if (!loi) onApDung(tuChuoiNgay(tu), tuChuoiNgay(den)); }}
      role="dialog"
    >
      <div className="tq-range-fields">
        <label><span>Từ ngày</span><input autoFocus max={den || toiDa} onChange={(event) => setTu(event.target.value)} type="date" value={tu} /></label>
        <label><span>Đến ngày</span><input max={toiDa} min={tu || undefined} onChange={(event) => setDen(event.target.value)} type="date" value={den} /></label>
      </div>
      {loi && (tu || den) && <p className="tq-range-error" role="alert">{loi}</p>}
      <div className="tq-range-actions">
        <button className="button button-sm button-secondary" onClick={onDong} type="button">Hủy</button>
        <button className="button button-sm button-primary" disabled={loi !== null} type="submit">Áp dụng</button>
      </div>
    </form>
  );
}

export function KhungLuotThi({ kyThi, now }: { kyThi: KyThiTomTat[] | null; now: number }) {
  const [chon, setChon] = useState<LuaChon>("30");
  const [tuyChinh, setTuyChinh] = useState<{ tu: number; den: number } | null>(null);
  const [moChon, setMoChon] = useState(false);
  const [them, setThem] = useState<{ ds: KyThiTomTat[]; trang: number; het: boolean; loi: boolean }>({ ds: [], trang: 1, het: false, loi: false });
  const vungChon = useRef<HTMLDivElement>(null);

  const homNay = dauNgay(now);
  const { tu, den } = chon === "tuy_chinh" && tuyChinh ? tuyChinh : { tu: congNgay(homNay, -(SO_NGAY_MAC_DINH - 1)), den: homNay };
  const moTa = chon === "tuy_chinh" ? `từ ${ngayDayDu.format(new Date(tu))} đến ${ngayDayDu.format(new Date(den))}` : `${SO_NGAY_MAC_DINH} ngày qua`;

  // Kỳ thi đã kết thúc: trang đầu do trang Tổng quan tải, các trang sau tải thêm tại đây.
  const daKetThuc = useMemo(() => {
    const ds = new Map<number, KyThiTomTat>();
    for (const kt of [...(kyThi ?? []), ...them.ds]) if (kt.trangThai === "da_ket_thuc") ds.set(kt.maKT, kt);
    return [...ds.values()];
  }, [kyThi, them.ds]);
  const daTaiHet = them.het || (kyThi !== null && them.trang === 1 && daKetThuc.length < KICH_THUOC_TRANG);
  const cuNhat = daKetThuc.reduce((min, kt) => Math.min(min, new Date(kt.tgBatDau).getTime()), Infinity);
  const canTaiThem = kyThi !== null && !daTaiHet && cuNhat >= tu;

  useEffect(() => {
    if (!canTaiThem) return;
    const huy = new AbortController();
    const trang = them.trang + 1;
    kyThiApi.danhSach({ trangThai: "da_ket_thuc", trang, kichThuocTrang: KICH_THUOC_TRANG }, huy.signal)
      .then((kq) => setThem((cu) => ({ ds: [...cu.ds, ...kq.duLieu], trang, het: trang >= kq.tongSoTrang || kq.duLieu.length < KICH_THUOC_TRANG, loi: false })))
      .catch(() => { if (!huy.signal.aborted) setThem((cu) => ({ ...cu, het: true, loi: true })); });
    return () => huy.abort();
  }, [canTaiThem, them.trang]);

  useEffect(() => {
    if (!moChon) return;
    const dongKhiBamNgoai = (event: MouseEvent) => { if (!vungChon.current?.contains(event.target as Node)) setMoChon(false); };
    const dongBangPhim = (event: KeyboardEvent) => { if (event.key === "Escape") setMoChon(false); };
    document.addEventListener("mousedown", dongKhiBamNgoai);
    document.addEventListener("keydown", dongBangPhim);
    return () => { document.removeEventListener("mousedown", dongKhiBamNgoai); document.removeEventListener("keydown", dongBangPhim); };
  }, [moChon]);

  const cot = useMemo(() => {
    const coBai = [...(kyThi ?? []).filter((kt) => kt.trangThai === "dang_thi"), ...daKetThuc];
    return dungCot(coBai, tu, den, now);
  }, [kyThi, daKetThuc, tu, den, now]);

  const tongLuot = cot.reduce((t, c) => t + c.luot, 0);
  const cotCaoNhat = cot.reduce<Cot | null>((max, c) => (c.luot > (max?.luot ?? 0) ? c : max), null);
  const soNgay = soNgayGiua(tu, den);
  const dangTai = kyThi === null || canTaiThem;

  return (
    <article className="panel tq-panel">
      <header className="tq-panel-head">
        <h3>Lượt thi</h3>
        <div className="tq-range" ref={vungChon}>
          <div aria-label="Khoảng thời gian" className="segmented tq-range-segmented" role="group">
            {MOC_CO_SAN.map(([giaTri, nhan]) => (
              <button aria-pressed={chon === giaTri} key={giaTri} onClick={() => { setChon(giaTri); setMoChon(false); }} type="button">{nhan}</button>
            ))}
            <button
              aria-expanded={moChon}
              aria-haspopup="dialog"
              aria-pressed={chon === "tuy_chinh"}
              onClick={() => setMoChon((mo) => !mo)}
              title="Chọn khoảng thời gian"
              type="button"
            >
              <BieuTuong name="calendar" size={15} />
              {chon === "tuy_chinh" ? `${ngayThang(tu)} – ${ngayThang(den)}` : "Tùy chỉnh"}
            </button>
          </div>
          {moChon && (
            <ChonKhoangNgay
              denBanDau={den}
              homNay={homNay}
              onApDung={(a, b) => { setTuyChinh({ tu: a, den: b }); setChon("tuy_chinh"); setMoChon(false); }}
              onDong={() => setMoChon(false)}
              tuBanDau={tu}
            />
          )}
        </div>
      </header>

      {dangTai && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2].map((x) => <span key={x} />)}</div>}
      {!dangTai && them.loi && tongLuot === 0 && <TrangThaiTrong bieuTuong="alert" moTa="Vui lòng tải lại trang để thử lại." tieuDe="Chưa tải đủ dữ liệu lượt thi" />}
      {!dangTai && !them.loi && tongLuot === 0 && (
        <TrangThaiTrong bieuTuong="activity" moTa="Số bài đã nộp sẽ hiển thị khi có kỳ thi diễn ra." tieuDe={`Chưa có lượt thi ${chon === "tuy_chinh" ? moTa : `trong ${moTa}`}`} />
      )}
      {!dangTai && tongLuot > 0 && (
        <>
          <dl className="tq-chart-summary">
            <div><dt>Tổng</dt><dd>{dinhDangSo.format(tongLuot)}</dd></div>
            <div><dt>Trung bình / ngày</dt><dd>{dinhDangPhanTram.format(tongLuot / soNgay)}</dd></div>
            <div><dt>Cao nhất</dt><dd>{cotCaoNhat ? <>{dinhDangSo.format(cotCaoNhat.luot)}<small> · {cotCaoNhat.nhanDayDu}</small></> : "—"}</dd></div>
          </dl>
          <BieuDo cot={cot} moTa={moTa} />
        </>
      )}
    </article>
  );
}
