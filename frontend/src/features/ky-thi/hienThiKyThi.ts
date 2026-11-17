import type { CachPhanDe, TrangThaiKyThi, TrangThaiThiSinhKyThi } from "../../types/api";

export const nhanTrangThaiKyThi: Record<TrangThaiKyThi, string> = {
  nhap: "Nháp",
  da_phat_hanh: "Sắp diễn ra",
  dang_thi: "Đang thi",
  da_ket_thuc: "Đã kết thúc",
  da_huy: "Đã hủy",
};

/** Lớp màu cho `.exam-status`. */
export const mauTrangThaiKyThi: Record<TrangThaiKyThi, string> = {
  nhap: "warning",
  da_phat_hanh: "indigo",
  dang_thi: "success",
  da_ket_thuc: "neutral",
  da_huy: "danger",
};

export const nhanTrangThaiThiSinh: Record<TrangThaiThiSinhKyThi, string> = {
  chua_thi: "Chưa vào thi",
  dang_thi: "Đang làm bài",
  da_nop: "Đã nộp",
  he_thong_thu: "Hệ thống thu bài",
};

export const lopTrangThaiThiSinh: Record<TrangThaiThiSinhKyThi, string> = {
  chua_thi: "status-disabled",
  dang_thi: "status-draft",
  da_nop: "status-active",
  he_thong_thu: "status-active",
};

export const nhanCachPhanDe: Record<CachPhanDe, string> = {
  can_bang: "Lần lượt, cân bằng số đề",
  ngau_nhien: "Ngẫu nhiên",
};

/** Còn thêm/bớt thí sinh được (khớp quy tắc backend). */
export const conPhanCongDuoc = (trangThai: TrangThaiKyThi) =>
  trangThai === "nhap" || trangThai === "da_phat_hanh" || trangThai === "dang_thi";

const pad = (n: number) => String(n).padStart(2, "0");
const gioPhut = (d: Date) => d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

export function dinhDangNgayGio(iso: string) {
  const d = new Date(iso);
  return {
    ngay: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
    gio: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Khung giờ "08:00 – 09:00" theo giờ máy người dùng. */
export function khungGio(iso: string, thoiLuong: number) {
  const batDau = new Date(iso);
  const ketThuc = new Date(batDau.getTime() + thoiLuong * 60_000);
  return `${gioPhut(batDau)} – ${gioPhut(ketThuc)}`;
}

/** ISO UTC → giá trị cho `<input type="datetime-local">` theo giờ địa phương. */
export function sangGioDiaPhuong(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Giá trị `datetime-local` (giờ địa phương) → ISO UTC; rỗng hoặc sai thì null. */
export function sangIsoUtc(giaTri: string) {
  if (!giaTri) return null;
  const d = new Date(giaTri);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "01:05:09" từ số mili giây còn lại. */
export function demNguoc(ms: number) {
  const tong = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(tong / 3600))}:${pad(Math.floor((tong % 3600) / 60))}:${pad(tong % 60)}`;
}
