import { khachHttp } from "../../services/khachHttp";
import type { LanImport, TrangDuLieu, TruyVanTrang, XemTruocNhapCauHoi } from "../../types/api";

/** Giới hạn khớp backend (NhapCauHoiController); kiểm tra sớm để không upload vô ích. */
export const KICH_THUOC_TEP_TOI_DA = 20 * 1024 * 1024;

export const nhapCauHoiApi = {
  xemTruoc: (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return khachHttp.post<XemTruocNhapCauHoi>("/nhap-cau-hoi/xem-truoc", form, { signal });
  },

  /** Lỗi: `QUESTION_IMPORT_HAS_ERRORS` (dữ liệu đổi từ lúc xem trước), `IMPORT_PREVIEW_EXPIRED`, `IMPORT_PREVIEW_NOT_FOUND`. */
  xacNhan: (maXemTruoc: string) =>
    khachHttp.post<LanImport>(`/nhap-cau-hoi/xem-truoc/${encodeURIComponent(maXemTruoc)}/xac-nhan`),

  lichSu: (truyVan: TruyVanTrang, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<LanImport>>("/nhap-cau-hoi", { query: truyVan, signal }),
};

/** Ảnh câu hỏi cần access token nên tải dạng blob thay vì đặt thẳng vào `<img src>`. */
export function taiHinhCauHoi(url: string, signal?: AbortSignal) {
  // `url` từ API đã có tiền tố `/api`; khachHttp tự thêm tiền tố này.
  return khachHttp.get<Blob>(url.replace(/^\/api/, ""), { responseType: "blob", signal });
}
