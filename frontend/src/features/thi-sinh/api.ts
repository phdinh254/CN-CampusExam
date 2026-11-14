import { khachHttp } from "../../services/khachHttp";
import type {
  HoSoThiSinh,
  LanImport,
  TaoThiSinhRequest,
  ThiSinhChiTiet,
  ThiSinhTomTat,
  TrangDuLieu,
  TrangThaiTaiKhoan,
  TruyVanThiSinh,
  TruyVanTrang,
  XemTruocNhapThiSinh,
} from "../../types/api";

const duongDan = (msts: string) => `/thi-sinh/${encodeURIComponent(msts)}`;

export const thiSinhApi = {
  danhSach: (truyVan: TruyVanThiSinh, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<ThiSinhTomTat>>("/thi-sinh", { query: truyVan, signal }),

  lop: (signal?: AbortSignal) => khachHttp.get<string[]>("/thi-sinh/lop", { signal }),

  chiTiet: (msts: string, signal?: AbortSignal) => khachHttp.get<ThiSinhChiTiet>(duongDan(msts), { signal }),

  tao: (body: TaoThiSinhRequest) => khachHttp.post<ThiSinhChiTiet>("/thi-sinh", body),

  sua: (msts: string, body: HoSoThiSinh) => khachHttp.put<ThiSinhChiTiet>(duongDan(msts), body),

  doiTrangThaiTaiKhoan: (msts: string, trangThai: TrangThaiTaiKhoan) =>
    khachHttp.patch<ThiSinhChiTiet>(`${duongDan(msts)}/trang-thai-tai-khoan`, { trangThai }),

  /** Đặt lại về ngày sinh; API không trả mật khẩu. */
  capLaiMatKhau: (msts: string) => khachHttp.post<ThiSinhChiTiet>(`${duongDan(msts)}/cap-lai-mat-khau`),

  /** Chỉ xóa được thí sinh chưa được phân công thi; ngược lại lỗi `STUDENT_IN_USE`. */
  xoa: (msts: string) => khachHttp.delete<void>(duongDan(msts)),
};

/** Giới hạn khớp backend (NhapThiSinhController). */
export const KICH_THUOC_TEP_EXCEL_TOI_DA = 5 * 1024 * 1024;

export const nhapThiSinhApi = {
  tepMau: () => khachHttp.get<Blob>("/nhap-thi-sinh/tep-mau", { responseType: "blob" }),

  xemTruoc: (file: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return khachHttp.post<XemTruocNhapThiSinh>("/nhap-thi-sinh/xem-truoc", form, { signal });
  },

  /** Lỗi: `STUDENT_IMPORT_HAS_ERRORS` (dữ liệu đổi từ lúc xem trước), `IMPORT_PREVIEW_EXPIRED`, `IMPORT_PREVIEW_NOT_FOUND`. */
  xacNhan: (maXemTruoc: string) =>
    khachHttp.post<LanImport>(`/nhap-thi-sinh/xem-truoc/${encodeURIComponent(maXemTruoc)}/xac-nhan`),

  lichSu: (truyVan: TruyVanTrang, signal?: AbortSignal) =>
    khachHttp.get<TrangDuLieu<LanImport>>("/nhap-thi-sinh", { query: truyVan, signal }),
};
