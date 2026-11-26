import { useEffect, useState } from "react";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { BaiLamChiTiet, DapAn, KetQuaCau } from "../../types/api";
import { baoCaoApi } from "./api";

const NHAN: DapAn[] = ["A", "B", "C", "D"];
const NHAN_KET_QUA: Record<KetQuaCau, string> = { dung: "Đúng", sai: "Sai", bo_trong: "Bỏ trống" };
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Loc = "tat_ca" | "sai";

/** Bài làm chi tiết của một thí sinh (chỉ quản trị viên): điểm, số câu đúng/sai, từng câu đúng hay sai. */
export function HopThoaiBaiLam({ maKT, msts, onDong }: { maKT: number; msts: string; onDong: () => void }) {
  const [bai, setBai] = useState<BaiLamChiTiet | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>("tat_ca");

  useEffect(() => {
    const huy = new AbortController();
    baoCaoApi.baiLam(maKT, msts, huy.signal)
      .then(setBai)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoi(error instanceof LoiApiHttp ? error.message : "Không thể kết nối máy chủ. Vui lòng thử lại.");
      });
    return () => huy.abort();
  }, [maKT, msts]);

  useEffect(() => {
    const dong = (event: KeyboardEvent) => { if (event.key === "Escape") onDong(); };
    document.addEventListener("keydown", dong);
    return () => document.removeEventListener("keydown", dong);
  }, [onDong]);

  const cauHienThi = bai ? bai.cauHoi.filter((c) => loc === "tat_ca" || c.ketQua !== "dung") : [];

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onDong(); }}>
      <section aria-labelledby="bai-lam-title" aria-modal="true" className="form-dialog bc-bai-lam" role="dialog">
        <header>
          <div>
            <span className="dialog-icon"><BieuTuong name="file" size={20} /></span>
            <div>
              <h3 id="bai-lam-title">{bai ? bai.hoTen : "Bài làm"}</h3>
              {bai && <small className="bc-bai-lam-phu">{bai.msts}{bai.lop ? ` · ${bai.lop}` : ""} · Mã đề {bai.tenDeCon}{bai.soMay ? ` · Máy ${bai.soMay}` : ""}</small>}
            </div>
          </div>
          <button aria-label="Đóng" className="dialog-close" onClick={onDong} type="button"><BieuTuong name="x" size={19} /></button>
        </header>
        <div className="dialog-body">
          {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}
          {!bai && !loi && <div className="outcomes-loading" aria-label="Đang tải">{[1, 2, 3].map((x) => <span key={x} />)}</div>}
          {bai && (
            <>
              <dl className="bc-bai-lam-tong">
                <div><dt>Điểm</dt><dd>{bai.diem === null ? "—" : dinhDangDiem.format(bai.diem)}</dd></div>
                <div className="is-dung"><dt>Câu đúng</dt><dd>{bai.soCauDung}<small>/{bai.tongSoCau}</small></dd></div>
                <div className="is-sai"><dt>Câu sai</dt><dd>{bai.soCauSai}<small>{bai.soBoTrong > 0 ? ` (${bai.soBoTrong} bỏ trống)` : ""}</small></dd></div>
              </dl>

              <div className="bc-bai-lam-loc" role="group" aria-label="Lọc câu hỏi">
                <button aria-pressed={loc === "tat_ca"} className={loc === "tat_ca" ? "is-active" : undefined} onClick={() => setLoc("tat_ca")} type="button">Tất cả ({bai.tongSoCau})</button>
                <button aria-pressed={loc === "sai"} className={loc === "sai" ? "is-active" : undefined} onClick={() => setLoc("sai")} type="button">Chỉ câu sai ({bai.soCauSai})</button>
              </div>

              <ol className="bc-cau-list">
                {cauHienThi.map((c) => (
                  <li className={`bc-cau is-${c.ketQua}`} key={c.ttCau}>
                    <div className="bc-cau-dau">
                      <strong>Câu {c.ttCau}</strong>
                      <span className="bc-ma-cau">{c.maCauHoi}</span>
                      <span className={`bc-ket-qua is-${c.ketQua}`}>{NHAN_KET_QUA[c.ketQua]}</span>
                    </div>
                    <p className="bc-cau-de">{c.noiDung}</p>
                    <ul className="bc-phuong-an">
                      {c.phuongAn.map((noiDung, i) => {
                        const nhan = NHAN[i];
                        const dung = nhan === c.dapAnDung;
                        const chon = nhan === c.dapAnChon;
                        return (
                          <li className={`${dung ? "is-dung" : ""}${chon && !dung ? " is-chon-sai" : ""}`} key={nhan}>
                            <span className="bc-nhan">{nhan}</span>
                            <span className="bc-phuong-an-chu">{noiDung}</span>
                            {(dung || chon) && (
                              <span className="bc-danh-dau">{dung && chon ? "Thí sinh chọn · Đáp án đúng" : dung ? "Đáp án đúng" : "Thí sinh chọn"}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
                {cauHienThi.length === 0 && <li className="bc-cau-trong">Thí sinh trả lời đúng tất cả các câu.</li>}
              </ol>
            </>
          )}
        </div>
        <footer>
          <button className="button button-secondary" onClick={onDong} type="button">Đóng</button>
        </footer>
      </section>
    </div>
  );
}
