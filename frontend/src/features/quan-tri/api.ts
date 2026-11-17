import { khachHttp } from "../../services/khachHttp";
import type { NhatKy } from "../../types/api";

export const nhatKyApi = {
  /** Thao tác nghiệp vụ gần đây (mặc định không gồm đăng nhập/đăng xuất). */
  ganDay: (soDong: number, signal?: AbortSignal) => khachHttp.get<NhatKy[]>("/nhat-ky", { query: { soDong }, signal }),
};
