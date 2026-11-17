import { khachHttp } from "../../services/khachHttp";
import type {
  DoPhu,
  LuuMaTranRequest,
  MaTranChiTiet,
  MaTranTomTat,
  SuaMaTranRequest,
  TrangDuLieu,
  TrangThaiMaTran,
  TruyVanMaTran,
} from "../../types/api";

export const maTranApi = {
  danhSach: (truyVan: TruyVanMaTran, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<MaTranTomTat>>("/ma-tran", { query: truyVan, signal }),

  chiTiet: (maMT: number, signal?: AbortSignal) => khachHttp.get<MaTranChiTiet>(`/ma-tran/${maMT}`, { signal }),

  /** Số câu đang sử dụng trong ngân hàng theo từng ô KQHT × mức độ. */
  doPhu: (signal?: AbortSignal) => khachHttp.get<DoPhu[]>("/ma-tran/do-phu", { signal }),

  tao: (body: LuuMaTranRequest) => khachHttp.post<MaTranChiTiet>("/ma-tran", body),

  /** Chỉ sửa được ma trận đang soạn; lệch `phienBan` trả lỗi `CONCURRENCY_CONFLICT`. */
  sua: (maMT: number, body: SuaMaTranRequest) => khachHttp.put<MaTranChiTiet>(`/ma-tran/${maMT}`, body),

  /** Kích hoạt thiếu câu trả lỗi `MATRIX_NOT_READY`; đã sinh đề trả `MATRIX_IN_USE`. */
  doiTrangThai: (maMT: number, trangThai: TrangThaiMaTran) =>
    khachHttp.patch<MaTranChiTiet>(`/ma-tran/${maMT}/trang-thai`, { trangThai }),

  xoa: (maMT: number) => khachHttp.delete<void>(`/ma-tran/${maMT}`),
};
