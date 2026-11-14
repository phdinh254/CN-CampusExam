import { khachHttp } from "../../services/khachHttp";
import type { KqhtDto, MucDoDto, SuaKqhtRequest, TaoKqhtRequest, TrangThaiSuDung } from "../../types/api";

export const kqhtApi = {
  danhSach: (signal?: AbortSignal) => khachHttp.get<KqhtDto[]>("/kqht", { signal }),

  chiTiet: (maKQHT: number, signal?: AbortSignal) =>
    khachHttp.get<KqhtDto>(`/kqht/${maKQHT}`, { signal }),

  tao: (body: TaoKqhtRequest) => khachHttp.post<KqhtDto>("/kqht", body),

  sua: (maKQHT: number, body: SuaKqhtRequest) => khachHttp.put<KqhtDto>(`/kqht/${maKQHT}`, body),

  doiTrangThai: (maKQHT: number, trangThai: TrangThaiSuDung) =>
    khachHttp.patch<KqhtDto>(`/kqht/${maKQHT}/trang-thai`, { trangThai }),

  /** Chỉ xóa được KQHT chưa có câu hỏi/ma trận; ngược lại lỗi `KQHT_IN_USE`. */
  xoa: (maKQHT: number) => khachHttp.delete<void>(`/kqht/${maKQHT}`),
};

export const mucDoApi = {
  danhSach: (signal?: AbortSignal) => khachHttp.get<MucDoDto[]>("/muc-do", { signal }),
};
