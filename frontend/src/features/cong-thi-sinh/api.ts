import { khachHttp } from "../../services/khachHttp";
import type { BaiLam, DanhSachKyThiCuaToi, HoSoCaNhan, KetQuaLuu, KetQuaNop, KyThiCuaToiApi, LoTraLoi } from "../../types/api";

const baiLam = (maKT: number) => `/toi/ky-thi/${maKT}/bai-lam`;

/** API của thí sinh đang đăng nhập (`/api/toi/*`). */
export const toiApi = {
  hoSo: (signal?: AbortSignal) => khachHttp.get<HoSoCaNhan>("/toi/ho-so", { signal }),

  /** Kỳ thi đã phát hành được phân công, kèm `gioServer` để đếm ngược theo đồng hồ máy chủ. */
  kyThi: (signal?: AbortSignal) => khachHttp.get<DanhSachKyThiCuaToi>("/toi/ky-thi", { signal }),

  chiTietKyThi: (maKT: number, signal?: AbortSignal) => khachHttp.get<KyThiCuaToiApi>(`/toi/ky-thi/${maKT}`, { signal }),

  /** Bắt đầu hoặc tiếp tục (idempotent). Lỗi: `EXAM_NOT_OPEN`, `ATTEMPT_CLOSED`. */
  batDau: (maKT: number) => khachHttp.post<BaiLam>(baiLam(maKT), {}),

  /** Hết giờ trả `ATTEMPT_CLOSED`. */
  luu: (maKT: number, lo: LoTraLoi) => khachHttp.put<KetQuaLuu>(`${baiLam(maKT)}/tra-loi`, lo),

  /** Gửi kèm lô cuối; gọi lại trả kết quả lần đầu. */
  nop: (maKT: number, lo: LoTraLoi) => khachHttp.post<KetQuaNop>(`${baiLam(maKT)}/nop`, lo),
};
