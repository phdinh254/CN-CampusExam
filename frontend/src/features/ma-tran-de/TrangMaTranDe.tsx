import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { BieuTuong, type TenBieuTuong } from "../../components/BieuTuong";
import { HopThoaiXacNhan } from "../../components/HopThoaiXacNhan";
import type { MaTranTomTat, TrangDuLieu, TrangThaiMaTran } from "../../types/api";
import { maTranApi } from "./api";
import { HopThoaiThongTinMaTran } from "./HopThoaiThongTinMaTran";
import { dinhDangNgay, laHuy, lopTrangThaiMaTran, nhanTrangThaiMaTran, thongBaoLoi } from "./hienThiMaTran";

const KICH_THUOC_TRANG = 20;

type HanhDong = "kich_hoat" | "ve_soan" | "ngung" | "xoa";

const moTaHanhDong: Record<HanhDong, { tieuDe: string; nut: string; trangThai?: TrangThaiMaTran; icon: TenBieuTuong }> = {
  kich_hoat: { tieuDe: "Kích hoạt ma trận?", nut: "Kích hoạt", trangThai: "su_dung", icon: "check" },
  ve_soan: { tieuDe: "Chuyển về đang soạn?", nut: "Về đang soạn", trangThai: "dang_soan", icon: "edit" },
  ngung: { tieuDe: "Ngừng sử dụng ma trận?", nut: "Ngừng sử dụng", trangThai: "ngung_su_dung", icon: "lock" },
  xoa: { tieuDe: "Xóa ma trận?", nut: "Xóa ma trận", icon: "x" },
};

/** Thao tác hợp lệ theo trạng thái; ma trận đã sinh đề chỉ còn ngừng sử dụng. */
function hanhDongCho(item: MaTranTomTat): HanhDong[] {
  const ds: HanhDong[] = [];
  if (item.trangThai !== "su_dung") ds.push("kich_hoat");
  if (item.trangThai !== "dang_soan" && !item.daSinhDe) ds.push("ve_soan");
  if (item.trangThai !== "ngung_su_dung") ds.push("ngung");
  if (!item.daSinhDe) ds.push("xoa");
  return ds;
}

export default function TrangMaTranDe() {
  const [data, setData] = useState<TrangDuLieu<MaTranTomTat> | null>(null);
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState<"" | TrangThaiMaTran>("");
  const [trang, setTrang] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ hanhDong: HanhDong; item: MaTranTomTat } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => { setTuKhoa(tuKhoaNhap.trim()); setTrang(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [tuKhoaNhap]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    maTranApi.danhSach({ tuKhoa: tuKhoa || undefined, trangThai: trangThai || undefined, trang, kichThuocTrang: KICH_THUOC_TRANG }, controller.signal)
      .then((result) => {
        if (result.duLieu.length === 0 && trang > 1 && result.tongSoTrang > 0) setTrang(result.tongSoTrang);
        else setData(result);
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tuKhoa, trangThai, trang, reloadKey]);

  async function handleConfirm() {
    if (!confirm) return;
    const { hanhDong, item } = confirm;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      if (hanhDong === "xoa") {
        await maTranApi.xoa(item.maMT);
        setSuccess(`Đã xóa ma trận "${item.tenMT}".`);
      } else {
        const moi = moTaHanhDong[hanhDong].trangThai!;
        await maTranApi.doiTrangThai(item.maMT, moi);
        setSuccess(`Ma trận "${item.tenMT}": ${nhanTrangThaiMaTran[moi].toLocaleLowerCase("vi")}.`);
      }
      setConfirm(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setConfirmError(thongBaoLoi(error));
    } finally {
      setConfirmBusy(false);
    }
  }

  const items = data?.duLieu ?? [];

  return (
    <div className="page-stack matrix-page">
      <section className="page-heading-row">
        <div>
          <h2>Ma trận đề</h2>
        </div>
        <div className="heading-actions">
          <button className="button button-primary" onClick={() => setShowForm(true)} type="button"><BieuTuong name="plus" size={17} /> Tạo ma trận</button>
        </div>
      </section>

      {success && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> {success}</span>
          <button aria-label="Đóng thông báo" onClick={() => setSuccess(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm ma trận" onChange={(event) => setTuKhoaNhap(event.target.value)} placeholder="Tìm theo tên ma trận" value={tuKhoaNhap} /></div>
          <select aria-label="Lọc trạng thái" onChange={(event) => { setTrangThai(event.target.value as typeof trangThai); setTrang(1); }} value={trangThai}>
            <option value="">Tất cả trạng thái</option>
            <option value="dang_soan">Đang soạn</option>
            <option value="su_dung">Sử dụng</option>
            <option value="ngung_su_dung">Ngừng sử dụng</option>
          </select>
        </div>

        {loadError ? (
          <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được dữ liệu</strong><span>{loadError}</span><button className="button button-secondary" onClick={() => setReloadKey((value) => value + 1)} type="button">Thử lại</button></div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table matrix-table">
                <thead><tr><th>MA TRẬN</th><th>SỐ KQHT</th><th>TỔNG CÂU</th><th>THỜI GIAN</th><th>TRẠNG THÁI</th><th>ĐỀ ĐÃ SINH</th><th>CẬP NHẬT</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.maMT}>
                      <td><Link className="matrix-name" to={`/admin/exam-matrices/${item.maMT}`}><strong>{item.tenMT}</strong></Link></td>
                      <td>{item.soKQHT}</td>
                      <td><strong>{item.tongSoCau}</strong></td>
                      <td>{item.thoiGianLam} phút</td>
                      <td><span className={`status-dot ${lopTrangThaiMaTran[item.trangThai]}`}>{nhanTrangThaiMaTran[item.trangThai]}</span></td>
                      <td>{item.daSinhDe ? "Đã sinh" : <span className="muted-cell">Chưa</span>}</td>
                      <td><span className="muted-cell">{dinhDangNgay(item.ngayCapNhat ?? item.ngayTao)}</span></td>
                      <td>
                        <div className="row-actions">
                          <Link aria-label={`Xem ${item.tenMT}`} className="row-action" title={item.trangThai === "dang_soan" && !item.daSinhDe ? "Sửa" : "Xem"} to={`/admin/exam-matrices/${item.maMT}`}>
                            <BieuTuong name={item.trangThai === "dang_soan" && !item.daSinhDe ? "edit" : "eye"} size={16} />
                          </Link>
                          {hanhDongCho(item).map((hanhDong) => (
                            <button
                              aria-label={`${moTaHanhDong[hanhDong].nut} ${item.tenMT}`}
                              className={`row-action${hanhDong === "xoa" ? " danger" : ""}`}
                              key={hanhDong}
                              onClick={() => { setConfirmError(null); setConfirm({ hanhDong, item }); }}
                              title={moTaHanhDong[hanhDong].nut}
                              type="button"
                            >
                              <BieuTuong name={moTaHanhDong[hanhDong].icon} size={16} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && items.length === 0 && <div className="empty-state"><BieuTuong name="layers" size={28} /><strong>Chưa có ma trận phù hợp</strong><span>Tạo ma trận mới hoặc đổi bộ lọc.</span></div>}
            <div className="table-footer">
              <span><strong>{data?.tongSoDong ?? 0}</strong> ma trận</span>
              <div className="pagination">
                <button aria-label="Trang trước" disabled={loading || trang <= 1} onClick={() => setTrang((value) => value - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
                <span>Trang {data && data.tongSoTrang > 0 ? data.trang : 0} / {data?.tongSoTrang ?? 0}</span>
                <button aria-label="Trang sau" disabled={loading || !data || trang >= data.tongSoTrang} onClick={() => setTrang((value) => value + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      {showForm && (
        <HopThoaiThongTinMaTran
          nutXacNhan={<>Tiếp tục <BieuTuong name="arrow-right" size={16} /></>}
          onDong={() => setShowForm(false)}
          onXacNhan={(tenMT, thoiGianLam) => navigate("/admin/exam-matrices/moi", { state: { tenMT, thoiGianLam } })}
          tieuDe="Tạo ma trận đề"
        />
      )}

      {confirm && (
        <HopThoaiXacNhan
          busy={confirmBusy}
          confirmLabel={moTaHanhDong[confirm.hanhDong].nut}
          danger={confirm.hanhDong === "xoa"}
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
          title={moTaHanhDong[confirm.hanhDong].tieuDe}
        >
          {confirm.hanhDong === "xoa" && <p>Xóa vĩnh viễn <strong>{confirm.item.tenMT}</strong>. Thao tác này không hoàn tác được.</p>}
          {confirm.hanhDong === "kich_hoat" && <p>Ma trận <strong>{confirm.item.tenMT}</strong> chỉ kích hoạt được khi mọi ô đủ câu trong ngân hàng. Sau khi kích hoạt, muốn sửa phải chuyển về đang soạn.</p>}
          {confirm.hanhDong === "ve_soan" && <p>Ma trận <strong>{confirm.item.tenMT}</strong> sẽ sửa được trở lại và tạm thời không dùng để sinh đề.</p>}
          {confirm.hanhDong === "ngung" && <p>Ma trận <strong>{confirm.item.tenMT}</strong> không dùng để sinh đề mới. Đề đã sinh không bị ảnh hưởng.</p>}
        </HopThoaiXacNhan>
      )}
    </div>
  );
}
