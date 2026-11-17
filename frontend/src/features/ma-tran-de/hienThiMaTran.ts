import { LoiApiHttp } from "../../services/khachHttp";
import type { TrangThaiMaTran } from "../../types/api";

export const nhanTrangThaiMaTran: Record<TrangThaiMaTran, string> = {
  dang_soan: "Đang soạn",
  su_dung: "Sử dụng",
  ngung_su_dung: "Ngừng sử dụng",
};

export const lopTrangThaiMaTran: Record<TrangThaiMaTran, string> = {
  dang_soan: "status-draft",
  su_dung: "status-active",
  ngung_su_dung: "status-disabled",
};

export const TEN_MUC_DO = ["Dễ", "Trung bình", "Khó"] as const;

export function dinhDangNgay(giaTri: string | null) {
  return giaTri ? new Date(giaTri).toLocaleDateString("vi-VN") : "—";
}

export function thongBaoLoi(error: unknown) {
  if (error instanceof LoiApiHttp) return error.message;
  return "Không thể tải dữ liệu. Vui lòng thử lại.";
}

export function laHuy(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
