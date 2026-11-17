import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { HopThoaiXacNhan } from "../../components/HopThoaiXacNhan";
import type { DeGocTomTat, KiemTraPhatHanh, KyThiChiTiet, KyThiTomTat, ThiSinhKyThi } from "../../types/api";
import { deThiApi } from "../de-thi/api";
import { laHuy, thongBaoLoi } from "../ma-tran-de/hienThiMaTran";
import { kyThiApi } from "./api";
import { HopThoaiChonThiSinh } from "./HopThoaiChonThiSinh";
import {
  conPhanCongDuoc,
  dinhDangNgayGio,
  khungGio,
  lopTrangThaiThiSinh,
  mauTrangThaiKyThi,
  nhanCachPhanDe,
  nhanTrangThaiKyThi,
  nhanTrangThaiThiSinh,
} from "./hienThiKyThi";

/** Ô số máy sửa tại chỗ: lưu khi rời ô hoặc nhấn Enter. */
function OSoMay({ giaTri, khoa, onLuu }: { giaTri: string | null; khoa: boolean; onLuu: (soMay: string | null) => Promise<void> }) {
  const [nhap, setNhap] = useState(giaTri ?? "");
  const [trangThai, setTrangThai] = useState<"" | "dang_luu" | "loi">("");

  async function luu() {
    const moi = nhap.trim().toUpperCase();
    if (moi === (giaTri ?? "")) return;
    if (moi && !/^[A-Z0-9._-]{1,10}$/.test(moi)) { setTrangThai("loi"); return; }
    setTrangThai("dang_luu");
    try {
      await onLuu(moi || null);
      setNhap(moi);
      setTrangThai("");
    } catch {
      setTrangThai("loi");
    }
  }

  if (khoa) return <span>{giaTri ?? <span className="muted-cell">—</span>}</span>;
  return (
    <input
      aria-invalid={trangThai === "loi"}
      aria-label="Số máy"
      className={`seat-input${trangThai === "loi" ? " seat-input-error" : ""}`}
      disabled={trangThai === "dang_luu"}
      maxLength={10}
      onBlur={() => void luu()}
      onChange={(event) => { setNhap(event.target.value); setTrangThai(""); }}
      onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}
      placeholder="—"
      title={trangThai === "loi" ? "Số máy chỉ gồm chữ không dấu, số và . _ - (tối đa 10 ký tự)" : undefined}
      value={nhap}
    />
  );
}

export default function TrangGanDeThiSinh() {
  const [params, setParams] = useSearchParams();
  const maKT = Number(params.get("maKT")) || null;

  const [dsKyThi, setDsKyThi] = useState<KyThiTomTat[]>([]);
  const [chiTiet, setChiTiet] = useState<KyThiChiTiet | null>(null);
  const [dsThiSinh, setDsThiSinh] = useState<ThiSinhKyThi[]>([]);
  const [kiemTra, setKiemTra] = useState<KiemTraPhatHanh | null>(null);
  const [dsDe, setDsDe] = useState<DeGocTomTat[]>([]);
  const [deChon, setDeChon] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [thongBao, setThongBao] = useState<{ loai: "ok" | "loi"; noiDung: string } | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [moChonThiSinh, setMoChonThiSinh] = useState(false);
  const [xacNhan, setXacNhan] = useState<{ loai: "phat_hanh" } | { loai: "go"; thiSinh: ThiSinhKyThi } | null>(null);
  const [loiXacNhan, setLoiXacNhan] = useState<string | null>(null);
  const [locNhap, setLocNhap] = useState("");

  const taiLai = useCallback(() => setReloadKey((x) => x + 1), []);

  // Danh sách kỳ thi để chọn.
  useEffect(() => {
    const controller = new AbortController();
    kyThiApi.danhSach({ kichThuocTrang: 100 }, controller.signal)
      .then((data) => setDsKyThi(data.duLieu))
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); });
    return () => controller.abort();
  }, [reloadKey]);

  // Đổi kỳ thi thì bỏ dữ liệu kỳ thi cũ ngay, tránh hiện nhầm trong lúc tải.
  useEffect(() => { setChiTiet(null); setDsThiSinh([]); setKiemTra(null); setLocNhap(""); setDeChon(""); }, [maKT]);

  // Chi tiết kỳ thi đang chọn.
  useEffect(() => {
    if (!maKT) { setChiTiet(null); setDsThiSinh([]); setKiemTra(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    Promise.all([
      kyThiApi.chiTiet(maKT, controller.signal),
      kyThiApi.thiSinh(maKT, controller.signal),
      kyThiApi.kiemTraPhatHanh(maKT, controller.signal),
      deThiApi.danhSach({ chuaGanKyThi: true, kichThuocTrang: 100 }, controller.signal),
    ])
      .then(([ct, ts, kt, de]) => { setChiTiet(ct); setDsThiSinh(ts); setKiemTra(kt); setDsDe(de.duLieu); })
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [maKT, reloadKey]);

  const kyThiChonDuoc = useMemo(
    () => dsKyThi.filter((kt) => conPhanCongDuoc(kt.trangThai) || kt.maKT === maKT),
    [dsKyThi, maKT],
  );
  const daCo = useMemo(() => new Set(dsThiSinh.map((ts) => ts.msts)), [dsThiSinh]);
  const phanBoDe = useMemo(() => {
    const dem = new Map<string, number>();
    for (const ts of dsThiSinh) dem.set(ts.tenDeCon, (dem.get(ts.tenDeCon) ?? 0) + 1);
    return [...dem.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [dsThiSinh]);
  const locTu = locNhap.trim().toLowerCase();
  const thiSinhHienThi = locTu
    ? dsThiSinh.filter((ts) => `${ts.msts} ${ts.hoTen} ${ts.lop ?? ""} ${ts.soMay ?? ""}`.toLowerCase().includes(locTu))
    : dsThiSinh;

  const laNhap = chiTiet?.trangThai === "nhap";
  const suaPhanCong = chiTiet ? conPhanCongDuoc(chiTiet.trangThai) : false;
  const doiDeDuoc = laNhap && dsThiSinh.length === 0;

  async function chay(viec: () => Promise<string>) {
    setDangXuLy(true);
    setThongBao(null);
    try {
      setThongBao({ loai: "ok", noiDung: await viec() });
      taiLai();
    } catch (error) {
      setThongBao({ loai: "loi", noiDung: thongBaoLoi(error) });
    } finally {
      setDangXuLy(false);
    }
  }

  async function xacNhanHanhDong() {
    if (!xacNhan || !chiTiet) return;
    setDangXuLy(true);
    setLoiXacNhan(null);
    try {
      if (xacNhan.loai === "phat_hanh") {
        await kyThiApi.phatHanh(chiTiet.maKT);
        setThongBao({ loai: "ok", noiDung: `Đã phát hành "${chiTiet.tenKT}". Thí sinh được phân công sẽ thấy kỳ thi trong cổng thí sinh.` });
      } else {
        await kyThiApi.boPhanCong(chiTiet.maKT, xacNhan.thiSinh.msts);
        setThongBao({ loai: "ok", noiDung: `Đã gỡ ${xacNhan.thiSinh.hoTen} (${xacNhan.thiSinh.msts}) khỏi kỳ thi.` });
      }
      setXacNhan(null);
      taiLai();
    } catch (error) {
      setLoiXacNhan(thongBaoLoi(error));
    } finally {
      setDangXuLy(false);
    }
  }

  const gioThi = chiTiet ? dinhDangNgayGio(chiTiet.tgBatDau) : null;
  // Theo kết quả kiểm tra của máy chủ, không theo đồng hồ máy người dùng.
  const gioConHan = !(kiemTra?.conThieu.some((x) => x.startsWith("Giờ bắt đầu")) ?? false);

  return (
    <div className="page-stack assign-page">
      <section className="page-heading-row">
        <div>
          <h2>Gán đề và thí sinh</h2>
          <p>Gắn đề gốc, phân công thí sinh và số máy, rồi phát hành.</p>
        </div>
        <div className="heading-actions">
          <select aria-label="Chọn kỳ thi" className="assign-exam-select" onChange={(event) => { setThongBao(null); setParams(event.target.value ? { maKT: event.target.value } : {}); }} value={maKT ?? ""}>
            <option value="">Chọn kỳ thi…</option>
            {kyThiChonDuoc.map((kt) => <option key={kt.maKT} value={kt.maKT}>{kt.tenKT} — {nhanTrangThaiKyThi[kt.trangThai]}</option>)}
          </select>
        </div>
      </section>

      {thongBao && (
        <div className={thongBao.loai === "ok" ? "success-banner" : "form-alert"} role={thongBao.loai === "ok" ? "status" : "alert"}>
          <span><BieuTuong name={thongBao.loai === "ok" ? "check" : "alert"} size={17} /> {thongBao.noiDung}</span>
          <button aria-label="Đóng thông báo" onClick={() => setThongBao(null)} type="button"><BieuTuong name="x" size={16} /></button>
        </div>
      )}

      {!maKT ? (
        <section className="panel">
          <div className="empty-state">
            <BieuTuong name="calendar" size={28} />
            <strong>Chọn một kỳ thi để bắt đầu</strong>
            <span>{kyThiChonDuoc.length ? "Dùng ô chọn kỳ thi ở góc trên bên phải." : "Chưa có kỳ thi nào còn phân công được."}</span>
            <Link className="button button-secondary" to="/admin/exams">Tới quản lý kỳ thi</Link>
          </div>
        </section>
      ) : loadError ? (
        <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được kỳ thi</strong><span>{loadError}</span><button className="button button-secondary" onClick={taiLai} type="button">Thử lại</button></div>
      ) : !chiTiet || (loading && !chiTiet) ? (
        <div className="outcomes-loading" aria-label="Đang tải kỳ thi">{[1, 2, 3].map((x) => <span key={x} />)}</div>
      ) : (
        <>
          <section className="panel assign-summary">
            <div className="assign-summary-main">
              <span className={`exam-status ${mauTrangThaiKyThi[chiTiet.trangThai]}`}>{nhanTrangThaiKyThi[chiTiet.trangThai]}</span>
              <h3>{chiTiet.tenKT}</h3>
              <p>{chiTiet.monThi}</p>
            </div>
            <dl className="assign-facts">
              <div><dt>Ngày thi</dt><dd>{gioThi?.ngay}</dd></div>
              <div><dt>Giờ thi</dt><dd>{khungGio(chiTiet.tgBatDau, chiTiet.thoiLuong)}</dd></div>
              <div><dt>Thời lượng</dt><dd>{chiTiet.thoiLuong} phút</dd></div>
              <div><dt>Vào trễ tối đa</dt><dd>{chiTiet.soPhutChoVaoTre} phút</dd></div>
              <div><dt>Phân đề</dt><dd>{nhanCachPhanDe[chiTiet.cachPhanDe]}</dd></div>
            </dl>
          </section>

          <div className="assign-grid">
            <section className="panel assign-step">
              <header className="paper-panel-head"><h3>1. Đề gốc</h3><p>Mỗi đề gốc chỉ dùng cho một kỳ thi. Thí sinh nhận các đề con của đề này.</p></header>
              {chiTiet.deGoc ? (
                <div className="assign-paper">
                  <div className="assign-paper-code"><BieuTuong name="file" size={20} /><strong>{chiTiet.deGoc.maDeGocHienThi}</strong></div>
                  <div className="assign-paper-info">
                    <span>{chiTiet.deGoc.tenMT}</span>
                    <small>{chiTiet.deGoc.tongSoCau} câu · {chiTiet.deGoc.soDeCon} đề con</small>
                  </div>
                  <div className="assign-paper-actions">
                    <Link className="button button-secondary" to={`/admin/exam-papers/${chiTiet.deGoc.maDe}`}><BieuTuong name="eye" size={16} /> Xem đề</Link>
                    {laNhap && <button className="button button-secondary" disabled={!doiDeDuoc || dangXuLy} onClick={() => void chay(async () => { await kyThiApi.ganDeGoc(chiTiet.maKT, null); return "Đã gỡ đề gốc khỏi kỳ thi."; })} title={doiDeDuoc ? undefined : "Gỡ hết thí sinh trước khi đổi đề"} type="button">Gỡ đề</button>}
                  </div>
                  {laNhap && !doiDeDuoc && <small className="field-help">Đã phân công thí sinh nên không đổi đề được. Gỡ hết thí sinh nếu cần đổi.</small>}
                </div>
              ) : laNhap ? (
                <div className="assign-pick-paper">
                  <select aria-label="Chọn đề gốc" onChange={(event) => setDeChon(event.target.value)} value={deChon}>
                    <option value="">{dsDe.length ? "Chọn đề gốc chưa dùng" : "Không còn đề gốc chưa dùng"}</option>
                    {dsDe.map((de) => <option key={de.maDe} value={de.maDe}>{de.maDeGocHienThi} — {de.tenMT} ({de.tongSoCau} câu, {de.soDeCon} đề con)</option>)}
                  </select>
                  <button className="button button-primary" disabled={!deChon || dangXuLy} onClick={() => void chay(async () => { await kyThiApi.ganDeGoc(chiTiet.maKT, Number(deChon)); setDeChon(""); return "Đã gắn đề gốc cho kỳ thi."; })} type="button"><BieuTuong name="check" size={16} /> Gắn đề</button>
                  {dsDe.length === 0 && <Link className="field-help" to="/admin/exam-generation">Sinh đề mới →</Link>}
                </div>
              ) : (
                <p className="matrix-muted">Kỳ thi không có đề gốc.</p>
              )}
            </section>

            <section className="panel assign-step">
              <header className="paper-panel-head"><h3>3. Phát hành</h3><p>Sau khi phát hành không đổi được đề, giờ thi và thời lượng.</p></header>
              {laNhap && kiemTra ? (
                <>
                  <ul className="assign-checklist">
                    <li className={chiTiet.deGoc ? "is-done" : undefined}><BieuTuong name={chiTiet.deGoc ? "check" : "x"} size={15} /> Đã gắn đề gốc</li>
                    <li className={dsThiSinh.length > 0 ? "is-done" : undefined}><BieuTuong name={dsThiSinh.length > 0 ? "check" : "x"} size={15} /> Đã phân công thí sinh ({dsThiSinh.length})</li>
                    <li className={gioConHan ? "is-done" : undefined}><BieuTuong name={gioConHan ? "check" : "x"} size={15} /> Giờ bắt đầu chưa qua</li>
                  </ul>
                  <button aria-busy={dangXuLy} className="button button-primary assign-publish" disabled={!kiemTra.phatHanhDuoc || dangXuLy} onClick={() => { setLoiXacNhan(null); setXacNhan({ loai: "phat_hanh" }); }} type="button"><BieuTuong name="sparkles" size={16} /> Phát hành kỳ thi</button>
                </>
              ) : (
                <div className="assign-published">
                  <BieuTuong name={chiTiet.trangThai === "da_huy" ? "lock" : "check"} size={20} />
                  <div>
                    <strong>{chiTiet.trangThai === "da_huy" ? "Kỳ thi đã hủy" : "Đã phát hành"}</strong>
                    {chiTiet.ngayPhatHanh && <small>{new Date(chiTiet.ngayPhatHanh).toLocaleString("vi-VN")}</small>}
                    {suaPhanCong && <small>Vẫn thêm/gỡ được thí sinh chưa vào làm bài.</small>}
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className="panel table-panel">
            <div className="panel-heading assign-students-head">
              <div><h3>2. Thí sinh ({dsThiSinh.length})</h3><p>{phanBoDe.length ? `Phân bổ đề con: ${phanBoDe.map(([de, so]) => `${de}: ${so}`).join(" · ")}` : "Chưa có thí sinh nào."}</p></div>
              <div className="heading-actions">
                <div className="search-box small"><BieuTuong name="search" size={17} /><input aria-label="Lọc thí sinh" onChange={(event) => setLocNhap(event.target.value)} placeholder="Lọc mã số, tên, lớp, số máy" value={locNhap} /></div>
                <button className="button button-primary" disabled={!suaPhanCong || !chiTiet.deGoc} onClick={() => setMoChonThiSinh(true)} title={!chiTiet.deGoc ? "Gắn đề gốc trước" : undefined} type="button"><BieuTuong name="plus" size={16} /> Thêm thí sinh</button>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>MÃ SỐ</th><th>HỌ TÊN</th><th>LỚP</th><th>SỐ MÁY</th><th>ĐỀ CON</th><th>TRẠNG THÁI</th><th><span className="sr-only">THAO TÁC</span></th></tr></thead>
                <tbody>
                  {thiSinhHienThi.map((ts) => (
                    <tr key={ts.msts}>
                      <td><strong>{ts.msts}</strong></td>
                      <td>{ts.hoTen}</td>
                      <td>{ts.lop ?? <span className="muted-cell">—</span>}</td>
                      <td><OSoMay giaTri={ts.soMay} khoa={!suaPhanCong} onLuu={async (soMay) => { await kyThiApi.doiSoMay(chiTiet.maKT, ts.msts, soMay); }} /></td>
                      <td><span className="tag">{ts.tenDeCon}</span></td>
                      <td><span className={`status-dot ${lopTrangThaiThiSinh[ts.trangThai]}`}>{nhanTrangThaiThiSinh[ts.trangThai]}</span></td>
                      <td>
                        {suaPhanCong && ts.trangThai === "chua_thi" && (
                          <div className="row-actions"><button aria-label={`Gỡ ${ts.hoTen}`} className="row-action danger" onClick={() => { setLoiXacNhan(null); setXacNhan({ loai: "go", thiSinh: ts }); }} title="Gỡ khỏi kỳ thi" type="button"><BieuTuong name="x" size={16} /></button></div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dsThiSinh.length === 0 && (
              <div className="empty-state"><BieuTuong name="users" size={28} /><strong>Chưa phân công thí sinh</strong><span>{chiTiet.deGoc ? "Bấm “Thêm thí sinh” để chọn theo lớp hoặc từng người." : "Gắn đề gốc ở bước 1 trước khi thêm thí sinh."}</span></div>
            )}
            {dsThiSinh.length > 0 && thiSinhHienThi.length === 0 && <div className="empty-state"><BieuTuong name="search" size={28} /><strong>Không có thí sinh khớp bộ lọc</strong></div>}
          </section>
        </>
      )}

      {moChonThiSinh && chiTiet && (
        <HopThoaiChonThiSinh
          daCo={daCo}
          maKT={chiTiet.maKT}
          onDaThem={(kq) => {
            setMoChonThiSinh(false);
            setThongBao({ loai: "ok", noiDung: `Đã thêm ${kq.soThem} thí sinh.${kq.boQua.length ? ` Bỏ qua: ${kq.boQua.join("; ")}.` : ""}` });
            taiLai();
          }}
          onDong={() => setMoChonThiSinh(false)}
        />
      )}

      {xacNhan && chiTiet && (
        <HopThoaiXacNhan
          busy={dangXuLy}
          confirmLabel={xacNhan.loai === "phat_hanh" ? "Phát hành" : "Gỡ thí sinh"}
          danger={xacNhan.loai === "go"}
          error={loiXacNhan}
          onCancel={() => setXacNhan(null)}
          onConfirm={xacNhanHanhDong}
          title={xacNhan.loai === "phat_hanh" ? "Phát hành kỳ thi?" : "Gỡ thí sinh khỏi kỳ thi?"}
        >
          {xacNhan.loai === "phat_hanh"
            ? <p><strong>{chiTiet.tenKT}</strong> với {dsThiSinh.length} thí sinh, bắt đầu {gioThi?.gio} ngày {gioThi?.ngay}. Sau khi phát hành không đổi được đề, giờ thi và thời lượng.</p>
            : <p>Gỡ <strong>{xacNhan.thiSinh.hoTen}</strong> ({xacNhan.thiSinh.msts}) khỏi kỳ thi. Thí sinh sẽ không thấy kỳ thi này nữa.</p>}
        </HopThoaiXacNhan>
      )}
    </div>
  );
}
