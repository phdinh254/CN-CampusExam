import { khachHttp } from "../../services/khachHttp";
import type {
  DeConChiTiet,
  DeGocChiTiet,
  DeGocTomTat,
  KetQuaSinhDe,
  SinhDeRequest,
  TrangDuLieu,
  TruyVanDeThi,
} from "../../types/api";

export const deThiApi = {
  danhSach: (truyVan: TruyVanDeThi, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<DeGocTomTat>>("/de-goc", { query: truyVan, signal }),

  chiTiet: (maDe: number, signal?: AbortSignal) => khachHttp.get<DeGocChiTiet>(`/de-goc/${maDe}`, { signal }),

  deCon: (maDe: number, maDeCon: number, signal?: AbortSignal) =>
    khachHttp.get<DeConChiTiet>(`/de-goc/${maDe}/de-con/${maDeCon}`, { signal }),

  /** Lỗi: `MATRIX_NOT_READY`, `PAPER_PERMUTATIONS_EXHAUSTED`, `PAPER_CODE_CONFLICT`. */
  sinh: (body: SinhDeRequest) => khachHttp.post<KetQuaSinhDe>("/de-goc", body),

  /** Đề đã gắn kỳ thi trả lỗi `PAPER_IN_USE`. */
  xoa: (maDe: number) => khachHttp.delete<void>(`/de-goc/${maDe}`),
};
