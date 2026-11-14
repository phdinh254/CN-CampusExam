import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong, type TenBieuTuong } from "../../components/BieuTuong";
import { NhanMinhHoa } from "../../components/NhanMinhHoa";
import { cauHoiApi } from "../ngan-hang-cau-hoi/api";
import { thiSinhApi } from "../thi-sinh/api";

/*
 * Số liệu câu hỏi và thí sinh lấy từ API. Kỳ thi, lượt thi và nhật ký chưa có API
 * nên dùng dữ liệu minh họa và gắn nhãn "Minh họa" trên giao diện.
 */

type TrangThaiKyThi = "dang_thi" | "sap_dien_ra";

type KyThiSapToi = { ma: string; ten: string; batDau: Date; thoiLuong: number; soThiSinh: number; trangThai: TrangThaiKyThi };

const NHAN_TRANG_THAI: Record<TrangThaiKyThi, { nhan: string; lop: string }> = {
  dang_thi: { nhan: "Đang thi", lop: "tag-success" },
  sap_dien_ra: { nhan: "Sắp diễn ra", lop: "tag-indigo" },
};

/** Thời điểm cách hôm nay `soNgay` ngày, lúc gio:phut. */
function luc(soNgay: number, gio: number, phut = 0) {
  const d = new Date();
  d.setDate(d.getDate() + soNgay);
  d.setHours(gio, phut, 0, 0);
  return d;
}

function taoKyThiMinhHoa(): KyThiSapToi[] {
  return [
    { ma: "CSDL-01", ten: "Cơ sở dữ liệu nâng cao", batDau: luc(0, 9), thoiLuong: 60, soThiSinh: 120, trangThai: "dang_thi" },
    { ma: "OOP-03", ten: "Lập trình hướng đối tượng", batDau: luc(0, 14), thoiLuong: 90, soThiSinh: 86, trangThai: "sap_dien_ra" },
    { ma: "MMT-02", ten: "Mạng máy tính", batDau: luc(1, 8), thoiLuong: 60, soThiSinh: 64, trangThai: "sap_dien_ra" },
    { ma: "CTDL-05", ten: "Cấu trúc dữ liệu và giải thuật", batDau: luc(4, 13, 30), thoiLuong: 90, soThiSinh: 84, trangThai: "sap_dien_ra" },
  ];
}

const luotThi7Ngay = [
  { ngay: "T2", luot: 210 }, { ngay: "T3", luot: 268 }, { ngay: "T4", luot: 182 }, { ngay: "T5", luot: 328 },
  { ngay: "T6", luot: 236 }, { ngay: "T7", luot: 287 }, { ngay: "CN", luot: 231 },
];

const hoatDong = [
  { initials: "TH", title: "Trần Minh Hoàng đã tạo kỳ thi mới", meta: "Lập trình hướng đối tượng · 12 phút trước" },
  { initials: "NT", title: "Đã nhập 45 câu hỏi từ tệp Word", meta: "Ngân hàng Cơ sở dữ liệu · 35 phút trước" },
  { initials: "HT", title: "Kỳ thi Cấu trúc dữ liệu đã kết thúc", meta: "82/84 thí sinh đã nộp bài · 1 giờ trước" },
];

const dinhDangNgay = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dinhDangSo = new Intl.NumberFormat("vi-VN");
const ngayHomNay = () => dinhDangNgay.format(new Date());

const laHomNay = (ngay: Date) => ngay.toDateString() === new Date().toDateString();

type TheThongKe = {
  nhan: string;
  giaTri: string;
  phu: string;
  bieuTuong: TenBieuTuong;
  den: string;
  minhHoa?: boolean;
  dinhNghia?: string;
};

export default function TongQuanQuanTri() {
  const [tongCauHoi, setTongCauHoi] = useState<{ tong: number; dangDung: number } | null>(null);
  const [tongThiSinh, setTongThiSinh] = useState<{ tong: number; chuaDoiMatKhau: number } | null>(null);
  const [kyThi] = useState(taoKyThiMinhHoa);
  const [locTrangThai, setLocTrangThai] = useState<TrangThaiKyThi | "tat_ca">("tat_ca");
  const [locNgay, setLocNgay] = useState<"hom_nay" | "7_ngay">("7_ngay");

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
    return () => huy.abort();
  }, []);

  const kyThiHienThi = useMemo(() => {
    return kyThi.filter((kt) =>
      (locTrangThai === "tat_ca" || kt.trangThai === locTrangThai)
      && (locNgay === "7_ngay" || laHomNay(kt.batDau)));
  }, [kyThi, locTrangThai, locNgay]);

  const soDangThi = kyThi.filter((kt) => kt.trangThai === "dang_thi").length;

  const the: TheThongKe[] = [
    {
      nhan: "Tổng số câu hỏi",
      giaTri: tongCauHoi ? dinhDangSo.format(tongCauHoi.tong) : "…",
      phu: tongCauHoi ? `${dinhDangSo.format(tongCauHoi.dangDung)} câu đang sử dụng` : "Đang tải",
      bieuTuong: "book",
      den: "/admin/questions",
    },
    {
      nhan: "Kỳ thi đang diễn ra",
      giaTri: String(soDangThi),
      phu: `${kyThi.length - soDangThi} kỳ thi sắp diễn ra`,
      bieuTuong: "calendar",
      den: "/admin/exams",
      minhHoa: true,
    },
    {
      nhan: "Tổng số thí sinh",
      giaTri: tongThiSinh ? dinhDangSo.format(tongThiSinh.tong) : "…",
      phu: tongThiSinh ? `${dinhDangSo.format(tongThiSinh.chuaDoiMatKhau)} chưa đổi mật khẩu` : "Đang tải",
      bieuTuong: "users",
      den: "/admin/candidates",
    },
    {
      nhan: "Tỷ lệ hoàn thành bài thi",
      giaTri: "92,6%",
      phu: "Đã nộp / được phân công",
      bieuTuong: "activity",
      den: "/admin/reports",
      minhHoa: true,
      dinhNghia: "Số bài đã nộp (kể cả hệ thống tự thu) chia số thí sinh được phân công, tính trên các kỳ thi đã kết thúc trong 30 ngày gần nhất.",
    },
  ];

  const luotLonNhat = Math.max(...luotThi7Ngay.map((d) => d.luot));
  const tongLuot = luotThi7Ngay.reduce((tong, d) => tong + d.luot, 0);

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <h2>Tổng quan</h2>
          <p>Tình hình ngân hàng câu hỏi, kỳ thi và thí sinh trên toàn hệ thống.</p>
        </div>
        <div className="date-chip"><BieuTuong name="calendar" size={18} /><span><small>Hôm nay</small><strong>{ngayHomNay()}</strong></span></div>
      </section>

      <section className="stats-grid">
        {the.map((t) => (
          <Link aria-label={`${t.nhan}: ${t.giaTri}. Xem chi tiết`} className="stat-card stat-link" key={t.nhan} title={t.dinhNghia} to={t.den}>
            {t.minhHoa && <NhanMinhHoa />}
            <div className="stat-icon"><BieuTuong name={t.bieuTuong} size={22} /></div>
            <div className="stat-card-main">
              <span>{t.nhan}</span>
              <strong>{t.giaTri}</strong>
              <small>{t.phu}</small>
            </div>
            <BieuTuong name="arrow-right" size={16} />
          </Link>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel performance-panel">
          <div className="panel-heading"><div><h3>Lượt thi 7 ngày qua <NhanMinhHoa /></h3><p>Số bài thi được bắt đầu mỗi ngày</p></div></div>
          <div className="chart-summary"><strong>{dinhDangSo.format(tongLuot)}</strong><span>lượt thi</span></div>
          <div aria-label="Biểu đồ số lượt thi theo ngày trong 7 ngày qua" className="bar-chart" role="img">
            {luotThi7Ngay.map((d) => (
              <div className="bar-column" key={d.ngay}>
                <span className="bar-value">{d.luot}</span>
                <div className="bar-track"><div className={`bar ${d.luot === luotLonNhat ? "peak" : ""}`} style={{ height: `${(d.luot / luotLonNhat) * 100}%` }} /></div>
                <small>{d.ngay}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel upcoming-panel">
          <div className="panel-heading">
            <div><h3>Kỳ thi sắp diễn ra <NhanMinhHoa /></h3></div>
            <Link to="/admin/exams">Xem tất cả <BieuTuong name="arrow-right" size={15} /></Link>
          </div>
          <div className="upcoming-filters">
            <div aria-label="Lọc theo trạng thái" className="segmented" role="group">
              {([["tat_ca", "Tất cả"], ["dang_thi", "Đang thi"], ["sap_dien_ra", "Sắp diễn ra"]] as const).map(([giaTri, nhan]) => (
                <button aria-pressed={locTrangThai === giaTri} key={giaTri} onClick={() => setLocTrangThai(giaTri)} type="button">{nhan}</button>
              ))}
            </div>
            <select aria-label="Lọc theo ngày" onChange={(event) => setLocNgay(event.target.value as "hom_nay" | "7_ngay")} value={locNgay}>
              <option value="7_ngay">7 ngày tới</option>
              <option value="hom_nay">Hôm nay</option>
            </select>
          </div>
          <div className="exam-list">
            {kyThiHienThi.map((kt) => {
              const ketThuc = new Date(kt.batDau.getTime() + kt.thoiLuong * 60_000);
              return (
                <div className="exam-list-item" key={kt.ma}>
                  <div className="date-tile"><strong>{String(kt.batDau.getDate()).padStart(2, "0")}</strong><small>THG {kt.batDau.getMonth() + 1}</small></div>
                  <div className="exam-list-copy">
                    <strong>{kt.ten}</strong>
                    <span>{dinhDangGio.format(kt.batDau)} – {dinhDangGio.format(ketThuc)} · {kt.soThiSinh} thí sinh</span>
                  </div>
                  <span className={`tag ${NHAN_TRANG_THAI[kt.trangThai].lop}`}>{NHAN_TRANG_THAI[kt.trangThai].nhan}</span>
                  <Link aria-label={`Xem chi tiết kỳ thi ${kt.ten}`} className="row-link" to="/admin/exams">Chi tiết</Link>
                </div>
              );
            })}
            {kyThiHienThi.length === 0 && <p className="exam-list-empty">Không có kỳ thi phù hợp bộ lọc.</p>}
          </div>
        </article>
      </section>

      <article className="panel activity-panel">
        <div className="panel-heading"><div><h3>Hoạt động gần đây <NhanMinhHoa /></h3></div></div>
        <div className="activity-list">
          {hoatDong.map((item) => (
            <div className="activity-item" key={item.title}>
              <span className="avatar avatar-indigo">{item.initials}</span>
              <div><strong>{item.title}</strong><small>{item.meta}</small></div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
