import { khachHttp } from "../../services/khachHttp";
import type {
  GiamSatKyThi,
  KetQuaPhanCong,
  KiemTraPhatHanh,
  KyThiChiTiet,
  KyThiTomTat,
  LuuKyThiRequest,
  SuaKyThiRequest,
  ThiSinhKyThi,
  TrangDuLieu,
  TruyVanKyThi,
} from "../../types/api";

export const kyThiApi = {
  danhSach: (truyVan: TruyVanKyThi, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<KyThiTomTat>>("/ky-thi", { query: truyVan, signal }),

  chiTiet: (maKT: number, signal?: AbortSignal) => khachHttp.get<KyThiChiTiet>(`/ky-thi/${maKT}`, { signal }),

  tao: (body: LuuKyThiRequest) => khachHttp.post<KyThiChiTiet>("/ky-thi", body),

  /** Chỉ sửa kỳ thi nháp; lệch `phienBan` trả `CONCURRENCY_CONFLICT`. */
  sua: (maKT: number, body: SuaKyThiRequest) => khachHttp.put<KyThiChiTiet>(`/ky-thi/${maKT}`, body),

  xoa: (maKT: number) => khachHttp.delete<void>(`/ky-thi/${maKT}`),

  /** `maDe: null` để gỡ đề; đề đã dùng cho kỳ thi khác trả `PAPER_IN_USE`. */
  ganDeGoc: (maKT: number, maDe: number | null) => khachHttp.put<KyThiChiTiet>(`/ky-thi/${maKT}/de-goc`, { maDe }),

  thiSinh: (maKT: number, signal?: AbortSignal) => khachHttp.get<ThiSinhKyThi[]>(`/ky-thi/${maKT}/thi-sinh`, { signal }),

  phanCong: (maKT: number, dsMsts: string[]) => khachHttp.post<KetQuaPhanCong>(`/ky-thi/${maKT}/thi-sinh`, { dsMsts }),

  doiSoMay: (maKT: number, msts: string, soMay: string | null) =>
    khachHttp.put<void>(`/ky-thi/${maKT}/thi-sinh/${encodeURIComponent(msts)}/so-may`, { soMay }),

  /** Thí sinh đã vào làm bài trả `EXAM_STUDENT_STARTED`. */
  boPhanCong: (maKT: number, msts: string) => khachHttp.delete<void>(`/ky-thi/${maKT}/thi-sinh/${encodeURIComponent(msts)}`),

  kiemTraPhatHanh: (maKT: number, signal?: AbortSignal) =>
    khachHttp.get<KiemTraPhatHanh>(`/ky-thi/${maKT}/kiem-tra-phat-hanh`, { signal }),

  phatHanh: (maKT: number) => khachHttp.post<KyThiChiTiet>(`/ky-thi/${maKT}/phat-hanh`, {}),

  huy: (maKT: number) => khachHttp.post<KyThiChiTiet>(`/ky-thi/${maKT}/huy`, {}),

  giamSat: (maKT: number, signal?: AbortSignal) => khachHttp.get<GiamSatKyThi>(`/ky-thi/${maKT}/giam-sat`, { signal }),

  /** Chỉ cộng cho bài đang làm; bài đã đóng trả `ATTEMPT_CLOSED`. */
  congGio: (maKT: number, maBL: number, soPhut: number, lyDo: string) =>
    khachHttp.post<void>(`/ky-thi/${maKT}/bai-lam/${maBL}/cong-gio`, { soPhut, lyDo }),
  thuBai: (maKT: number, maBL: number, lyDo: string) =>
    khachHttp.post<void>(`/ky-thi/${maKT}/bai-lam/${maBL}/thu-bai`, { lyDo }),
};
