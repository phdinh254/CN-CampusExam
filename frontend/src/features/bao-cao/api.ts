import { khachHttp } from "../../services/khachHttp";
import type { DongBangDiem, ThongKeKetQua, TrangDuLieu, TruyVanBangDiem } from "../../types/api";

const goc = (maKT: number) => `/ky-thi/${maKT}/ket-qua`;

/** Kết quả kỳ thi đang thi hoặc đã kết thúc; trạng thái khác trả `EXAM_NO_RESULTS`. */
export const baoCaoApi = {
  thongKe: (maKT: number, signal?: AbortSignal) => khachHttp.get<ThongKeKetQua>(`${goc(maKT)}/thong-ke`, { signal }),

  bangDiem: (maKT: number, truyVan: TruyVanBangDiem, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<DongBangDiem>>(`${goc(maKT)}/bang-diem`, { query: truyVan, signal }),

  /** Cùng số liệu với màn hình; máy chủ ghi nhật ký "Xuất kết quả". */
  xuatExcel: (maKT: number) => khachHttp.get<Blob>(`${goc(maKT)}/xuat-excel`, { responseType: "blob" }),
};
