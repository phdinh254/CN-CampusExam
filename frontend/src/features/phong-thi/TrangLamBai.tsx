import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LogoCampusExam } from "../../components/LogoCampusExam";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";

// Dữ liệu minh họa cho đến khi có API làm bài.
// hienDiem: kỳ thi cho thí sinh xem điểm ngay sau khi nộp.
const DE_THI = { ten: "Cơ sở dữ liệu nâng cao", maDe: "132", soCau: 40, thoiLuongPhut: 45, conLaiGiay: 34 * 60 + 28, hienDiem: true };

const cauHoi = [
  { noiDung: "Trong mô hình cơ sở dữ liệu quan hệ, phát biểu nào sau đây mô tả đúng nhất về khóa chính (Primary Key)?", phuongAn: ["Một thuộc tính bất kỳ có thể chứa giá trị trùng lặp", "Một hoặc nhiều thuộc tính xác định duy nhất mỗi bản ghi trong bảng", "Thuộc tính chỉ được sử dụng để liên kết với bảng khác", "Một thuộc tính luôn có kiểu dữ liệu là số nguyên"] },
  { noiDung: "Mệnh đề SQL nào được sử dụng để lọc các nhóm sau khi thực hiện GROUP BY?", phuongAn: ["WHERE", "ORDER BY", "HAVING", "DISTINCT"] },
  { noiDung: "Dạng chuẩn thứ ba (3NF) yêu cầu điều kiện nào sau đây?", phuongAn: ["Không có thuộc tính đa trị", "Mọi thuộc tính không khóa phụ thuộc đầy đủ vào khóa", "Không có phụ thuộc bắc cầu của thuộc tính không khóa vào khóa", "Mỗi bảng chỉ có một khóa ứng viên"] },
  { noiDung: "Transaction trong hệ quản trị cơ sở dữ liệu tuân theo nhóm thuộc tính nào?", phuongAn: ["CRUD", "ACID", "BASE", "CAP"] },
  { noiDung: "Chỉ mục (Index) trong cơ sở dữ liệu chủ yếu được dùng để làm gì?", phuongAn: ["Giảm kích thước bảng", "Tăng tốc độ truy vấn dữ liệu", "Mã hóa dữ liệu", "Ngăn chặn mọi cập nhật"] },
];

const CHU_CAI = ["A", "B", "C", "D"];

// Đáp án minh họa của 5 câu mẫu (câu thứ n dùng câu mẫu (n - 1) % 5). Khi có API, server chấm và trả điểm.
const DAP_AN_MINH_HOA = [1, 2, 2, 1, 1];
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

type KetQuaNop = { soCauDung: number; diem: number; luc: Date };

const hai = (n: number) => String(n).padStart(2, "0");

function dinhDangThoiGian(giay: number) {
  const gio = Math.floor(giay / 3600);
  const phut = Math.floor((giay % 3600) / 60);
  return gio > 0 ? `${gio}:${hai(phut)}:${hai(giay % 60)}` : `${hai(phut)}:${hai(giay % 60)}`;
}

export default function TrangLamBai() {
  const navigate = useNavigate();
  const taiKhoan = useTaiKhoan();
  const [cauHienTai, setCauHienTai] = useState(1);
  const [traLoi, setTraLoi] = useState<Record<number, number>>({ 2: 2, 3: 2 });
  const [danhDau, setDanhDau] = useState<number[]>([3]);
  // Bảng số câu có thể thu gọn; nút Nộp bài vẫn hiện bên dưới.
  const [hienDanhSach, setHienDanhSach] = useState(true);
  const [xacNhanNop, setXacNhanNop] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaNop | null>(null);
  const [conLai, setConLai] = useState(DE_THI.conLaiGiay);

  const cau = cauHoi[(cauHienTai - 1) % cauHoi.length];
  const soDaTraLoi = Object.keys(traLoi).length;
  const soChuaTraLoi = DE_THI.soCau - soDaTraLoi;
  const daDanhDau = danhDau.includes(cauHienTai);
  const mucThoiGian = conLai <= 60 ? "nguy-cap" : conLai <= 5 * 60 ? "sap-het" : "";

  const chuyenCau = (so: number) => setCauHienTai(Math.min(DE_THI.soCau, Math.max(1, so)));
  const chonPhuongAn = (phuongAn: number) => {
    setTraLoi((cu) => ({ ...cu, [cauHienTai]: phuongAn }));
  };
  const doiDanhDau = () => {
    setDanhDau((cu) => (cu.includes(cauHienTai) ? cu.filter((so) => so !== cauHienTai) : [...cu, cauHienTai]));
  };

  const daNop = ketQua !== null;

  /** Nộp bài: chấm ngay và hiện kết quả (minh họa: chấm theo đáp án mẫu ở trình duyệt). */
  function nopBai() {
    const soCauDung = Array.from({ length: DE_THI.soCau }, (_, i) => i + 1)
      .filter((so) => traLoi[so] === DAP_AN_MINH_HOA[(so - 1) % DAP_AN_MINH_HOA.length]).length;
    setKetQua({ soCauDung, diem: Math.round((soCauDung / DE_THI.soCau) * 1000) / 100, luc: new Date() });
    setXacNhanNop(false);
  }

  useEffect(() => {
    if (daNop) return undefined;
    const dongHo = window.setInterval(() => setConLai((giay) => Math.max(0, giay - 1)), 1000);
    return () => window.clearInterval(dongHo);
  }, [daNop]);

  // Cảnh báo khi đóng tab hoặc tải lại trang giữa giờ thi (tắt sau khi đã nộp).
  useEffect(() => {
    if (daNop) return undefined;
    const chan = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", chan);
    return () => window.removeEventListener("beforeunload", chan);
  }, [daNop]);

  // Phím tắt: A–D hoặc 1–4 chọn phương án, ← → chuyển câu, Esc đóng hộp thoại nộp bài.
  useEffect(() => {
    function xuLyPhim(event: KeyboardEvent) {
      if (daNop || event.ctrlKey || event.metaKey || event.altKey) return;
      if (xacNhanNop) {
        if (event.key === "Escape") setXacNhanNop(false);
        return;
      }
      const phuongAn = Math.max("abcd".indexOf(event.key.toLowerCase()), "1234".indexOf(event.key));
      if (phuongAn >= 0) {
        setTraLoi((cu) => ({ ...cu, [cauHienTai]: phuongAn }));
      } else if (event.key === "ArrowRight") {
        setCauHienTai((so) => Math.min(DE_THI.soCau, so + 1));
      } else if (event.key === "ArrowLeft") {
        setCauHienTai((so) => Math.max(1, so - 1));
      }
    }
    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  }, [cauHienTai, xacNhanNop, daNop]);

  return (
    <>
      <header className="pt-bar">
        <div className="pt-exam">
          <LogoCampusExam className="pt-logo" nen="sang" size={42} />
          <div>
            <strong>{DE_THI.ten}</strong>
            <small>Mã đề {DE_THI.maDe} · {DE_THI.soCau} câu · {DE_THI.thoiLuongPhut} phút</small>
          </div>
        </div>

        {/* Đồng hồ đếm ngược: nhãn và số lớn. Ẩn sau khi đã nộp bài. */}
        {!daNop && <div aria-label={`Thời gian còn lại ${dinhDangThoiGian(conLai)}`} className={`pt-timer ${mucThoiGian}`} role="timer">
          <span className="pt-timer-label"><BieuTuong name="clock" size={14} /> Thời gian còn lại</span>
          <span className="pt-timer-value">{dinhDangThoiGian(conLai)}</span>
        </div>}

        <div className="pt-bar-end">
          <div className="pt-candidate">
            <strong>{taiKhoan.hoTen}</strong>
            <small>{taiKhoan.msts}</small>
          </div>
        </div>
      </header>

      {daNop ? (
        <main className="pt-result">
          <section aria-labelledby="pt-ket-qua" className="pt-result-card">
            <span aria-hidden="true" className="pt-result-icon"><BieuTuong name="check" size={30} /></span>
            <h1 id="pt-ket-qua">Bạn đã nộp bài</h1>
            <p className="pt-result-meta">{DE_THI.ten} · Mã đề {DE_THI.maDe} · Nộp lúc {dinhDangGio.format(ketQua.luc)}</p>
            {DE_THI.hienDiem ? (
              <div className="pt-result-score">
                <div><span>Điểm</span><strong>{dinhDangDiem.format(ketQua.diem)}</strong><small>/ 10</small></div>
                <div><span>Số câu đúng</span><strong>{ketQua.soCauDung}</strong><small>/ {DE_THI.soCau}</small></div>
              </div>
            ) : (
              <p className="pt-result-hidden">Kỳ thi này không hiển thị điểm cho thí sinh.</p>
            )}
            <button className="pt-btn pt-btn-primary" onClick={() => navigate("/candidate")} type="button">Về trang chủ</button>
          </section>
        </main>
      ) : (
        <div className="pt-body co-danh-sach">
          <main className="pt-main">
            <article aria-labelledby="pt-noi-dung" className="pt-question">
              <div className="pt-question-meta">
                <span className="pt-question-no">Câu {cauHienTai}</span>
                <button aria-pressed={daDanhDau} className={`pt-flag ${daDanhDau ? "on" : ""}`} onClick={doiDanhDau} type="button">
                  <BieuTuong name="flag" size={15} /> {daDanhDau ? "Đã đánh dấu xem lại" : "Đánh dấu xem lại"}
                </button>
              </div>

              <h1 id="pt-noi-dung">{cau.noiDung}</h1>

              <fieldset className="pt-answers">
                <legend className="sr-only">Chọn một phương án</legend>
                {cau.phuongAn.map((noiDung, index) => (
                  <label className={traLoi[cauHienTai] === index ? "chon" : ""} key={noiDung}>
                    <input
                      checked={traLoi[cauHienTai] === index}
                      name={`cau-${cauHienTai}`}
                      onChange={() => chonPhuongAn(index)}
                      type="radio"
                    />
                    <span className="pt-letter">{CHU_CAI[index]}</span>
                    <span className="pt-answer-text">{noiDung}</span>
                  </label>
                ))}
              </fieldset>
              <div className="pt-question-nav">
                <button className="pt-btn pt-btn-ghost" disabled={cauHienTai === 1} onClick={() => chuyenCau(cauHienTai - 1)} type="button">
                  <BieuTuong name="arrow-left" size={16} /> Câu trước
                </button>
                <button className="pt-btn pt-btn-primary" disabled={cauHienTai === DE_THI.soCau} onClick={() => chuyenCau(cauHienTai + 1)} type="button">
                  Câu tiếp <BieuTuong name="arrow-right" size={16} />
                </button>
              </div>
            </article>
          </main>

          <aside aria-label="Danh sách câu hỏi" className="pt-map">
            <div className="pt-map-head">
              <strong>Danh sách câu</strong>
              <span>Đã trả lời {soDaTraLoi}/{DE_THI.soCau}</span>
            </div>
            <div aria-hidden="true" className="pt-progress"><i style={{ width: `${(soDaTraLoi / DE_THI.soCau) * 100}%` }} /></div>
            {hienDanhSach && (
              <div className="pt-grid" id="pt-bang-cau">
                {Array.from({ length: DE_THI.soCau }, (_, index) => index + 1).map((so) => {
                  const daLam = traLoi[so] !== undefined;
                  const xemLai = danhDau.includes(so);
                  return (
                    <button
                      aria-current={so === cauHienTai ? "step" : undefined}
                      aria-label={`Câu ${so}${daLam ? ", đã trả lời" : ""}${xemLai ? ", đánh dấu xem lại" : ""}`}
                      className={[daLam ? "da-lam" : "", xemLai ? "danh-dau" : "", so === cauHienTai ? "hien-tai" : ""].join(" ")}
                      key={so}
                      onClick={() => chuyenCau(so)}
                      type="button"
                    >
                      {so}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Nút ngay dưới các ô số câu: thu gọn/mở bảng và nộp bài. */}
            <div className="pt-map-actions">
              <button
                aria-controls="pt-bang-cau"
                aria-expanded={hienDanhSach}
                className="pt-btn pt-btn-ghost"
                onClick={() => setHienDanhSach((hien) => !hien)}
                type="button"
              >
                <BieuTuong name="dashboard" size={16} /> {hienDanhSach ? "Thu gọn danh sách" : "Danh sách câu"}
              </button>
              <button className="pt-btn pt-btn-primary pt-submit" onClick={() => setXacNhanNop(true)} type="button">
                <BieuTuong name="file" size={16} /> Nộp bài
              </button>
            </div>
          </aside>
        </div>
      )}


      {xacNhanNop && (
        <div className="pt-overlay" role="presentation">
          <div aria-labelledby="pt-nop-tieu-de" aria-modal="true" className="pt-dialog" role="dialog">
            <h2 id="pt-nop-tieu-de">Nộp bài thi?</h2>
            <dl>
              <div><dt>Đã trả lời</dt><dd>{soDaTraLoi}/{DE_THI.soCau}</dd></div>
              <div><dt>Chưa trả lời</dt><dd className={soChuaTraLoi > 0 ? "canh-bao" : ""}>{soChuaTraLoi}</dd></div>
              <div><dt>Đánh dấu xem lại</dt><dd>{danhDau.length}</dd></div>
              <div><dt>Thời gian còn lại</dt><dd>{dinhDangThoiGian(conLai)}</dd></div>
            </dl>
            <div className="pt-dialog-actions">
              <button autoFocus className="pt-btn pt-btn-ghost" onClick={() => setXacNhanNop(false)} type="button">Quay lại làm bài</button>
              <button className="pt-btn pt-btn-primary" onClick={nopBai} type="button">Nộp bài</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
