import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { VungTaiTep, type TrangThaiTep } from "../../components/VungTaiTep";
import { LoiApiHttp } from "../../services/khachHttp";
import type { LanImport, TrangDuLieu, XemTruocNhapCauHoi } from "../../types/api";
import { KICH_THUOC_TEP_TOI_DA, nhapCauHoiApi } from "./apiNhapCauHoi";
import { dinhDangDungLuong, dinhDangGio, locDong, soCanhBao, tomTatNoiDung } from "./hienThiNhap";

const trangThaiLanImport: Record<LanImport["trangThai"], string> = {
  dang_xu_ly: "Đang xử lý",
  hoan_tat: "Hoàn tất",
  that_bai: "Thất bại",
  hoan_tat_co_loi: "Hoàn tất có lỗi",
};

function thongBaoLoi(error: unknown) {
  if (error instanceof LoiApiHttp) {
    switch (error.code) {
      case "IMPORT_PREVIEW_EXPIRED": return "Bản xem trước đã quá 30 phút. Hãy chọn lại tệp.";
      case "IMPORT_PREVIEW_NOT_FOUND": return "Bản xem trước không còn (đã xác nhận hoặc hết hạn). Hãy chọn lại tệp.";
      default: return error.problem?.detail ?? error.message;
    }
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

export default function TrangNhapCauHoi() {
  const [tep, setTep] = useState<File | null>(null);
  const [xemTruoc, setXemTruoc] = useState<XemTruocNhapCauHoi | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [dangGhi, setDangGhi] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thanhCong, setThanhCong] = useState<LanImport | null>(null);
  const [chiCoVanDe, setChiCoVanDe] = useState(false);
  const [lichSu, setLichSu] = useState<TrangDuLieu<LanImport> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    nhapCauHoiApi.lichSu({ trang: 1, kichThuocTrang: 10 }, controller.signal).then(setLichSu).catch(() => undefined);
    return () => controller.abort();
  }, [reloadKey]);

  const banXuLy = dangDoc || dangGhi;

  function xoaTep() {
    setTep(null);
    setXemTruoc(null);
    setLoi(null);
    setChiCoVanDe(false);
  }

  async function xuLyTep(file: File) {
    setLoi(null);
    setThanhCong(null);
    setXemTruoc(null);
    setChiCoVanDe(false);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setLoi("Chỉ hỗ trợ tệp .docx. Tệp .doc cũ cần mở bằng Word và lưu lại dạng .docx.");
      return;
    }
    if (file.size > KICH_THUOC_TEP_TOI_DA) {
      setLoi(`Tệp ${dinhDangDungLuong(file.size)} vượt giới hạn 20 MB.`);
      return;
    }

    setTep(file);
    setDangDoc(true);
    try {
      const ketQua = await nhapCauHoiApi.xemTruoc(file);
      setXemTruoc(ketQua);
      setChiCoVanDe(ketQua.soDongLoi > 0);
    } catch (error) {
      setTep(null);
      setLoi(thongBaoLoi(error));
    } finally {
      setDangDoc(false);
    }
  }

  async function xacNhan() {
    if (!xemTruoc?.maXemTruoc) return;
    setDangGhi(true);
    setLoi(null);
    try {
      const lan = await nhapCauHoiApi.xacNhan(xemTruoc.maXemTruoc);
      setThanhCong(lan);
      setXemTruoc(null);
      setTep(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setLoi(thongBaoLoi(error));
      // Bản xem trước không dùng lại được sau các lỗi này; phải tải tệp lên lại.
      if (error instanceof LoiApiHttp && ["IMPORT_PREVIEW_EXPIRED", "IMPORT_PREVIEW_NOT_FOUND", "QUESTION_IMPORT_HAS_ERRORS"].includes(error.code)) {
        setXemTruoc((current) => (current ? { ...current, maXemTruoc: null } : current));
      }
    } finally {
      setDangGhi(false);
    }
  }

  const dongHienThi = xemTruoc ? locDong(xemTruoc.dong, chiCoVanDe) : [];
  const canhBao = xemTruoc ? soCanhBao(xemTruoc.dong) : 0;
  const trangThaiTep: TrangThaiTep | null = dangDoc ? { nhan: "Đang kiểm tra…", loai: "busy" }
    : xemTruoc?.maXemTruoc ? { nhan: "Hợp lệ", loai: "ok" }
    : xemTruoc ? { nhan: xemTruoc.tongDong === 0 ? "Không có câu hỏi" : `${xemTruoc.soDongLoi} dòng lỗi`, loai: "error" }
    : null;

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div><h2>Nhập câu hỏi từ Word</h2></div>
        <div className="heading-actions">
          <Link className="button button-secondary" to="/admin/questions"><BieuTuong name="chevron-left" size={17} /> Ngân hàng câu hỏi</Link>
        </div>
      </section>

      {thanhCong && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> Đã nhập {thanhCong.soThanhCong} câu hỏi từ {thanhCong.tenFile}. <Link to="/admin/questions">Xem ngân hàng câu hỏi</Link></span>
          <button aria-label="Đóng thông báo" onClick={() => setThanhCong(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      <VungTaiTep
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        banXuLy={banXuLy}
        ghiChu="Chỉ nhận tệp .docx, tối đa 20 MB."
        nhanNut="Chọn tệp .docx"
        onChon={(file) => void xuLyTep(file)}
        onXoa={xoaTep}
        tep={tep}
        tieuDe="Kéo thả tệp Word vào đây"
        trangThai={trangThaiTep}
      />

      {loi && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loi}</span></div>}

      {xemTruoc && (
        <>
          {/* Kết quả kiểm tra tệp. */}
          <section className={`panel import-result ${xemTruoc.maXemTruoc ? "is-ok" : "is-error"}`} role="status">
            <span className="import-result-icon"><BieuTuong name={xemTruoc.maXemTruoc ? "check" : "alert"} size={20} /></span>
            <div>
              {xemTruoc.maXemTruoc ? (
                <>
                  <strong>Tệp hợp lệ — sẵn sàng nhập {xemTruoc.tongDong} câu hỏi.</strong>
                  <span>Bản xem trước giữ tới {xemTruoc.hetHan ? dinhDangGio(xemTruoc.hetHan) : "—"}.{canhBao > 0 ? ` Có ${canhBao} cảnh báo, nên xem lại trước khi nhập.` : ""}</span>
                </>
              ) : xemTruoc.tongDong === 0 ? (
                <>
                  <strong>Tệp không có dòng câu hỏi nào.</strong>
                  <span>Kiểm tra lại bảng câu hỏi trong tệp.</span>
                </>
              ) : (
                <>
                  <strong>Chưa thể nhập: {xemTruoc.soDongLoi}/{xemTruoc.tongDong} dòng có lỗi.</strong>
                  <span>Sửa các dòng lỗi trong tệp Word rồi chọn lại tệp. Chưa có dòng nào được ghi.</span>
                </>
              )}
            </div>
            {xemTruoc.maXemTruoc && (
              <button className="button button-primary" disabled={banXuLy} onClick={() => void xacNhan()} type="button">
                {dangGhi ? "Đang ghi…" : <><BieuTuong name="check" size={16} /> Xác nhận nhập</>}
              </button>
            )}
          </section>

          <section className="mini-stats-grid">
            <div><p><small>TỔNG DÒNG</small><strong>{xemTruoc.tongDong}</strong></p></div>
            <div><p><small>HỢP LỆ</small><strong>{xemTruoc.soDongHopLe}</strong></p></div>
            <div><p><small>CÓ LỖI</small><strong>{xemTruoc.soDongLoi}</strong></p>{canhBao > 0 && <em>{canhBao} cảnh báo</em>}</div>
            <div><p><small>HÌNH ẢNH</small><strong>{xemTruoc.tongHinhAnh}</strong></p></div>
          </section>

          <section className="panel table-panel">
            <div className="table-toolbar">
              <label className="checkbox-field toolbar-check"><input checked={chiCoVanDe} onChange={(event) => setChiCoVanDe(event.target.checked)} type="checkbox" /><span>Chỉ hiện dòng có lỗi hoặc cảnh báo</span></label>
            </div>
            <div className="table-scroll">
              <table className="data-table import-table">
                <thead><tr><th>DÒNG</th><th>MÃ</th><th>NỘI DUNG</th><th>ĐÁP ÁN</th><th>KIỂM TRA</th></tr></thead>
                <tbody>
                  {dongHienThi.map((dong) => (
                    <tr className={dong.hopLe ? undefined : "import-row-error"} key={dong.soDong}>
                      <td><span className="muted-cell">{dong.soDong}</span></td>
                      <td><strong className="question-code">{dong.maCauHoi ?? "—"}</strong></td>
                      <td><div className="question-cell"><strong>{tomTatNoiDung(dong.noiDung) || <span className="muted-cell">(trống)</span>}</strong>{dong.hinhAnh.length > 0 && <small>{dong.hinhAnh.length} hình</small>}</div></td>
                      <td>{dong.dapAnDung ?? "—"}</td>
                      <td>
                        {dong.vanDe.length === 0
                          ? <span className="status-dot status-active">Hợp lệ</span>
                          : <ul className="issue-list">{dong.vanDe.map((vanDe, index) => <li className={vanDe.mucDo === "loi" ? "issue-error" : "issue-warning"} key={`${vanDe.code}-${index}`}>{vanDe.noiDung}</li>)}</ul>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dongHienThi.length === 0 && <div className="empty-state"><BieuTuong name="check" size={28} /><strong>Không có dòng nào có vấn đề</strong></div>}
          </section>
        </>
      )}

      <section className="panel table-panel">
        <div className="table-toolbar"><strong>Lịch sử nhập</strong></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>THỜI GIAN</th><th>TỆP</th><th>SỐ CÂU</th><th>NGƯỜI NHẬP</th><th>TRẠNG THÁI</th></tr></thead>
            <tbody>
              {(lichSu?.duLieu ?? []).map((lan) => (
                <tr key={lan.maLanImport}>
                  <td><span className="muted-cell">{dinhDangGio(lan.thoiGian)}</span></td>
                  <td>{lan.tenFile}</td>
                  <td>{lan.soThanhCong}/{lan.tongDong}</td>
                  <td>{lan.nguoiThucHien}</td>
                  <td><span className={`status-dot ${lan.trangThai === "hoan_tat" ? "status-active" : "status-disabled"}`}>{trangThaiLanImport[lan.trangThai]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lichSu?.duLieu.length === 0 && <div className="empty-state"><BieuTuong name="clock" size={28} /><strong>Chưa có lần nhập nào</strong></div>}
      </section>
    </div>
  );
}
