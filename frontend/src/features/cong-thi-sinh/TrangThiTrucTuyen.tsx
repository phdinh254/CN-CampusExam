import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { DanhSachKyThiCuaToi, HoSoCaNhan, KyThiCuaToiApi, TrangThaiBaiCuaToi } from "../../types/api";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";
import { dinhDangNgaySinh } from "../thi-sinh/bieuMauThiSinh";
import { toiApi } from "./api";
import { diemThi, ngayThiNgan, QUY_DINH_THI } from "./hienThiThiSinh";

/*
 * Luồng Thi trực tuyến: Kỳ thi được phân công → Chi tiết kỳ thi (xác nhận ngay trên trang) → Phòng thi.
 * Kết quả thi và Lịch sử thi xem riêng; điểm chỉ có khi kỳ thi cho hiện điểm. Kỳ thi cho xem lại có
 * thêm trang Xem lại bài sau khi kết thúc.
 */

function DauTrang({ tieuDe, quayLai }: { tieuDe: string; quayLai?: { to: string; nhan: string } }) {
  return (
    <section className="cand-page-head">
      {quayLai && <Link className="cand-back" to={quayLai.to}><BieuTuong name="arrow-left" size={15} /> {quayLai.nhan}</Link>}
      <h1>{tieuDe}</h1>
    </section>
  );
}

/** Danh sách kỳ thi của thí sinh cho hai trang Kết quả thi, Lịch sử thi (mới nhất trước). */
function useKyThiDaXong() {
  const [ds, setDs] = useState<KyThiCuaToiApi[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    const huy = new AbortController();
    toiApi.kyThi(huy.signal)
      .then((data) => setDs(
        data.duLieu
          .filter((kt) => kt.trangThaiBaiLam === "da_nop" || kt.trangThaiBaiLam === "he_thong_thu" || kt.trangThaiBaiLam === "vang_thi")
          .sort((a, b) => b.tgBatDau.localeCompare(a.tgBatDau)),
      ))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoi(error instanceof Error ? error.message : "Không tải được kỳ thi.");
      });
    return () => huy.abort();
  }, []);
  return { ds, loi };
}

const NHAN_BAI: Record<TrangThaiBaiCuaToi, { nhan: string; lop: string }> = {
  chua_vao: { nhan: "Sắp thi", lop: "tt-sap-thi" },
  dang_lam: { nhan: "Đang làm bài", lop: "tt-dang-mo" },
  da_nop: { nhan: "Đã nộp bài", lop: "tt-da-nop" },
  he_thong_thu: { nhan: "Hệ thống thu bài", lop: "tt-da-nop" },
  vang_thi: { nhan: "Vắng thi", lop: "tt-vang" },
};

function TrangThaiBai({ kt }: { kt: KyThiCuaToiApi }) {
  const { nhan, lop } = kt.trangThaiBaiLam === "chua_vao" && kt.duocVaoThi
    ? { nhan: "Đang mở phòng thi", lop: "tt-dang-mo" }
    : NHAN_BAI[kt.trangThaiBaiLam];
  return <span className={`cand-status ${lop}`}>{nhan}</span>;
}

const dinhDangNgayDai = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const dinhDangGioPhut = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dinhDangNgayThang = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const ngayThiThat = (kt: KyThiCuaToiApi) => {
  const text = dinhDangNgayDai.format(new Date(kt.tgBatDau));
  return text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
};
const gioThiThat = (kt: KyThiCuaToiApi) => `${dinhDangGioPhut.format(new Date(kt.tgBatDau))} – ${dinhDangGioPhut.format(new Date(kt.ketThucLuc))}`;
const soMayThat = (kt: KyThiCuaToiApi) => (kt.soMay ? `Máy số ${kt.soMay}` : "Chưa xếp máy");
const conHieuLuc = (kt: KyThiCuaToiApi) => kt.trangThaiBaiLam === "chua_vao" || kt.trangThaiBaiLam === "dang_lam";

/** Giờ máy chủ ước tính, cập nhật mỗi giây; độ lệch tính một lần từ `gioServer`. */
function useGioServer(gioServer: string | null) {
  const [doLech, setDoLech] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (gioServer) setDoLech(new Date(gioServer).getTime() - Date.now());
  }, [gioServer]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now + doLech;
}

function demNguocNgan(ms: number) {
  const tong = Math.max(0, Math.floor(ms / 1000));
  const ngay = Math.floor(tong / 86400);
  const gio = Math.floor((tong % 86400) / 3600);
  const phut = Math.floor((tong % 3600) / 60);
  const giay = tong % 60;
  if (ngay > 0) return `${ngay} ngày ${gio} giờ`;
  return [gio, phut, giay].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Danh sách kỳ thi được phân công (sắp thi, đang mở phòng hoặc đang làm). */
export function TrangVaoThi() {
  const [data, setData] = useState<DanhSachKyThiCuaToi | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    const huy = new AbortController();
    const tai = () => toiApi.kyThi(huy.signal).then(setData).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLoi(error instanceof Error ? error.message : "Không tải được lịch thi.");
    });
    void tai();
    // Làm mới định kỳ để nút "Vào thi" bật đúng lúc mở phòng.
    const timer = window.setInterval(() => void tai(), 30_000);
    return () => { huy.abort(); window.clearInterval(timer); };
  }, []);

  const kyThi = (data?.duLieu ?? []).filter(conHieuLuc);

  return (
    <div className="student-dashboard">
      <DauTrang tieuDe="Kỳ thi được phân công" />
      <section className="panel">
        <div className="panel-heading"><div><h3>Lịch thi</h3></div></div>
        {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}
        <ul className="cand-exam-list">
          {kyThi.map((kt) => {
            const batDau = new Date(kt.tgBatDau);
            return (
              <li key={kt.maKT}>
                <div className="cand-schedule-copy">
                  <strong>{kt.tenKT}</strong>
                  <span>{dinhDangNgayThang.format(batDau)} · {gioThiThat(kt)} · {kt.thoiLuong} phút · {kt.soCau} câu · {soMayThat(kt)}</span>
                </div>
                <TrangThaiBai kt={kt} />
                <Link className={kt.duocVaoThi ? "button button-primary" : "row-link"} to={`/candidate/thi/${kt.maKT}`}>
                  {kt.trangThaiBaiLam === "dang_lam" ? "Tiếp tục" : kt.duocVaoThi ? "Vào thi" : "Chi tiết"}
                </Link>
              </li>
            );
          })}
          {data && kyThi.length === 0 && <li className="cand-empty">Bạn chưa có kỳ thi nào sắp diễn ra.</li>}
          {!data && !loi && <li className="cand-empty">Đang tải lịch thi…</li>}
        </ul>
      </section>
    </div>
  );
}

/** Đếm ngược còn dưới 5 phút thì tô cảnh báo. */
const SAP_HET_MS = 5 * 60 * 1000;

/**
 * Dòng "Thời gian" của bảng trạng thái: mốc tiếp theo thí sinh cần biết (mở phòng, hết giờ vào, hết giờ
 * làm bài) và thời gian còn lại theo giờ máy chủ.
 */
function thoiGianConLai(kt: KyThiCuaToiApi, now: number): { chu: ReactNode; sapHet: boolean } {
  const gio = (iso: string) => dinhDangGioPhut.format(new Date(iso));
  if (kt.trangThaiBaiLam === "dang_lam") {
    const con = new Date(kt.ketThucLuc).getTime() - now;
    return { chu: <>Kết thúc lúc {gio(kt.ketThucLuc)} · còn <strong>{demNguocNgan(con)}</strong></>, sapHet: con <= SAP_HET_MS };
  }
  if (kt.trangThaiBaiLam !== "chua_vao") {
    // Nộp sớm thì kỳ thi có thể vẫn đang diễn ra với thí sinh khác.
    const daKetThuc = new Date(kt.ketThucLuc).getTime() <= now;
    const truoc = kt.trangThaiBaiLam === "vang_thi" ? "Không vào thi" : kt.trangThaiBaiLam === "he_thong_thu" ? "Hệ thống đã thu bài" : "Đã nộp bài";
    return { chu: `${truoc} · kỳ thi ${daKetThuc ? "đã kết thúc" : "kết thúc"} lúc ${gio(kt.ketThucLuc)}`, sapHet: false };
  }
  if (kt.duocVaoThi) {
    const con = new Date(kt.dongCongLuc).getTime() - now;
    return { chu: <>Phòng thi đang mở · vào muộn nhất {gio(kt.dongCongLuc)} (còn <strong>{demNguocNgan(con)}</strong>)</>, sapHet: con <= SAP_HET_MS };
  }
  const mo = new Date(kt.moCongLuc).getTime() - now;
  return { chu: mo > 0 ? <>Phòng thi mở lúc {gio(kt.moCongLuc)} · còn <strong>{demNguocNgan(mo)}</strong></> : "Đang mở phòng thi…", sapHet: false };
}

function diemCuaBai(kt: KyThiCuaToiApi) {
  if (kt.trangThaiBaiLam === "vang_thi") return "—";
  if (kt.trangThaiBaiLam !== "da_nop" && kt.trangThaiBaiLam !== "he_thong_thu") return "Có sau khi nộp bài";
  if (!kt.hienDiem || kt.diem === null) return "Kỳ thi không hiển thị điểm";
  return `${diemThi(kt.diem)} điểm`;
}

/**
 * Chi tiết kỳ thi: banner tên kỳ thi, bảng trạng thái (như trang bài tập của LMS trường), thông tin
 * thí sinh và quy định. Khi phòng thi đang mở,
 * thí sinh tick xác nhận rồi vào phòng thi ngay trên trang này.
 */
export function TrangChiTietKyThi() {
  const { maKT } = useParams();
  const navigate = useNavigate();
  const taiKhoan = useTaiKhoan();
  const [kt, setKt] = useState<KyThiCuaToiApi | null>(null);
  const [gioServer, setGioServer] = useState<string | null>(null);
  const [khongCo, setKhongCo] = useState(false);
  const [lanTai, setLanTai] = useState(0);
  const [hoSo, setHoSo] = useState<HoSoCaNhan | null>(null);
  const [dongY, setDongY] = useState(false);
  const now = useGioServer(gioServer);

  useEffect(() => {
    const huy = new AbortController();
    toiApi.hoSo(huy.signal).then(setHoSo).catch(() => undefined);
    return () => huy.abort();
  }, []);

  useEffect(() => {
    const huy = new AbortController();
    const ma = Number(maKT);
    if (!ma) { setKhongCo(true); return () => huy.abort(); }
    // Danh sách có gioServer; lấy kỳ thi cần xem trong đó.
    toiApi.kyThi(huy.signal)
      .then((data) => {
        const timThay = data.duLieu.find((x) => x.maKT === ma) ?? null;
        setGioServer(data.gioServer);
        setKt(timThay);
        setKhongCo(!timThay);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setKhongCo(true);
      });
    return () => huy.abort();
  }, [maKT, lanTai]);

  // Tới giờ mở phòng thì tải lại để nhận trạng thái mới từ máy chủ.
  const moSau = kt && kt.trangThaiBaiLam === "chua_vao" && !kt.duocVaoThi ? new Date(kt.moCongLuc).getTime() - now : null;
  useEffect(() => {
    if (moSau !== null && moSau <= 0 && moSau > -5000) setLanTai((x) => x + 1);
  }, [moSau]);

  if (khongCo) return <KhongTimThay />;
  if (!kt) return <div className="student-dashboard"><section className="panel cand-empty-panel">Đang tải kỳ thi…</section></div>;

  const daXong = !conHieuLuc(kt);
  const thongTinThiSinh: [string, ReactNode][] = [
    ["Họ và tên", hoSo?.hoTen ?? taiKhoan.hoTen],
    ["Mã số thí sinh", taiKhoan.msts],
    ["Ngày sinh", hoSo ? dinhDangNgaySinh(hoSo.ngaySinh) : "…"],
    ["Lớp", hoSo ? (hoSo.lop ?? "—") : "…"],
  ];

  const thoiGian = thoiGianConLai(kt, now);

  return (
    <div className="student-dashboard">
      <section className="cand-detail-head">
        <Link className="cand-back" to={daXong ? "/candidate/thi/lich-su" : "/candidate/thi/tham-gia"}>
          <BieuTuong name="arrow-left" size={15} /> {daXong ? "Lịch sử thi" : "Kỳ thi được phân công"}
        </Link>
        <div className="cand-banner">
          <div>
            <h1>{kt.tenKT}</h1>
            <p>{kt.monThi} · {ngayThiThat(kt)}</p>
          </div>
          <TrangThaiBai kt={kt} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><h3>Trạng thái bài thi</h3></div></div>
        <table className="cand-status-table">
          <tbody>
            <tr><th scope="row">Trạng thái</th><td><TrangThaiBai kt={kt} /></td></tr>
            <tr><th scope="row">Giờ thi</th><td>{gioThiThat(kt)} · {kt.thoiLuong} phút · {kt.soCau} câu</td></tr>
            <tr><th scope="row">Thời gian</th><td className={thoiGian.sapHet ? "cand-sap-het" : undefined}>{thoiGian.chu}</td></tr>
            <tr><th scope="row">Số máy</th><td>{soMayThat(kt)}</td></tr>
            <tr><th scope="row">Điểm</th><td>{diemCuaBai(kt)}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Hai cột: trái là thông tin thí sinh, phải là quy định và xác nhận vào thi. */}
      <div className="cand-detail-layout">
        <div className="cand-detail-col">
          <section className="panel">
            <div className="panel-heading"><div><h3>Thông tin thí sinh</h3></div></div>
            <dl className="cand-facts">{thongTinThiSinh.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri}</dd></div>)}</dl>
          </section>
        </div>

        <div className="cand-detail-col">
          <section className="panel cand-rules-panel">
            <div className="panel-heading"><div><h3>Quy định thi</h3></div></div>
            <ol className="cand-rules">{QUY_DINH_THI.map((quyDinh) => <li key={quyDinh}>{quyDinh}</li>)}</ol>
          </section>
          <section className="cand-action-bar">
            {kt.duocVaoThi && kt.trangThaiBaiLam === "chua_vao" && (
              <>
                <label className="cand-agree">
                  <input checked={dongY} onChange={(event) => setDongY(event.target.checked)} type="checkbox" />
                  <span>Tôi xác nhận thông tin trên là đúng{kt.soMay ? `, đang ngồi đúng máy số ${kt.soMay}` : ""} và đã đọc quy định thi.</span>
                </label>
                <button className="button button-primary button-lg" disabled={!dongY} onClick={() => navigate(`/exam/session?maKT=${kt.maKT}`)} type="button">
                  Vào phòng thi <BieuTuong name="arrow-right" size={16} />
                </button>
              </>
            )}
            {kt.duocVaoThi && kt.trangThaiBaiLam === "dang_lam" && (
              <>
                <span>Bạn đang làm bài dở. Bài làm đã được lưu, tiếp tục để làm tiếp.</span>
                <button className="button button-primary button-lg" onClick={() => navigate(`/exam/session?maKT=${kt.maKT}`)} type="button">
                  Tiếp tục làm bài <BieuTuong name="arrow-right" size={16} />
                </button>
              </>
            )}
            {moSau !== null && moSau > 0 && <span>Nút vào phòng thi sẽ hiện ở đây khi tới giờ mở phòng.</span>}
            {kt.trangThaiBaiLam === "chua_vao" && !kt.duocVaoThi && moSau !== null && moSau <= 0 && <span>Đang mở phòng thi…</span>}
            {daXong && (
              <>
                <span>{kt.trangThaiBaiLam === "vang_thi" ? "Bạn đã không vào thi kỳ thi này." : "Bạn đã hoàn thành kỳ thi này."}</span>
                <Link className="row-link" to="/candidate/thi/ket-qua">Xem kết quả thi</Link>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Dòng trạng thái tải dùng chung cho hai bảng kết quả. */
function DongTrangThai({ ds, loi, soCot, trong }: { ds: KyThiCuaToiApi[] | null; loi: string | null; soCot: number; trong: string }) {
  if (loi) return <tr><td className="cell-loading" colSpan={soCot}>{loi}</td></tr>;
  if (!ds) return <tr><td className="cell-loading" colSpan={soCot}>Đang tải…</td></tr>;
  return ds.length === 0 ? <tr><td className="cell-loading" colSpan={soCot}>{trong}</td></tr> : null;
}

/** Điểm các kỳ thi đã làm, hiện ngay sau khi nộp nếu kỳ thi cho xem điểm. */
export function TrangKetQuaThi() {
  const { ds, loi } = useKyThiDaXong();
  const coDiem = ds?.filter((kt) => kt.diem !== null) ?? null;

  return (
    <div className="student-dashboard">
      <DauTrang tieuDe="Kết quả thi" />
      <section className="panel table-panel">
        <div className="panel-heading"><div><h3>Điểm thi</h3></div></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>KỲ THI</th><th>NGÀY THI</th><th>ĐIỂM</th></tr></thead>
            <tbody>
              {coDiem?.map((kt) => (
                <tr key={kt.maKT}>
                  <td><strong>{kt.tenKT}</strong></td>
                  <td>{ngayThiNgan(kt.tgBatDau)}</td>
                  <td><strong className="cand-score">{diemThi(kt.diem!)}</strong></td>
                </tr>
              ))}
              <DongTrangThai ds={coDiem} loi={loi} soCot={3} trong="Chưa có kết quả thi nào." />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Các lượt thi đã nộp, bị thu hoặc vắng, kể cả kỳ thi không hiện điểm. */
export function TrangLichSuThi() {
  const { ds, loi } = useKyThiDaXong();

  return (
    <div className="student-dashboard">
      <DauTrang tieuDe="Lịch sử thi" />
      <section className="panel table-panel">
        <div className="panel-heading"><div><h3>Lượt thi đã hoàn thành</h3></div></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>KỲ THI</th><th>NGÀY THI</th><th>TRẠNG THÁI BÀI</th><th>ĐIỂM</th><th aria-label="Thao tác" /></tr></thead>
            <tbody>
              {ds?.map((kt) => (
                <tr key={kt.maKT}>
                  <td><strong>{kt.tenKT}</strong></td>
                  <td>{ngayThiNgan(kt.tgBatDau)}</td>
                  <td><TrangThaiBai kt={kt} /></td>
                  <td>
                    {kt.diem !== null
                      ? <strong className="cand-score">{diemThi(kt.diem)}</strong>
                      : <span className="cand-muted">{kt.trangThaiBaiLam === "vang_thi" ? "—" : "Không hiển thị điểm"}</span>}
                  </td>
                  <td className="cell-action">
                    <Link to={`/candidate/thi/${kt.maKT}`}>Chi tiết <BieuTuong name="arrow-right" size={14} /></Link>
                  </td>
                </tr>
              ))}
              <DongTrangThai ds={ds} loi={loi} soCot={5} trong="Bạn chưa có lượt thi nào." />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KhongTimThay() {
  return (
    <div className="student-dashboard">
      <DauTrang quayLai={{ to: "/candidate/thi/tham-gia", nhan: "Kỳ thi được phân công" }} tieuDe="Không tìm thấy kỳ thi" />
      <section className="panel cand-empty-panel">Kỳ thi không tồn tại hoặc bạn không được phân công vào kỳ thi này.</section>
    </div>
  );
}
