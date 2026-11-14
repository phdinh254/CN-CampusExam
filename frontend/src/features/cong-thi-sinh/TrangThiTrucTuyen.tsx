import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { NhanMinhHoa } from "../../components/NhanMinhHoa";
import type { HoSoCaNhan } from "../../types/api";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";
import { dinhDangNgaySinh } from "../thi-sinh/bieuMauThiSinh";
import { toiApi } from "./api";
import {
  diemThi,
  gioThi,
  kyThiMinhHoa,
  laKyThiSapToi,
  NHAN_TRANG_THAI,
  ngayThi,
  ngayThiNgan,
  QUY_DINH_THI,
  type KyThiCuaToi,
} from "./duLieuMinhHoa";

/*
 * Luồng Thi trực tuyến: Kỳ thi được phân công → Chi tiết kỳ thi (xác nhận ngay trên trang) → Phòng thi.
 * Kết quả thi và Lịch sử thi xem riêng. Kỳ thi dùng dữ liệu minh họa cho tới khi có API.
 */

function DauTrang({ tieuDe, moTa, quayLai }: { tieuDe: string; moTa?: string; quayLai?: { to: string; nhan: string } }) {
  return (
    <section className="cand-page-head">
      {quayLai && <Link className="cand-back" to={quayLai.to}><BieuTuong name="arrow-left" size={15} /> {quayLai.nhan}</Link>}
      <h1>{tieuDe}</h1>
      {moTa && <p>{moTa}</p>}
    </section>
  );
}

function TrangThai({ kt }: { kt: KyThiCuaToi }) {
  const { nhan, lop } = NHAN_TRANG_THAI[kt.trangThai];
  return <span className={`cand-status ${lop}`}>{nhan}</span>;
}

function useKyThi() {
  const [danhSach] = useState(kyThiMinhHoa);
  return danhSach;
}

/** Danh sách kỳ thi được phân công (sắp thi hoặc đang mở phòng). */
export function TrangVaoThi() {
  const kyThi = useKyThi().filter(laKyThiSapToi).sort((a, b) => a.batDau.getTime() - b.batDau.getTime());

  return (
    <div className="student-dashboard">
      <DauTrang moTa="Các kỳ thi bạn được phân công. Phòng thi mở khi đến giờ thi." tieuDe="Kỳ thi được phân công" />
      <section className="panel">
        <div className="panel-heading"><div><h3>Lịch thi <NhanMinhHoa /></h3></div></div>
        <ul className="cand-exam-list">
          {kyThi.map((kt) => (
            <li key={kt.maKT}>
              <div className="cand-date"><small>THÁNG {kt.batDau.getMonth() + 1}</small><strong>{String(kt.batDau.getDate()).padStart(2, "0")}</strong></div>
              <div className="cand-schedule-copy">
                <strong>{kt.tenKT}</strong>
                <span>{gioThi(kt)} · {kt.thoiLuongPhut} phút · {kt.soCau} câu · Máy số {kt.soMay}</span>
              </div>
              <TrangThai kt={kt} />
              <Link className={kt.trangThai === "dang_mo" ? "cand-btn cand-btn-primary" : "row-link"} to={`/candidate/thi/${kt.maKT}`}>
                {kt.trangThai === "dang_mo" ? "Vào thi" : "Chi tiết"}
              </Link>
            </li>
          ))}
          {kyThi.length === 0 && <li className="cand-empty">Bạn chưa được phân công kỳ thi nào.</li>}
        </ul>
      </section>
    </div>
  );
}

/**
 * Chi tiết kỳ thi: thông tin thí sinh, thông tin kỳ thi và quy định. Khi phòng thi đang mở,
 * thí sinh tick xác nhận rồi vào phòng thi ngay trên trang này.
 */
export function TrangChiTietKyThi() {
  const { maKT } = useParams();
  const navigate = useNavigate();
  const taiKhoan = useTaiKhoan();
  const kt = useKyThi().find((item) => String(item.maKT) === maKT);
  const [hoSo, setHoSo] = useState<HoSoCaNhan | null>(null);
  const [dongY, setDongY] = useState(false);

  useEffect(() => {
    const huy = new AbortController();
    toiApi.hoSo(huy.signal).then(setHoSo).catch(() => undefined);
    return () => huy.abort();
  }, []);

  if (!kt) return <KhongTimThay />;

  const daXong = !laKyThiSapToi(kt);
  const thongTinThiSinh: [string, ReactNode][] = [
    ["Họ và tên", hoSo?.hoTen ?? taiKhoan.hoTen],
    ["Mã số thí sinh", taiKhoan.msts],
    ["Ngày sinh", hoSo ? dinhDangNgaySinh(hoSo.ngaySinh) : "…"],
    ["Lớp", hoSo ? (hoSo.lop ?? "—") : "…"],
  ];

  return (
    <div className="student-dashboard">
      <DauTrang quayLai={{ to: daXong ? "/candidate/thi/lich-su" : "/candidate/thi/tham-gia", nhan: daXong ? "Lịch sử thi" : "Kỳ thi được phân công" }} tieuDe={kt.tenKT} />

      {/* Hai cột cân nhau: trái là thông tin thí sinh và kỳ thi, phải là quy định và xác nhận. */}
      <div className="cand-detail-layout">
        <div className="cand-detail-col">
          <section className="panel">
            <div className="panel-heading"><div><h3>Thông tin thí sinh</h3></div></div>
            <dl className="cand-facts">{thongTinThiSinh.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri}</dd></div>)}</dl>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h3>Thông tin kỳ thi <NhanMinhHoa /></h3></div><TrangThai kt={kt} /></div>
            <dl className="cand-facts">
              <div><dt>Môn thi</dt><dd>{kt.monThi}</dd></div>
              <div><dt>Ngày thi</dt><dd>{ngayThi(kt)}</dd></div>
              <div><dt>Giờ thi</dt><dd>{gioThi(kt)}</dd></div>
              <div><dt>Thời lượng</dt><dd>{kt.thoiLuongPhut} phút · {kt.soCau} câu</dd></div>
              <div><dt>Số máy</dt><dd>Máy số {kt.soMay}</dd></div>
            </dl>
          </section>
        </div>

        <div className="cand-detail-col">
          <section className="panel cand-rules-panel">
            <div className="panel-heading"><div><h3>Quy định thi</h3></div></div>
            <ol className="cand-rules">{QUY_DINH_THI.map((quyDinh) => <li key={quyDinh}>{quyDinh}</li>)}</ol>
          </section>
          <section className="cand-action-bar">
            {kt.trangThai === "dang_mo" && (
              <>
                <label className="cand-agree">
                  <input checked={dongY} onChange={(event) => setDongY(event.target.checked)} type="checkbox" />
                  <span>Tôi xác nhận thông tin trên là đúng, đang ngồi đúng máy số {kt.soMay} và đã đọc quy định thi.</span>
                </label>
                <button className="cand-btn cand-btn-primary" disabled={!dongY} onClick={() => navigate("/exam/session")} type="button">
                  Vào phòng thi <BieuTuong name="arrow-right" size={16} />
                </button>
              </>
            )}
            {kt.trangThai === "sap_thi" && <span>Phòng thi mở khi đến giờ thi. Nút vào thi sẽ hiện ở đây.</span>}
            {daXong && (
              <>
                <span>Kỳ thi đã kết thúc.</span>
                <Link className="row-link" to="/candidate/thi/ket-qua">Xem kết quả thi</Link>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Điểm các kỳ thi đã làm, hiện ngay sau khi nộp nếu kỳ thi cho xem điểm. */
export function TrangKetQuaThi() {
  const coDiem = useKyThi().filter((kt) => kt.ketQua);

  return (
    <div className="student-dashboard">
      <DauTrang moTa="Điểm hiển thị ngay sau khi nộp bài, nếu kỳ thi cho phép xem điểm." tieuDe="Kết quả thi" />
      <section className="panel table-panel">
        <div className="panel-heading"><div><h3>Điểm thi <NhanMinhHoa /></h3></div></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>KỲ THI</th><th>NGÀY THI</th><th>SỐ CÂU ĐÚNG</th><th>ĐIỂM</th></tr></thead>
            <tbody>
              {coDiem.map((kt) => (
                <tr key={kt.maKT}>
                  <td><strong>{kt.tenKT}</strong></td>
                  <td>{ngayThiNgan(kt)}</td>
                  <td>{kt.ketQua!.soCauDung}/{kt.soCau}</td>
                  <td><strong className="cand-score">{diemThi(kt.ketQua!.diem)}</strong></td>
                </tr>
              ))}
              {coDiem.length === 0 && <tr><td className="cell-loading" colSpan={4}>Chưa có kết quả thi nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Các lượt thi đã kết thúc, kể cả kỳ thi không hiện điểm và vắng thi. */
export function TrangLichSuThi() {
  const daXong = useKyThi().filter((kt) => !laKyThiSapToi(kt)).sort((a, b) => b.batDau.getTime() - a.batDau.getTime());

  return (
    <div className="student-dashboard">
      <DauTrang moTa="Các kỳ thi đã kết thúc của bạn." tieuDe="Lịch sử thi" />
      <section className="panel table-panel">
        <div className="panel-heading"><div><h3>Lượt thi đã hoàn thành <NhanMinhHoa /></h3></div></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>KỲ THI</th><th>NGÀY THI</th><th>TRẠNG THÁI BÀI</th><th>ĐIỂM</th><th aria-label="Thao tác" /></tr></thead>
            <tbody>
              {daXong.map((kt) => (
                <tr key={kt.maKT}>
                  <td><strong>{kt.tenKT}</strong></td>
                  <td>{ngayThiNgan(kt)}</td>
                  <td><TrangThai kt={kt} /></td>
                  <td>{kt.ketQua ? <strong className="cand-score">{diemThi(kt.ketQua.diem)}</strong> : <span className="cand-muted">{kt.trangThai === "vang_thi" ? "—" : "Không hiển thị điểm"}</span>}</td>
                  <td className="cell-action"><Link to={`/candidate/thi/${kt.maKT}`}>Chi tiết <BieuTuong name="arrow-right" size={14} /></Link></td>
                </tr>
              ))}
              {daXong.length === 0 && <tr><td className="cell-loading" colSpan={5}>Bạn chưa có lượt thi nào.</td></tr>}
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
