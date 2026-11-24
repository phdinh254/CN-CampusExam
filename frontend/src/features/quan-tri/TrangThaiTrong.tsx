import type { ReactNode } from "react";

import { BieuTuong, type TenBieuTuong } from "../../components/BieuTuong";

/** Trạng thái trống gọn của các khung trên trang Tổng quan. */
export function TrangThaiTrong({ bieuTuong, tieuDe, moTa, children }: { bieuTuong: TenBieuTuong; tieuDe: string; moTa?: string; children?: ReactNode }) {
  return (
    <div className="tq-empty">
      <span className="tq-empty-icon"><BieuTuong name={bieuTuong} size={22} /></span>
      <strong>{tieuDe}</strong>
      {moTa && <span>{moTa}</span>}
      {children}
    </div>
  );
}
