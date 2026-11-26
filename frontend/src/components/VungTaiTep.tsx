import { useRef, useState, type DragEvent } from "react";

import { dinhDangDungLuong } from "../features/ngan-hang-cau-hoi/hienThiNhap";
import { BieuTuong } from "./BieuTuong";

export type TrangThaiTep = { nhan: string; loai: "busy" | "ok" | "error" };

type Props = {
  /** Tệp đang chọn; null thì hiện vùng kéo thả. */
  tep: File | null;
  /** Thuộc tính accept của ô chọn tệp. */
  accept: string;
  /** Tên nút chọn tệp, ví dụ "Chọn tệp .docx". */
  nhanNut: string;
  /** Tiêu đề vùng kéo thả, ví dụ "Kéo thả tệp Word vào đây". */
  tieuDe: string;
  /** Ghi chú ngắn về định dạng và dung lượng. */
  ghiChu: string;
  trangThai: TrangThaiTep | null;
  /** Đang đọc hoặc đang ghi: khóa chọn, thả và bỏ tệp. */
  banXuLy: boolean;
  onChon: (file: File) => void;
  onXoa: () => void;
};

/** Vùng tải tệp dùng chung cho các trang nhập dữ liệu: kéo thả hoặc bấm chọn, hiện tệp đã chọn và trạng thái kiểm tra. */
export function VungTaiTep({ tep, accept, nhanNut, tieuDe, ghiChu, trangThai, banXuLy, onChon, onXoa }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [keoTha, setKeoTha] = useState(false);

  function moHopChonTep() {
    if (!banXuLy) inputRef.current?.click();
  }

  const keoThaProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = banXuLy ? "none" : "copy";
      if (!banXuLy) setKeoTha(true);
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeoTha(false);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setKeoTha(false);
      const file = event.dataTransfer.files[0];
      if (file && !banXuLy) onChon(file);
    },
  };

  return (
    <>
      <input
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onChon(file);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {tep ? (
        <section className={`panel import-file${keoTha ? " is-dragging" : ""}`} {...keoThaProps}>
          <span className="import-file-icon"><BieuTuong name="file" size={22} /></span>
          <div className="import-file-info">
            <strong title={tep.name}>{tep.name}</strong>
            <span>
              {dinhDangDungLuong(tep.size)}
              {trangThai && <em className={`import-chip is-${trangThai.loai}`}>{trangThai.nhan}</em>}
            </span>
          </div>
          <div className="import-file-actions">
            <button className="button button-secondary" disabled={banXuLy} onClick={moHopChonTep} type="button">Chọn tệp khác</button>
            <button aria-label={`Bỏ tệp ${tep.name}`} className="row-action danger" disabled={banXuLy} onClick={onXoa} title="Bỏ tệp" type="button"><BieuTuong name="x" size={17} /></button>
          </div>
        </section>
      ) : (
        <section className={`panel import-drop${keoTha ? " is-dragging" : ""}`} {...keoThaProps}>
          <span className="import-drop-icon"><BieuTuong name="file" size={28} /></span>
          <div className="import-drop-text">
            <strong>{keoTha ? "Thả tệp để tải lên" : tieuDe}</strong>
            <span>hoặc</span>
          </div>
          <button className="button button-primary" disabled={banXuLy} onClick={moHopChonTep} type="button">{nhanNut}</button>
          <small className="import-drop-hint">{ghiChu}</small>
        </section>
      )}
    </>
  );
}
