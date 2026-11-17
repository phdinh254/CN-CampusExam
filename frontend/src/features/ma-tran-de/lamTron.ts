export type BaMuc = [number, number, number];

/**
 * Quy tỷ lệ % của ba mức độ ra số câu sao cho tổng đúng bằng `tongSoCau`: lấy phần nguyên,
 * phần câu còn thiếu cấp cho các mức có phần lẻ lớn nhất; bằng nhau thì ưu tiên mức dễ hơn.
 * Ví dụ 35 câu với 30/50/20 → 11/17/7.
 */
export function quyRaSoCau(tongSoCau: number, tyLe: BaMuc): BaMuc {
  const thuc = tyLe.map((p) => (tongSoCau * p) / 100);
  const ketQua = thuc.map(Math.floor) as BaMuc;
  let conThieu = tongSoCau - ketQua.reduce((a, b) => a + b, 0);
  const thuTu = [0, 1, 2].sort((i, j) => thuc[j] - ketQua[j] - (thuc[i] - ketQua[i]) || i - j);
  for (const i of thuTu) {
    if (conThieu <= 0) break;
    ketQua[i] += 1;
    conThieu -= 1;
  }
  return ketQua;
}

/** Tổng ba tỷ lệ đúng 100% (làm tròn 2 chữ số để tránh sai số số thực). */
export function tyLeHopLe(tyLe: BaMuc): boolean {
  return tyLe.every((p) => p >= 0 && p <= 100) && Math.round(tyLe.reduce((a, b) => a + b, 0) * 100) === 10000;
}
