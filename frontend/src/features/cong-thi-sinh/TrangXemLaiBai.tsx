import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { BaiXemLai } from "../../types/api";
import { NoiDungCoHinh } from "../de-thi/NoiDungCoHinh";
import { toiApi } from "./api";
import { diemThi } from "./hienThiThiSinh";

/*
 * Xem lại bài đã nộp, chỉ đọc. Chỉ hiện câu hỏi, phương án và lựa chọn của thí sinh, không cho biết
 * câu nào đúng/sai và không có đáp án đúng (máy chủ cũng không trả).
 */

const dinhDangThoiDiem = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

export default function TrangXemLaiBai() {
  const { maKT } = useParams();
  const [bai, setBai] = useState<BaiXemLai | null>(null);
  const [loi, setLoi] = useState<{ tieuDe: string; noiDung: string } | null>(null);

  useEffect(() => {
    const ma = Number(maKT);
    const huy = new AbortController();
    // Đổi sang kỳ thi khác cùng trang: bỏ bài/lỗi cũ trong lúc tải.
    setBai(null);
    setLoi(null);
    if (!ma) {
      setLoi({ tieuDe: "Không tìm thấy kỳ thi", noiDung: "Đường dẫn không hợp lệ." });
      return () => huy.abort();
    }
    toiApi.xemLai(ma, huy.signal)
      .then(setBai)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoi(error instanceof LoiApiHttp
          ? { tieuDe: error.problem?.title ?? "Không xem lại được bài", noiDung: error.message }
          : { tieuDe: "Không xem lại được bài", noiDung: "Không thể kết nối máy chủ. Vui lòng thử lại." });
      });
    return () => huy.abort();
  }, [maKT]);

  const quayLai = <Link className="cand-back" to="/candidate/thi/lich-su"><BieuTuong name="arrow-left" size={15} /> Lịch sử thi</Link>;

  if (loi) {
    return (
      <div className="student-dashboard">
        <section className="cand-page-head">{quayLai}<h1>{loi.tieuDe}</h1></section>
        <section className="panel cand-empty-panel">{loi.noiDung}</section>
      </div>
    );
  }
  if (!bai) return <div className="student-dashboard"><section className="panel cand-empty-panel">Đang tải bài làm…</section></div>;

  const soDaChon = bai.cauHoi.filter((c) => c.dapAnChon).length;

  return (
    <div className="student-dashboard xl-page">
      <section className="cand-page-head">
        {quayLai}
        <h1>Xem lại bài: {bai.tenKT}</h1>
      </section>

      <section className="panel xl-tom-tat">
        <dl>
          <div><dt>Môn thi</dt><dd>{bai.monThi}</dd></div>
          <div><dt>Mã đề</dt><dd>{bai.tenDeCon}</dd></div>
          <div><dt>{bai.trangThai === "he_thong_thu" ? "Hệ thống thu lúc" : "Nộp lúc"}</dt><dd>{dinhDangThoiDiem.format(new Date(bai.tgNop))}</dd></div>
          <div><dt>Đã chọn</dt><dd>{soDaChon}/{bai.soCau} câu</dd></div>
          {bai.diem !== null && <div><dt>Điểm</dt><dd className="cand-score">{diemThi(bai.diem)} <small>({bai.soCauDung}/{bai.soCau} câu đúng)</small></dd></div>}
        </dl>
      </section>

      <nav aria-label="Danh sách câu" className="panel xl-so-cau">
        {bai.cauHoi.map((c) => (
          <a
            aria-label={`Câu ${c.ttCau}${c.dapAnChon ? `, đã chọn ${c.dapAnChon}` : ", chưa chọn"}`}
            className={c.dapAnChon ? "da-chon" : "bo-trong"}
            href={`#cau-${c.ttCau}`}
            key={c.ttCau}
          >
            {c.ttCau}
          </a>
        ))}
      </nav>

      <ol className="xl-cau-list">
        {bai.cauHoi.map((c) => (
          <li className="panel xl-cau" id={`cau-${c.ttCau}`} key={c.ttCau}>
            <div className="xl-cau-dau">
              <strong>Câu {c.ttCau}</strong>
              {c.danhDau && <span className="xl-danh-dau"><BieuTuong name="flag" size={13} /> Đã đánh dấu</span>}
              {!c.dapAnChon && <span className="xl-chua-chon">Chưa chọn</span>}
            </div>
            <div className="xl-noi-dung"><NoiDungCoHinh hinhAnh={c.hinhAnh} noiDung={c.noiDung} viTri="NOIDUNG" /></div>
            <ul className="xl-phuong-an">
              {c.phuongAn.map((pa) => (
                <li className={c.dapAnChon === pa.nhan ? "chon" : ""} key={pa.nhan}>
                  <span className="xl-nhan">{pa.nhan}</span>
                  <span><NoiDungCoHinh hinhAnh={c.hinhAnh} noiDung={pa.noiDung} viTri={`DA${pa.nhan}`} /></span>
                  {c.dapAnChon === pa.nhan && <span className="xl-ban-chon">Bạn chọn</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
