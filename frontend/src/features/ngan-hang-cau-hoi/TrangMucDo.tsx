import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import type { MucDoDto } from "../../types/api";
import { mucDoApi } from "../ket-qua-hoc-tap/api";
import { cauHoiApi } from "./api";

type DongMucDo = MucDoDto & { soCauHoi: number };

/** Danh mục mức độ cố định (1 dễ, 2 trung bình, 3 khó); số là một phần của mã câu hỏi nên không sửa được. */
export default function TrangMucDo() {
  const [dong, setDong] = useState<DongMucDo[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    const huy = new AbortController();
    mucDoApi.danhSach(huy.signal)
      .then((mucDo) => Promise.all(mucDo.map(async (md) => {
        const trang = await cauHoiApi.danhSach({ maMD: md.maMD, kichThuocTrang: 1 }, huy.signal);
        return { ...md, soCauHoi: trang.tongSoDong };
      })))
      .then(setDong)
      .catch((error: unknown) => {
        if (!huy.signal.aborted) setLoi(error instanceof Error ? error.message : "Không tải được danh mục mức độ.");
      });
    return () => huy.abort();
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <h2>Mức độ câu hỏi</h2>
          <p>Danh mục cố định dùng để phân loại câu hỏi và lập ma trận đề. Số mức độ là một phần của mã câu hỏi (ví dụ A1-1).</p>
        </div>
      </section>

      <section className="panel table-panel">
        {loi && <div className="empty-state"><BieuTuong name="alert" size={26} /><strong>{loi}</strong></div>}
        {!loi && (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>MÃ</th><th>MỨC ĐỘ</th><th>SỐ CÂU HỎI</th><th aria-label="Thao tác" /></tr></thead>
              <tbody>
                {(dong ?? []).map((md) => (
                  <tr key={md.maMD}>
                    <td><span className="level-code">{md.maMD}</span></td>
                    <td><strong>{md.tenMD}</strong></td>
                    <td>{md.soCauHoi}</td>
                    <td className="cell-action"><Link to={`/admin/questions?maMD=${md.maMD}`}>Xem câu hỏi <BieuTuong name="arrow-right" size={14} /></Link></td>
                  </tr>
                ))}
                {dong === null && <tr><td className="cell-loading" colSpan={4}>Đang tải…</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
