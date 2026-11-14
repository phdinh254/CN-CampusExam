import { khachHttp } from "../../services/khachHttp";
import type {
  CauHoiChiTiet,
  CauHoiTomTat,
  SuaCauHoiRequest,
  TaoCauHoiRequest,
  ThongKeCauHoi,
  TrangDuLieu,
  TrangThaiSuDung,
  TruyVanCauHoi,
} from "../../types/api";

export const cauHoiApi = {
  danhSach: (truyVan: TruyVanCauHoi, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<CauHoiTomTat>>("/cau-hoi", { query: truyVan, signal }),

  thongKe: (signal?: AbortSignal) => khachHttp.get<ThongKeCauHoi>("/cau-hoi/thong-ke", { signal }),

  chiTiet: (maCH: number, signal?: AbortSignal) => khachHttp.get<CauHoiChiTiet>(`/cau-hoi/${maCH}`, { signal }),

  tao: (body: TaoCauHoiRequest) => khachHttp.post<CauHoiChiTiet>("/cau-hoi", body),

  /** Lệch `phienBan` trả lỗi `CONCURRENCY_CONFLICT`. */
  sua: (maCH: number, body: SuaCauHoiRequest) => khachHttp.put<CauHoiChiTiet>(`/cau-hoi/${maCH}`, body),

  doiTrangThai: (maCH: number, trangThai: TrangThaiSuDung) =>
    khachHttp.patch<CauHoiChiTiet>(`/cau-hoi/${maCH}/trang-thai`, { trangThai }),

  /** Chỉ xóa được câu chưa nằm trong đề; ngược lại lỗi `QUESTION_IN_USE`. */
  xoa: (maCH: number) => khachHttp.delete<void>(`/cau-hoi/${maCH}`),
};
