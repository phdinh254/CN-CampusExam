import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { VungTaiTep, type TrangThaiTep } from "../../components/VungTaiTep";
import { LoiApiHttp } from "../../services/khachHttp";
import type { LanImport, TrangDuLieu, XemTruocNhapThiSinh } from "../../types/api";
import { dinhDangDungLuong, dinhDangGio } from "../ngan-hang-cau-hoi/hienThiNhap";
import { KICH_THUOC_TEP_EXCEL_TOI_DA, nhapThiSinhApi } from "./api";
import { dinhDangNgaySinh } from "./bieuMauThiSinh";

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

export default function TrangNhapThiSinh() {
  const [tep, setTep] = useState<File | null>(null);
  const [xemTruoc, setXemTruoc] = useState<XemTruocNhapThiSinh | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [dangGhi, setDangGhi] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [thanhCong, setThanhCong] = useState<LanImport | null>(null);
  const [chiDongLoi, setChiDongLoi] = useState(false);
  const [lichSu, setLichSu] = useState<TrangDuLieu<LanImport> | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    nhapThiSinhApi.lichSu({ trang: 1, kichThuocTrang: 10 }, controller.signal).then(setLichSu).catch(() => undefined);
    return () => controller.abort();
  }, [reloadKey]);

  async function taiTepMau() {
    try {
      const blob = await nhapThiSinhApi.tepMau();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-nhap-thi-sinh.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setLoi(thongBaoLoi(error));
    }
  }

  function xoaTep() {
    setTep(null);
    setXemTruoc(null);
    setLoi(null);
    setChiDongLoi(false);
  }

  async function xuLyTep(file: File) {
    setLoi(null);
    setThanhCong(null);
    setXemTruoc(null);
    setChiDongLoi(false);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setLoi("Chỉ hỗ trợ tệp .xlsx. Tệp .xls hoặc .csv cần mở bằng Excel và lưu lại dạng .xlsx.");
      return;
    }
    if (file.size > KICH_THUOC_TEP_EXCEL_TOI_DA) {
      setLoi(`Tệp ${dinhDangDungLuong(file.size)} vượt giới hạn 5 MB.`);
      return;
    }

    setTep(file);
    setDangDoc(true);
    try {
      const ketQua = await nhapThiSinhApi.xemTruoc(file);
      setXemTruoc(ketQua);
      setChiDongLoi(ketQua.soDongLoi > 0);
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
      const lan = await nhapThiSinhApi.xacNhan(xemTruoc.maXemTruoc);
      setThanhCong(lan);
      setXemTruoc(null);
      setTep(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setLoi(thongBaoLoi(error));
      if (error instanceof LoiApiHttp && ["IMPORT_PREVIEW_EXPIRED", "IMPORT_PREVIEW_NOT_FOUND", "STUDENT_IMPORT_HAS_ERRORS"].includes(error.code)) {
        setXemTruoc((current) => (current ? { ...current, maXemTruoc: null } : current));
      }
    } finally {
      setDangGhi(false);
    }
  }

  const dongHienThi = xemTruoc ? xemTruoc.dong.filter((dong) => !chiDongLoi || !dong.hopLe) : [];
  const trangThaiTep: TrangThaiTep | null = dangDoc ? { nhan: "Đang kiểm tra…", loai: "busy" }
    : xemTruoc?.maXemTruoc ? { nhan: "Hợp lệ", loai: "ok" }
    : xemTruoc ? { nhan: xemTruoc.tongDong === 0 ? "Không có thí sinh" : `${xemTruoc.soDongLoi} dòng lỗi`, loai: "error" }
    : null;

  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div><h2>Nhập thí sinh từ Excel</h2></div>
        <div className="heading-actions">
          <Link className="button button-secondary" to="/admin/candidates"><BieuTuong name="chevron-left" size={17} /> Thí sinh</Link>
          <button className="button button-secondary" onClick={() => void taiTepMau()} type="button"><BieuTuong name="file" size={17} /> Tải tệp mẫu</button>
        </div>
      </section>

      {thanhCong && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> Đã thêm {thanhCong.soThanhCong} thí sinh từ {thanhCong.tenFile}. <Link to="/admin/candidates">Xem danh sách thí sinh</Link></span>
          <button aria-label="Đóng thông báo" onClick={() => setThanhCong(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      <VungTaiTep
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        banXuLy={dangDoc || dangGhi}
        ghiChu="Chỉ nhận tệp .xlsx theo tệp mẫu, tối đa 5 MB."
        nhanNut="Chọn tệp .xlsx"
        onChon={(file) => void xuLyTep(file)}
        onXoa={xoaTep}
        tep={tep}
        tieuDe="Kéo thả tệp Excel vào đây"
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
                  <strong>Tệp hợp lệ — sẵn sàng thêm {xemTruoc.tongDong} thí sinh.</strong>
                  <span>Bản xem trước giữ tới {xemTruoc.hetHan ? dinhDangGio(xemTruoc.hetHan) : "—"}.</span>
                </>
              ) : xemTruoc.tongDong === 0 ? (
                <>
                  <strong>Tệp không có dòng thí sinh nào.</strong>
                  <span>Kiểm tra lại dữ liệu bên dưới dòng tiêu đề.</span>
                </>
              ) : (
                <>
                  <strong>Chưa thể nhập: {xemTruoc.soDongLoi}/{xemTruoc.tongDong} dòng có lỗi.</strong>
                  <span>Sửa các dòng lỗi trong tệp Excel rồi chọn lại tệp. Chưa có thí sinh nào được thêm.</span>
                </>
              )}
            </div>
            {xemTruoc.maXemTruoc && (
              <button className="button button-primary" disabled={dangDoc || dangGhi} onClick={() => void xacNhan()} type="button">
                {dangGhi ? "Đang ghi…" : <><BieuTuong name="check" size={16} /> Xác nhận nhập</>}
              </button>
            )}
          </section>

          <section className="mini-stats-grid">
            <div><p><small>TỔNG DÒNG</small><strong>{xemTruoc.tongDong}</strong></p></div>
            <div><p><small>HỢP LỆ</small><strong>{xemTruoc.soDongHopLe}</strong></p></div>
            <div><p><small>CÓ LỖI</small><strong>{xemTruoc.soDongLoi}</strong></p></div>
          </section>

          <section className="panel table-panel">
            <div className="table-toolbar">
              <label className="checkbox-field toolbar-check"><input checked={chiDongLoi} onChange={(event) => setChiDongLoi(event.target.checked)} type="checkbox" /><span>Chỉ hiện dòng có lỗi</span></label>
            </div>
            <div className="table-scroll">
              <table className="data-table import-table">
                <thead><tr><th>DÒNG</th><th>MSTS</th><th>HỌ VÀ TÊN</th><th>NGÀY SINH</th><th>GIỚI TÍNH</th><th>LỚP</th><th>CCCD</th><th>KIỂM TRA</th></tr></thead>
                <tbody>
                  {dongHienThi.map((dong) => (
                    <tr className={dong.hopLe ? undefined : "import-row-error"} key={dong.soDong}>
                      <td><span className="muted-cell">{dong.soDong}</span></td>
                      <td><strong>{dong.msts ?? "—"}</strong></td>
                      <td>{dong.hoTen ?? "—"}</td>
                      <td>{dong.ngaySinh ? dinhDangNgaySinh(dong.ngaySinh) : "—"}</td>
                      <td>{dong.gioiTinh === "nam" ? "Nam" : dong.gioiTinh === "nu" ? "Nữ" : "—"}</td>
                      <td>{dong.lop ?? "—"}</td>
                      <td>{dong.cccd ?? "—"}</td>
                      <td>
                        {dong.hopLe
                          ? <span className="status-dot status-active">Hợp lệ</span>
                          : <ul className="issue-list">{dong.loi.map((noiDung) => <li className="issue-error" key={noiDung}>{noiDung}</li>)}</ul>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dongHienThi.length === 0 && <div className="empty-state"><BieuTuong name="check" size={28} /><strong>Không có dòng nào bị lỗi</strong></div>}
          </section>
        </>
      )}

      <section className="panel table-panel">
        <div className="table-toolbar"><strong>Lịch sử nhập</strong></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>THỜI GIAN</th><th>TỆP</th><th>SỐ THÍ SINH</th><th>NGƯỜI NHẬP</th></tr></thead>
            <tbody>
              {(lichSu?.duLieu ?? []).map((lan) => (
                <tr key={lan.maLanImport}>
                  <td><span className="muted-cell">{dinhDangGio(lan.thoiGian)}</span></td>
                  <td>{lan.tenFile}</td>
                  <td>{lan.soThanhCong}</td>
                  <td>{lan.nguoiThucHien}</td>
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
