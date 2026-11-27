import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { HoSoCaNhan } from "../../types/api";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";
import { dinhDangNgaySinh } from "../thi-sinh/bieuMauThiSinh";
import { toiApi } from "./api";

/** Bốn bước dự thi theo tài liệu yêu cầu. */
const buocDuThi: { title: string; text: string; links?: { to: string; label: string }[] }[] = [
  { title: "Đăng nhập", text: "Đăng nhập phần mềm bằng tài khoản được cấp." },
  {
    title: "Kiểm tra thông tin",
    text: "Kiểm tra thông tin cá nhân và môn thi đã được kích hoạt: giờ thi và số máy của bạn.",
    links: [
      { to: "/thi-sinh/tai-khoan", label: "Thông tin cá nhân" },
      { to: "/thi-sinh/thi/tham-gia", label: "Kỳ thi được phân công" },
    ],
  },
  { title: "Làm bài", text: "Làm bài trong thời gian quy định. Liên hệ giám thị ngay nếu có sự cố về máy hoặc mạng." },
  { title: "Nộp bài", text: "Nộp bài khi làm xong. Hết giờ mà chưa nộp, hệ thống tự động nộp bài.", links: [{ to: "/thi-sinh/thi/ket-qua", label: "Kết quả thi" }] },
];

const luuY = [
  "Có mặt tại phòng máy trước giờ thi 10 phút, mang theo thẻ sinh viên hoặc CCCD.",
  "Ngồi đúng số máy được phân công.",
  "Không tải lại trang hay đóng trình duyệt khi đang làm bài.",
  "Đăng xuất sau khi thi xong vì máy trong phòng dùng chung.",
];

/** "Thứ Bảy, 14/11/2026" theo giờ Việt Nam. */
function ngayHomNay() {
  const text = new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
}

export default function TongQuanThiSinh() {
  const taiKhoan = useTaiKhoan();
  const [hoSo, setHoSo] = useState<HoSoCaNhan | null>(null);

  useEffect(() => {
    const huy = new AbortController();
    toiApi.hoSo(huy.signal).then(setHoSo).catch(() => undefined);
    return () => huy.abort();
  }, []);

  const thongTin: [string, string][] = [
    ["Họ và tên", hoSo?.hoTen ?? taiKhoan.hoTen],
    ["Mã số thí sinh", taiKhoan.msts ?? "—"],
    ["Ngày sinh", hoSo ? dinhDangNgaySinh(hoSo.ngaySinh) : "…"],
    ["Lớp", hoSo ? (hoSo.lop ?? "—") : "…"],
  ];

  return (
    <div className="cand-home">
      <section aria-labelledby="chao-mung" className="panel cand-welcome">
        <p className="cand-welcome-date"><BieuTuong name="calendar" size={16} /> {ngayHomNay()}</p>
        <h1 id="chao-mung">Chào mừng bạn đến với kỳ thi</h1>

        <dl className="cand-facts">
          {thongTin.map(([nhan, giaTri]) => <div key={nhan}><dt>{nhan}</dt><dd>{giaTri}</dd></div>)}
        </dl>
      </section>

      <section aria-labelledby="huong-dan-du-thi" className="panel cand-guide">
        <h2 className="sr-only" id="huong-dan-du-thi">Hướng dẫn dự thi</h2>

        {/* Dòng thời gian dọc: vòng tròn đánh số nối bằng đường dọc. */}
        <ol className="cand-timeline">
          {buocDuThi.map((buoc, index) => (
            <li key={buoc.title}>
              <span aria-hidden="true" className="cand-timeline-dot">{index + 1}</span>
              <div className="cand-timeline-body">
                <p>{buoc.text}</p>
                {buoc.links && (
                  <div className="cand-step-links">
                    {buoc.links.map((link) => <Link key={link.to} to={link.to}>{link.label} <BieuTuong name="arrow-right" size={13} /></Link>)}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="cand-tips">
          <strong><BieuTuong name="alert" size={16} /> Lưu ý</strong>
          <ul>
            {luuY.map((dong) => <li key={dong}><BieuTuong name="check" size={14} /> <span>{dong}</span></li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
