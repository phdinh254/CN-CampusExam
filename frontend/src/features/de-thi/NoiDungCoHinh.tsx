import type { HinhTrongDe, ViTriHinhAnh } from "../../types/api";
import { HinhCauHoi } from "../ngan-hang-cau-hoi/HinhCauHoi";

const MARKER = /\{\{media:(NOIDUNG|DAA|DAB|DAC|DAD):(\d+)\}\}/g;

type NoiDungCoHinhProps = {
  noiDung: string;
  /** Vị trí gốc của đoạn văn bản; hình cùng vị trí mà không có marker hiện bên dưới. */
  viTri: ViTriHinhAnh;
  hinhAnh: HinhTrongDe[];
};

/** Hiện văn bản câu hỏi/phương án, thay marker `{{media:VITRI:THUTU}}` bằng hình tại chỗ. */
export function NoiDungCoHinh({ noiDung, viTri, hinhAnh }: NoiDungCoHinhProps) {
  const timHinh = (v: string, t: number) => hinhAnh.find((h) => h.viTri === v && h.thuTu === t);
  const daDung = new Set<HinhTrongDe>();
  const phan: React.ReactNode[] = [];
  let viTriCuoi = 0;

  for (const khop of noiDung.matchAll(MARKER)) {
    const batDau = khop.index ?? 0;
    if (batDau > viTriCuoi) phan.push(noiDung.slice(viTriCuoi, batDau));
    const hinh = timHinh(khop[1], Number(khop[2]));
    if (hinh) {
      daDung.add(hinh);
      phan.push(<HinhCauHoi alt={hinh.altText ?? "Hình minh họa"} key={`${hinh.viTri}-${hinh.thuTu}`} url={hinh.url} />);
    }
    viTriCuoi = batDau + khop[0].length;
  }
  if (viTriCuoi < noiDung.length) phan.push(noiDung.slice(viTriCuoi));

  const conLai = hinhAnh.filter((h) => h.viTri === viTri && !daDung.has(h));

  return (
    <span className="paper-content">
      {phan}
      {conLai.map((h) => <HinhCauHoi alt={h.altText ?? "Hình minh họa"} key={`${h.viTri}-${h.thuTu}-du`} url={h.url} />)}
    </span>
  );
}
