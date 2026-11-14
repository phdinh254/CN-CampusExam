/*
 * Dữ liệu minh họa cho cổng thí sinh cho đến khi có API `/api/toi/ky-thi`, `/api/toi/ket-qua`.
 * Mọi chỗ dùng dữ liệu này đều gắn nhãn "Minh họa".
 * Thi tập trung tại phòng máy: vị trí của thí sinh là số máy.
 */

/** Trạng thái theo từng thí sinh (D-TRANGTHAI-TS-01), rút gọn cho cổng thí sinh. */
export type TrangThaiDuThi = "sap_thi" | "dang_mo" | "da_nop" | "he_thong_thu" | "vang_thi";

export type KyThiCuaToi = {
  maKT: number;
  tenKT: string;
  monThi: string;
  batDau: Date;
  thoiLuongPhut: number;
  soCau: number;
  soMay: number;
  trangThai: TrangThaiDuThi;
  /** Kỳ thi cho thí sinh xem điểm ngay sau khi nộp (HIENDIEM). */
  hienDiem: boolean;
  /** Có ngay sau khi nộp/hệ thống thu nếu `hienDiem`. */
  ketQua?: { soCauDung: number; diem: number };
};

export const NHAN_TRANG_THAI: Record<TrangThaiDuThi, { nhan: string; lop: string }> = {
  sap_thi: { nhan: "Sắp thi", lop: "tt-sap-thi" },
  dang_mo: { nhan: "Đang mở phòng thi", lop: "tt-dang-mo" },
  da_nop: { nhan: "Đã nộp bài", lop: "tt-da-nop" },
  he_thong_thu: { nhan: "Hệ thống thu bài", lop: "tt-da-nop" },
  vang_thi: { nhan: "Vắng thi", lop: "tt-vang" },
};

/** Thời điểm cách hôm nay `soNgay` ngày, lúc gio:phut. */
function luc(soNgay: number, gio: number, phut = 0) {
  const d = new Date();
  d.setDate(d.getDate() + soNgay);
  d.setHours(gio, phut, 0, 0);
  return d;
}

export function kyThiMinhHoa(): KyThiCuaToi[] {
  return [
    { maKT: 101, tenKT: "Thi cuối kỳ Cơ sở dữ liệu nâng cao", monThi: "Cơ sở dữ liệu nâng cao", batDau: luc(0, 8), thoiLuongPhut: 60, soCau: 40, soMay: 12, hienDiem: true, trangThai: "dang_mo" },
    { maKT: 102, tenKT: "Thi giữa kỳ Mạng máy tính", monThi: "Mạng máy tính", batDau: luc(3, 13, 30), thoiLuongPhut: 45, soCau: 30, soMay: 7, hienDiem: true, trangThai: "sap_thi" },
    { maKT: 95, tenKT: "Thi cuối kỳ Lập trình hướng đối tượng", monThi: "Lập trình hướng đối tượng", batDau: luc(-6, 9), thoiLuongPhut: 90, soCau: 50, soMay: 21, hienDiem: true, trangThai: "da_nop", ketQua: { soCauDung: 41, diem: 8.2 } },
    { maKT: 90, tenKT: "Thi giữa kỳ Cấu trúc dữ liệu", monThi: "Cấu trúc dữ liệu và giải thuật", batDau: luc(-20, 14), thoiLuongPhut: 60, soCau: 40, soMay: 3, hienDiem: true, trangThai: "he_thong_thu", ketQua: { soCauDung: 28, diem: 7 } },
    { maKT: 88, tenKT: "Thi thử Hệ điều hành", monThi: "Hệ điều hành", batDau: luc(-27, 9), thoiLuongPhut: 45, soCau: 30, soMay: 9, hienDiem: false, trangThai: "da_nop" },
    { maKT: 84, tenKT: "Thi giữa kỳ Toán rời rạc", monThi: "Toán rời rạc", batDau: luc(-35, 8), thoiLuongPhut: 60, soCau: 40, soMay: 15, hienDiem: true, trangThai: "vang_thi" },
  ];
}

export const laKyThiSapToi = (kt: KyThiCuaToi) => kt.trangThai === "sap_thi" || kt.trangThai === "dang_mo";

/** Quy định phòng thi hiển thị ở trang chi tiết kỳ thi. */
export const QUY_DINH_THI = [
  "Có mặt tại phòng máy trước giờ thi 10 phút, mang theo thẻ sinh viên hoặc CCCD.",
  "Ngồi đúng số máy được phân công; không tự ý đổi máy.",
  "Không sử dụng tài liệu, điện thoại hay thiết bị điện tử khác trong giờ thi.",
  "Bài làm được lưu tự động sau mỗi lựa chọn. Không tải lại trang hay đóng trình duyệt.",
  "Hết giờ, hệ thống tự thu bài. Sau khi nộp, không thể sửa bài làm.",
  "Gặp sự cố về máy hoặc mạng, giơ tay báo ngay cho giám thị.",
];

const dinhDangNgay = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const ngayThi = (kt: KyThiCuaToi) => {
  const text = dinhDangNgay.format(kt.batDau);
  return text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
};

export const gioThi = (kt: KyThiCuaToi) =>
  `${dinhDangGio.format(kt.batDau)} – ${dinhDangGio.format(new Date(kt.batDau.getTime() + kt.thoiLuongPhut * 60_000))}`;

export const diemThi = (diem: number) => dinhDangDiem.format(diem);

const dinhDangNgayNgan = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/** "08/11/2026": dùng trong bảng kết quả và lịch sử thi. */
export const ngayThiNgan = (kt: KyThiCuaToi) => dinhDangNgayNgan.format(kt.batDau);
