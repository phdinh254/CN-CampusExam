import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { HopThoaiXacNhan } from "../../components/HopThoaiXacNhan";
import type { KyThiChiTiet, KyThiTomTat, TrangDuLieu, TrangThaiKyThi } from "../../types/api";
import { laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { kyThiApi } from "./api";
import { HopThoaiKyThi } from "./HopThoaiKyThi";
import { demNguoc, dinhDangNgayGio, khungGio, mauTrangThaiKyThi, nhanTrangThaiKyThi } from "./hienThiKyThi";

const KICH_THUOC_TRANG = 20;

type HanhDong = "huy" | "xoa";

/** Kỳ thi đang thi, nếu không có thì kỳ thi sắp diễn ra gần nhất. */
function useKyThiNoiBat(reloadKey: number) {
  const [kyThi, setKyThi] = useState<KyThiTomTat | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      kyThiApi.danhSach({ trangThai: "dang_thi", kichThuocTrang: 1 }, controller.signal),
      kyThiApi.danhSach({ trangThai: "da_phat_hanh", kichThuocTrang: 100 }, controller.signal),
    ])
      .then(([dangThi, sapToi]) => {
        const ganNhat = [...sapToi.duLieu].sort((a, b) => a.tgBatDau.localeCompare(b.tgBatDau))[0];
        setKyThi(dangThi.duLieu[0] ?? ganNhat ?? null);
      })
      .catch(() => { /* Khối nổi bật chỉ bổ trợ; lỗi đã hiện ở bảng. */ });
    return () => controller.abort();
  }, [reloadKey]);
  return kyThi;
}

function useDongHo() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function KhoiNoiBat({ kyThi }: { kyThi: KyThiTomTat }) {
  const now = useDongHo();
  const batDau = new Date(kyThi.tgBatDau).getTime();
  const ketThuc = batDau + kyThi.thoiLuong * 60_000;
  const dangThi = now >= batDau && now < ketThuc;
  const conLai = dangThi ? ketThuc - now : batDau - now;
  const { ngay } = dinhDangNgayGio(kyThi.tgBatDau);

  return (
    <section className="exam-overview">
      <div className="exam-overview-main">
        <span className="eyebrow">{dangThi ? "ĐANG DIỄN RA" : "SẮP DIỄN RA"}</span>
        <h3>{kyThi.tenKT}</h3>
        <p>{kyThi.monThi} · {ngay} · {khungGio(kyThi.tgBatDau, kyThi.thoiLuong)}{kyThi.maDeGocHienThi && ` · Đề ${kyThi.maDeGocHienThi}`}</p>
        <div className="live-stats">
          <div><strong>{kyThi.soThiSinh}</strong><span>Thí sinh</span></div>
          <div><strong>{kyThi.soDaNop}</strong><span>Đã nộp</span></div>
          <div><strong>{Math.max(0, kyThi.soThiSinh - kyThi.soDaNop)}</strong><span>Chưa nộp</span></div>
        </div>
      </div>
      <div className="live-clock">
        <span>{dangThi ? "CÒN LẠI" : "BẮT ĐẦU SAU"}</span>
        <strong>{demNguoc(conLai)}</strong>
        <Link className="exam-overview-link" to={`/admin/exam-assignments?maKT=${kyThi.maKT}`}>Gán đề và thí sinh <BieuTuong name="arrow-right" size={14} /></Link>
      </div>
    </section>
  );
}

export default function TrangKyThi() {
  const [data, setData] = useState<TrangDuLieu<KyThiTomTat> | null>(null);
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState<"" | TrangThaiKyThi>("");
  const [trang, setTrang] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<{ kyThi: KyThiChiTiet | null } | null>(null);
  const [dangMoSua, setDangMoSua] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ hanhDong: HanhDong; item: KyThiTomTat } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const noiBat = useKyThiNoiBat(reloadKey);

  useEffect(() => {
    const timer = window.setTimeout(() => { setTuKhoa(tuKhoaNhap.trim()); setTrang(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [tuKhoaNhap]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    kyThiApi.danhSach({ tuKhoa: tuKhoa || undefined, trangThai: trangThai || undefined, trang, kichThuocTrang: KICH_THUOC_TRANG }, controller.signal)
      .then((result) => {
        if (result.duLieu.length === 0 && trang > 1 && result.tongSoTrang > 0) setTrang(result.tongSoTrang);
        else setData(result);
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tuKhoa, trangThai, trang, reloadKey]);

  async function moSua(maKT: number) {
    setDangMoSua(maKT);
    try {
      setForm({ kyThi: await kyThiApi.chiTiet(maKT) });
    } catch (error) {
      setLoadError(thongBaoLoi(error));
    } finally {
      setDangMoSua(null);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    const { hanhDong, item } = confirm;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      if (hanhDong === "xoa") {
        await kyThiApi.xoa(item.maKT);
        setSuccess(`Đã xóa kỳ thi "${item.tenKT}".`);
      } else {
        await kyThiApi.huy(item.maKT);
        setSuccess(`Đã hủy kỳ thi "${item.tenKT}". Đề gốc được gỡ ra để dùng cho kỳ thi khác.`);
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
    <div className="page-stack exam-page">
      <section className="page-heading-row">
        <div>
          <h2>Quản lý kỳ thi</h2>
          <p>Gắn đề và thí sinh, rồi phát hành để thí sinh vào thi đúng giờ.</p>
        </div>
        <div className="heading-actions">
          <button className="button button-primary" onClick={() => setForm({ kyThi: null })} type="button"><BieuTuong name="plus" size={17} /> Tạo kỳ thi</button>
        </div>
      </section>

      {success && (
        <div className="success-banner" role="status">
          <span><BieuTuong name="check" size={17} /> {success}</span>
          <button aria-label="Đóng thông báo" onClick={() => setSuccess(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      {noiBat && <KhoiNoiBat kyThi={noiBat} />}

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-box"><BieuTuong name="search" size={18} /><input aria-label="Tìm kỳ thi" onChange={(event) => setTuKhoaNhap(event.target.value)} placeholder="Tìm theo tên kỳ thi hoặc môn thi" value={tuKhoaNhap} /></div>
          <select aria-label="Lọc trạng thái" onChange={(event) => { setTrangThai(event.target.value as typeof trangThai); setTrang(1); }} value={trangThai}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(nhanTrangThaiKyThi) as TrangThaiKyThi[]).map((tt) => <option key={tt} value={tt}>{nhanTrangThaiKyThi[tt]}</option>)}
          </select>
        </div>

        {loadError ? (
          <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được dữ liệu</strong><span>{loadError}</span><button className="button button-secondary" onClick={() => setReloadKey((value) => value + 1)} type="button">Thử lại</button></div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table exam-table">
                <thead><tr><th>KỲ THI</th><th>THỜI GIAN</th><th>ĐỀ GỐC</th><th>THÍ SINH</th><th>ĐÃ NỘP</th><th>TRẠNG THÁI</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                <tbody>
                  {items.map((item) => {
                    const { ngay } = dinhDangNgayGio(item.tgBatDau);
                    const daBatDau = item.trangThai === "dang_thi" || item.trangThai === "da_ket_thuc";
                    const phanTram = item.soThiSinh > 0 ? Math.round((item.soDaNop * 100) / item.soThiSinh) : 0;
                    return (
                      <tr key={item.maKT}>
                        <td><div className="exam-name-cell"><div><strong>{item.tenKT}</strong><small>{item.monThi}</small></div></div></td>
                        <td><div className="date-cell"><strong>{ngay}</strong><small>{khungGio(item.tgBatDau, item.thoiLuong)}</small></div></td>
                        <td>{item.maDeGocHienThi ?? <span className="muted-cell">Chưa gắn</span>}</td>
                        <td><span className="candidate-count"><BieuTuong name="users" size={16} /> {item.soThiSinh}</span></td>
                        <td>{daBatDau && item.soThiSinh > 0 ? <div className="progress-cell"><span><i style={{ width: `${phanTram}%` }} /></span><strong>{item.soDaNop}/{item.soThiSinh}</strong></div> : <span className="muted-cell">—</span>}</td>
                        <td><span className={`exam-status ${mauTrangThaiKyThi[item.trangThai]}`}>{nhanTrangThaiKyThi[item.trangThai]}</span></td>
                        <td>
                          <div className="row-actions">
                            <Link aria-label={`Gán đề và thí sinh cho ${item.tenKT}`} className="row-action" title="Gán đề và thí sinh" to={`/admin/exam-assignments?maKT=${item.maKT}`}><BieuTuong name="users" size={16} /></Link>
                            {item.trangThai === "nhap" && <button aria-label={`Sửa ${item.tenKT}`} className="row-action" disabled={dangMoSua === item.maKT} onClick={() => void moSua(item.maKT)} title="Sửa" type="button"><BieuTuong name="edit" size={16} /></button>}
                            {(item.trangThai === "da_phat_hanh" || item.trangThai === "dang_thi") && <button aria-label={`Hủy ${item.tenKT}`} className="row-action danger" onClick={() => { setConfirmError(null); setConfirm({ hanhDong: "huy", item }); }} title="Hủy kỳ thi" type="button"><BieuTuong name="lock" size={16} /></button>}
                            {item.trangThai === "nhap" && <button aria-label={`Xóa ${item.tenKT}`} className="row-action danger" onClick={() => { setConfirmError(null); setConfirm({ hanhDong: "xoa", item }); }} title="Xóa" type="button"><BieuTuong name="x" size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && items.length === 0 && <div className="empty-state"><BieuTuong name="calendar" size={28} /><strong>Chưa có kỳ thi phù hợp</strong><span>Tạo kỳ thi mới hoặc đổi bộ lọc.</span></div>}
            <div className="table-footer">
              <span><strong>{data?.tongSoDong ?? 0}</strong> kỳ thi</span>
              <div className="pagination">
                <button aria-label="Trang trước" disabled={loading || trang <= 1} onClick={() => setTrang((value) => value - 1)} type="button"><BieuTuong name="chevron-left" size={15} /></button>
                <span>Trang {data && data.tongSoTrang > 0 ? data.trang : 0} / {data?.tongSoTrang ?? 0}</span>
                <button aria-label="Trang sau" disabled={loading || !data || trang >= data.tongSoTrang} onClick={() => setTrang((value) => value + 1)} type="button"><BieuTuong name="chevron-right" size={15} /></button>
              </div>
            </div>
          </>
        )}
      </section>

      {form && (
        <HopThoaiKyThi
          kyThi={form.kyThi}
          onDaLuu={(luu) => {
            setForm(null);
            setSuccess(form.kyThi ? `Đã lưu kỳ thi "${luu.tenKT}".` : `Đã tạo kỳ thi "${luu.tenKT}". Tiếp theo: gắn đề và phân công thí sinh.`);
            setReloadKey((value) => value + 1);
          }}
          onDong={() => setForm(null)}
        />
      )}

      {confirm && (
        <HopThoaiXacNhan
          busy={confirmBusy}
          confirmLabel={confirm.hanhDong === "xoa" ? "Xóa kỳ thi" : "Hủy kỳ thi"}
          danger
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
          title={confirm.hanhDong === "xoa" ? "Xóa kỳ thi nháp?" : "Hủy kỳ thi?"}
        >
          {confirm.hanhDong === "xoa"
            ? <p>Xóa vĩnh viễn <strong>{confirm.item.tenKT}</strong> cùng danh sách phân công. Thao tác này không hoàn tác được.</p>
            : <p>Kỳ thi <strong>{confirm.item.tenKT}</strong> sẽ bị hủy, danh sách phân công bị xóa và đề gốc được gỡ ra để dùng lại. Chỉ hủy được khi chưa thí sinh nào vào làm bài.</p>}
        </HopThoaiXacNhan>
      )}
    </div>
  );
}
