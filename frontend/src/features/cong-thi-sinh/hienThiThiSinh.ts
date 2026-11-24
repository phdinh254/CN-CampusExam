/** Định dạng và nội dung hiển thị dùng chung của cổng thí sinh. Thi tập trung tại phòng máy. */

/** Quy định phòng thi hiển thị ở trang chi tiết kỳ thi. */
export const QUY_DINH_THI = [
  "Có mặt tại phòng máy trước giờ thi 10 phút, mang theo thẻ sinh viên hoặc CCCD.",
  "Ngồi đúng số máy được phân công; không tự ý đổi máy.",
  "Không sử dụng tài liệu, điện thoại hay thiết bị điện tử khác trong giờ thi.",
  "Bài làm được lưu tự động sau mỗi lựa chọn. Không tải lại trang hay đóng trình duyệt.",
  "Hết giờ, hệ thống tự thu bài. Sau khi nộp, không thể sửa bài làm.",
  "Gặp sự cố về máy hoặc mạng, giơ tay báo ngay cho giám thị.",
];

const dinhDangDiem = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const dinhDangNgayNgan = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export const diemThi = (diem: number) => dinhDangDiem.format(diem);

/** "08/11/2026" từ chuỗi ISO: dùng trong bảng kết quả và lịch sử thi. */
export const ngayThiNgan = (iso: string) => dinhDangNgayNgan.format(new Date(iso));
