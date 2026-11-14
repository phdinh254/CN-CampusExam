import { khachHttp } from "../../services/khachHttp";
import type { HoSoCaNhan } from "../../types/api";

/** API của thí sinh đang đăng nhập (`/api/toi/*`). */
export const toiApi = {
  hoSo: (signal?: AbortSignal) => khachHttp.get<HoSoCaNhan>("/toi/ho-so", { signal }),
};
