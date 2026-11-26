import { khachHttp } from "../../services/khachHttp";
import type { BaiLamChiTiet, DongBangDiem, ThongKeKetQua, TrangDuLieu, TruyVanBangDiem } from "../../types/api";

const goc = (maKT: number) => `/ky-thi/${maKT}/ket-qua`;

/** Kết quả kỳ thi đang thi hoặc đã kết thúc; trạng thái khác trả `EXAM_NO_RESULTS`. */
export const baoCaoApi = {
  thongKe: (maKT: number, signal?: AbortSignal) => khachHttp.get<ThongKeKetQua>(`${goc(maKT)}/thong-ke`, { signal }),

  bangDiem: (maKT: number, truyVan: TruyVanBangDiem, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<DongBangDiem>>(`${goc(maKT)}/bang-diem`, { query: truyVan, signal }),

  /** Bài đã nộp/thu của một thí sinh, từng câu đúng/sai. Lỗi: `EXAM_ASSIGNMENT_NOT_FOUND`, `ATTEMPT_NOT_FOUND`. */
  baiLam: (maKT: number, msts: string, signal?: AbortSignal) =>
    khachHttp.get<BaiLamChiTiet>(`${goc(maKT)}/thi-sinh/${encodeURIComponent(msts)}`, { signal }),

  /** Cùng số liệu với màn hình (thêm sheet "Chi tiết" từng câu); máy chủ ghi nhật ký "Xuất kết quả". */
  xuatExcel: (maKT: number) => khachHttp.get<Blob>(`${goc(maKT)}/xuat-excel`, { responseType: "blob" }),
};
