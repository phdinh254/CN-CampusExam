import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { DapAn, DeConChiTiet, DeGocChiTiet, ViTriHinhAnh } from "../../types/api";
import { dinhDangNgay, laHuy, TEN_MUC_DO, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { deThiApi } from "./api";
import { NoiDungCoHinh } from "./NoiDungCoHinh";

const VI_TRI_PHUONG_AN: Record<DapAn, ViTriHinhAnh> = { A: "DAA", B: "DAB", C: "DAC", D: "DAD" };

export default function TrangXemDe() {
  const { maDe: maDeParam } = useParams();
  const maDe = Number(maDeParam);
  const [deGoc, setDeGoc] = useState<DeGocChiTiet | null>(null);
  const [tab, setTab] = useState<number | "goc">("goc");
  const [deCon, setDeCon] = useState<DeConChiTiet | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Lỗi tải riêng của tab đề con; không làm mất đề gốc và các tab khác. */
  const [deConError, setDeConError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (!Number.isInteger(maDe) || maDe <= 0) {
      setLoadError("Mã đề không hợp lệ.");
      setLoading(false);
      return () => controller.abort();
    }
    deThiApi.chiTiet(maDe, controller.signal)
      .then(setDeGoc)
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [maDe]);

  useEffect(() => {
    if (tab === "goc") return undefined;
    const controller = new AbortController();
    setDeCon(null);
    setDeConError(null);
    deThiApi.deCon(maDe, tab, controller.signal)
      .then(setDeCon)
      .catch((error: unknown) => { if (!laHuy(error)) setDeConError(thongBaoLoi(error)); });
    return () => controller.abort();
  }, [maDe, tab]);

  if (loading) {
    return <div className="page-stack"><div className="outcomes-loading" aria-label="Đang tải đề">{[1, 2, 3].map((x) => <span key={x} />)}</div></div>;
  }

  if (loadError || !deGoc) {
    return (
      <div className="page-stack">
        <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được đề</strong><span>{loadError}</span><Link className="button button-secondary" to="/admin/exam-papers">Về danh sách đề</Link></div>
      </div>
    );
  }

  return (
    <div className="page-stack paper-page">
      <section className="page-heading-row">
        <div>
          <Link className="back-link" to="/admin/exam-papers"><BieuTuong name="arrow-left" size={15} /> Danh sách đề thi</Link>
          <h2>Đề {deGoc.maDeGocHienThi}</h2>
          <p>Ma trận {deGoc.tenMT} · {deGoc.tongSoCau} câu · {deGoc.deCon.length} đề con · sinh ngày {dinhDangNgay(deGoc.ngayTao)}{deGoc.daGanKyThi && " · đã gắn kỳ thi"}</p>
        </div>
      </section>

      <div className="paper-tabs" role="tablist">
        <button aria-selected={tab === "goc"} className={tab === "goc" ? "active" : undefined} onClick={() => setTab("goc")} role="tab" type="button">Đề gốc</button>
        {deGoc.deCon.map((dc) => (
          <button aria-selected={tab === dc.maDeCon} className={tab === dc.maDeCon ? "active" : undefined} key={dc.maDeCon} onClick={() => setTab(dc.maDeCon)} role="tab" type="button">Mã đề {dc.tenDeCon}</button>
        ))}
      </div>

      <section className="panel paper-questions">
        {tab === "goc" ? (
          <ol className="paper-list">
            {deGoc.cauHoi.map((cau) => (
              <li key={cau.maCH}>
                <header><strong>Câu {cau.thuTu}.</strong> <small>{cau.maCauHoi} · {TEN_MUC_DO[cau.maMD - 1]}{cau.coDinhDapAn && " · cố định đáp án"}</small></header>
                <p><NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={cau.noiDung} viTri="NOIDUNG" /></p>
                <ul className="paper-options">
                  {(["A", "B", "C", "D"] as DapAn[]).map((nhan) => (
                    <li className={cau.dapAnDung === nhan ? "correct" : undefined} key={nhan}>
                      <b>{nhan}.</b> <NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={cau[`phuongAn${nhan}`]} viTri={VI_TRI_PHUONG_AN[nhan]} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : deConError ? (
          <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được đề con</strong><span>{deConError}</span></div>
        ) : !deCon ? (
          <div className="outcomes-loading" aria-label="Đang tải đề con">{[1, 2].map((x) => <span key={x} />)}</div>
        ) : (
          <ol className="paper-list">
            {deCon.cauHoi.map((cau) => (
              <li key={cau.ttCau}>
                <header><strong>Câu {cau.ttCau}.</strong> <small>{cau.maCauHoi} · câu {cau.thuTuGoc} của đề gốc</small></header>
                <p><NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={cau.noiDung} viTri="NOIDUNG" /></p>
                <ul className="paper-options">
                  {cau.phuongAn.map((pa) => (
                    <li className={cau.dapAnDungHienThi === pa.nhan ? "correct" : undefined} key={pa.nhan}>
                      <b>{pa.nhan}.</b> <NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={pa.noiDung} viTri={VI_TRI_PHUONG_AN[pa.nhanGoc]} />
                      {pa.nhanGoc !== pa.nhan && <small className="paper-origin">(gốc {pa.nhanGoc})</small>}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
