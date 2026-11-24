import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LoiApiHttp } from "../../services/khachHttp";
import type { DongCauTruc, KqhtDto, MaMucDo, MaTranChiTiet } from "../../types/api";
import { kqhtApi } from "../ket-qua-hoc-tap/api";
import { maTranApi } from "./api";
import { HopThoaiThongTinMaTran } from "./HopThoaiThongTinMaTran";
import { laHuy, lopTrangThaiMaTran, nhanTrangThaiMaTran, TEN_MUC_DO, thongBaoLoi } from "./hienThiMaTran";
import { quyRaSoCau, tyLeHopLe, type BaMuc } from "./lamTron";

const TY_LE_MAC_DINH: BaMuc = [30, 50, 20];
const MAU_TY_LE: BaMuc[] = [[30, 50, 20], [40, 40, 20], [20, 50, 30], [40, 30, 30]];
const SO_CAU_MAC_DINH = 10;
const MUC_DO: MaMucDo[] = [1, 2, 3];

type DongKqht = {
  maKQHT: number;
  kyHieu: string;
  tenKQHT: string;
  dangSuDung: boolean;
  soCau: number;
  /** true: dùng tỷ lệ riêng của dòng; false: theo tỷ lệ chung của ma trận. */
  rieng: boolean;
  tyLe: BaMuc;
  /** Số câu từng mức, luôn quy ra từ `soCau` và `tyLe` (trừ dữ liệu cũ nhập tay khi chưa sửa dòng). */
  soCauMuc: BaMuc;
};

type LoiTruong = { tenMT?: string; thoiGianLam?: string; cauTruc?: string };

function soNguyen(giaTri: string) {
  const so = Number(giaTri);
  return Number.isFinite(so) ? Math.max(0, Math.trunc(so)) : 0;
}

function soThuc(giaTri: string) {
  const so = Number(giaTri);
  // TYLE lưu decimal(5,2): giữ tối đa 2 chữ số thập phân để tổng lưu xuống vẫn đúng 100.
  return Number.isFinite(so) ? Math.round(Math.min(100, Math.max(0, so)) * 100) / 100 : 0;
}

const khoaTyLe = (tyLe: BaMuc) => tyLe.join("/");
const cungTyLe = (a: BaMuc, b: BaMuc) => khoaTyLe(a) === khoaTyLe(b);
const tongBa = (ba: BaMuc) => ba.reduce((a, b) => a + b, 0);

/** Dựng lại các dòng và tỷ lệ chung (tỷ lệ gặp nhiều nhất) từ ma trận đã lưu. */
function tuChiTiet(chiTiet: MaTranChiTiet): { tyLeChung: BaMuc; dong: DongKqht[] } {
  const tho = chiTiet.kqht.map((kq) => {
    const theoMuc = (maMD: MaMucDo) => kq.mucDo.find((o) => o.maMD === maMD);
    const soCauMuc = MUC_DO.map((m) => theoMuc(m)?.soCau ?? 0) as BaMuc;
    const coTyLe = MUC_DO.every((m) => theoMuc(m)?.tyLe != null);
    const tyLe = coTyLe
      ? (MUC_DO.map((m) => theoMuc(m)!.tyLe!) as BaMuc)
      : (soCauMuc.map((s) => (kq.soCau > 0 ? Math.round((s * 10000) / kq.soCau) / 100 : 0)) as BaMuc);
    return { maKQHT: kq.maKQHT, kyHieu: kq.kyHieu, tenKQHT: kq.tenKQHT, dangSuDung: kq.dangSuDung, soCau: kq.soCau, tyLe, soCauMuc };
  });
  const dem = new Map<string, { tyLe: BaMuc; so: number }>();
  for (const d of tho) {
    if (!tyLeHopLe(d.tyLe)) continue;
    const muc = dem.get(khoaTyLe(d.tyLe)) ?? { tyLe: d.tyLe, so: 0 };
    dem.set(khoaTyLe(d.tyLe), { ...muc, so: muc.so + 1 });
  }
  const tyLeChung = [...dem.values()].sort((a, b) => b.so - a.so)[0]?.tyLe ?? TY_LE_MAC_DINH;
  return { tyLeChung, dong: tho.map((d) => ({ ...d, rieng: !cungTyLe(d.tyLe, tyLeChung) })) };
}

export default function TrangSoanMaTran() {
  const { maMT: maMTParam } = useParams();
  const maMT = maMTParam ? Number(maMTParam) : null;
  const navigate = useNavigate();
  /** Tên và thời gian nhập ở hộp thoại "Tạo ma trận" của trang danh sách. */
  const banDau = (useLocation().state ?? null) as { tenMT?: string; thoiGianLam?: number } | null;

  const [chiTiet, setChiTiet] = useState<MaTranChiTiet | null>(null);
  const [tenMT, setTenMT] = useState(maMT ? "" : banDau?.tenMT ?? "");
  const [thoiGianLam, setThoiGianLam] = useState(maMT ? 45 : banDau?.thoiGianLam ?? 45);
  const [tyLeChung, setTyLeChung] = useState<BaMuc>(TY_LE_MAC_DINH);
  const [dong, setDong] = useState<DongKqht[]>([]);
  const [dsKqht, setDsKqht] = useState<KqhtDto[]>([]);
  const [coSan, setCoSan] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loiTruong, setLoiTruong] = useState<LoiTruong>({});
  // Vào thẳng trang tạo mà chưa có tên (không qua hộp thoại ở danh sách) thì mở hộp thoại ngay.
  const [suaThongTin, setSuaThongTin] = useState(!maMT && !banDau?.tenMT);

  function apDungChiTiet(ct: MaTranChiTiet) {
    const { tyLeChung: chung, dong: ds } = tuChiTiet(ct);
    setChiTiet(ct);
    setTyLeChung(chung);
    setDong(ds);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    Promise.all([
      kqhtApi.danhSach(controller.signal),
      maTranApi.doPhu(controller.signal),
      maMT ? maTranApi.chiTiet(maMT, controller.signal) : Promise.resolve(null),
    ])
      .then(([kqht, doPhu, ct]) => {
        setDsKqht([...kqht].sort((a, b) => a.thuTu - b.thuTu));
        setCoSan(new Map(doPhu.map((o) => [`${o.maKQHT}-${o.maMD}`, o.coSan])));
        if (ct) {
          setTenMT(ct.tenMT);
          setThoiGianLam(ct.thoiGianLam);
          const { tyLeChung: chung, dong: ds } = tuChiTiet(ct);
          setChiTiet(ct);
          setTyLeChung(chung);
          setDong(ds);
        }
      })
      .catch((error: unknown) => { if (!laHuy(error)) setLoadError(thongBaoLoi(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [maMT]);

  const chiXem = chiTiet !== null && (chiTiet.trangThai !== "dang_soan" || chiTiet.daSinhDe);
  const kqhtConLai = dsKqht.filter((kq) => kq.trangThai === "dang_su_dung" && !dong.some((d) => d.maKQHT === kq.maKQHT));
  const tongSoCau = dong.reduce((tong, d) => tong + tongBa(d.soCauMuc), 0);
  const layCoSan = (maKQHT: number, maMD: MaMucDo) => coSan.get(`${maKQHT}-${maMD}`) ?? 0;
  const soOThieu = dong.reduce((dem, d) => dem + MUC_DO.filter((m, i) => d.soCauMuc[i] > layCoSan(d.maKQHT, m)).length, 0);

  /** Lý do chưa lưu được; rỗng thì nút Lưu bật. */
  const lyDoChuaLuu = useMemo(() => {
    const ds: string[] = [];
    if (!tenMT.trim()) ds.push("Nhập tên ma trận.");
    if (thoiGianLam < 1 || thoiGianLam > 600) ds.push("Thời gian làm bài phải từ 1 đến 600 phút.");
    if (dong.length === 0) ds.push("Chọn ít nhất một KQHT.");
    if (dong.some((d) => !d.rieng) && !tyLeHopLe(tyLeChung)) ds.push("Tổng tỷ lệ chung phải bằng 100%.");
    for (const d of dong) {
      if (d.soCau <= 0) ds.push(`KQHT ${d.kyHieu}: nhập số câu lớn hơn 0.`);
      if (d.rieng && !tyLeHopLe(d.tyLe)) ds.push(`KQHT ${d.kyHieu}: tổng tỷ lệ riêng phải bằng 100%.`);
      else if (d.soCau > 0 && tongBa(d.soCauMuc) !== d.soCau) ds.push(`KQHT ${d.kyHieu}: số câu các mức không khớp, hãy nhập lại số câu.`);
      if (!d.dangSuDung) ds.push(`KQHT ${d.kyHieu} đã ngừng sử dụng, hãy bỏ khỏi ma trận.`);
    }
    if (tongSoCau > 500) ds.push("Tổng số câu không được vượt quá 500.");
    return ds;
  }, [tenMT, thoiGianLam, dong, tyLeChung, tongSoCau]);

  function capNhatDong(maKQHT: number, thayDoi: (d: DongKqht) => DongKqht) {
    setDong((hienTai) => hienTai.map((d) => (d.maKQHT === maKQHT ? thayDoi(d) : d)));
    setLoiTruong((hienTai) => ({ ...hienTai, cauTruc: undefined }));
  }

  function doiTyLeChung(tyLe: BaMuc) {
    setTyLeChung(tyLe);
    setDong((hienTai) => hienTai.map((d) => (d.rieng ? d : { ...d, tyLe, soCauMuc: quyRaSoCau(d.soCau, tyLe) })));
  }

  function themKqht(ds: KqhtDto[]) {
    if (ds.length === 0) return;
    setDong((hienTai) => [
      ...hienTai,
      ...ds.map((kq) => ({
        maKQHT: kq.maKQHT, kyHieu: kq.kyHieu, tenKQHT: kq.tenKQHT, dangSuDung: true, soCau: SO_CAU_MAC_DINH,
        rieng: false, tyLe: tyLeChung, soCauMuc: quyRaSoCau(SO_CAU_MAC_DINH, tyLeChung),
      })),
    ].sort((a, b) => a.kyHieu.localeCompare(b.kyHieu)));
    setLoiTruong((hienTai) => ({ ...hienTai, cauTruc: undefined }));
  }

  function batTatTyLeRieng(d: DongKqht) {
    capNhatDong(d.maKQHT, (x) => (x.rieng
      ? { ...x, rieng: false, tyLe: tyLeChung, soCauMuc: quyRaSoCau(x.soCau, tyLeChung) }
      : { ...x, rieng: true }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (lyDoChuaLuu.length > 0 || chiXem) return;
    const cauTruc: DongCauTruc[] = dong.flatMap((d) =>
      MUC_DO.map((maMD, i) => ({ maKQHT: d.maKQHT, maMD, soCau: d.soCauMuc[i], tyLe: d.tyLe[i] })));
    const body = { tenMT: tenMT.trim(), thoiGianLam, cauTruc };
    setSubmitting(true);
    setSubmitError(null);
    setLoiTruong({});
    try {
      const luu = chiTiet ? await maTranApi.sua(chiTiet.maMT, { ...body, phienBan: chiTiet.phienBan }) : await maTranApi.tao(body);
      navigate(`/admin/exam-matrices/${luu.maMT}`, { replace: true });
      apDungChiTiet(luu);
      setSubmitError(null);
    } catch (error) {
      if (error instanceof LoiApiHttp && error.code === "CONCURRENCY_CONFLICT") {
        setSubmitError("Ma trận vừa được sửa ở nơi khác. Tải lại trang để xem bản mới nhất.");
      } else if (error instanceof LoiApiHttp && (error.errors.tenMT || error.errors.thoiGianLam || error.errors.cauTruc)) {
        setLoiTruong({
          tenMT: error.errors.tenMT?.join(" "),
          thoiGianLam: error.errors.thoiGianLam?.join(" "),
          cauTruc: error.errors.cauTruc?.join(" "),
        });
      } else if (error instanceof LoiApiHttp && Object.keys(error.errors).length > 0) {
        setSubmitError(Object.values(error.errors).flat().join(" "));
      } else {
        setSubmitError(thongBaoLoi(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function dongHopThoai() {
    setSuaThongTin(false);
    if (!tenMT) navigate("/admin/exam-matrices");
  }

  if (loading) {
    return <div className="page-stack"><div className="outcomes-loading" aria-label="Đang tải ma trận">{[1, 2, 3].map((x) => <span key={x} />)}</div></div>;
  }

  if (loadError) {
    return (
      <div className="page-stack">
        <div className="empty-state error-state"><BieuTuong name="alert" size={28} /><strong>Chưa tải được ma trận</strong><span>{loadError}</span><Link className="button button-secondary" to="/admin/exam-matrices">Về danh sách</Link></div>
      </div>
    );
  }

  const loiThongTin = [loiTruong.tenMT, loiTruong.thoiGianLam].filter(Boolean).join(" ");
  const tongTyLeChung = Math.round(tongBa(tyLeChung) * 100) / 100;

  return (
    <>
    <form className="page-stack matrix-editor" noValidate onSubmit={handleSubmit}>
      <section className="page-heading-row">
        <div>
          <Link className="back-link" to="/admin/exam-matrices"><BieuTuong name="arrow-left" size={15} /> Danh sách ma trận</Link>
          <h2>{tenMT || "Tạo ma trận đề"}</h2>
          <p>
            {chiTiet ? <span className={`status-dot ${lopTrangThaiMaTran[chiTiet.trangThai]}`}>{nhanTrangThaiMaTran[chiTiet.trangThai]}</span> : <span className="status-dot">Chưa lưu</span>}
            {chiTiet?.daSinhDe && " · Đã sinh đề"}
            {` · ${thoiGianLam} phút`}
          </p>
        </div>
        {!chiXem && (
          <div className="heading-actions">
            <button className="button button-secondary" onClick={() => setSuaThongTin(true)} type="button"><BieuTuong name="edit" size={16} /> Sửa thông tin</button>
          </div>
        )}
      </section>

      {chiXem && (
        <div className="form-alert" role="status"><BieuTuong name="lock" size={16} /><span>{chiTiet?.daSinhDe ? "Ma trận đã sinh đề nên chỉ xem được." : "Ma trận không ở trạng thái đang soạn. Chuyển về đang soạn ở danh sách để sửa."}</span></div>
      )}
      {submitError && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{submitError}</span></div>}
      {loiThongTin && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiThongTin}</span></div>}

      {!chiXem && (
        <div className="matrix-setup">
          <section className="panel matrix-step">
            <header>
              <h3>1. Chọn KQHT</h3>
              {kqhtConLai.length > 1 && <button className="button button-secondary" onClick={() => themKqht(kqhtConLai)} type="button"><BieuTuong name="plus" size={16} /> Thêm tất cả ({kqhtConLai.length})</button>}
            </header>
            {kqhtConLai.length > 0 ? (
              <div className="matrix-chips">
                {kqhtConLai.map((kq) => (
                  <button className="matrix-chip" key={kq.maKQHT} onClick={() => themKqht([kq])} title={kq.tenKQHT} type="button">
                    <BieuTuong name="plus" size={14} /><strong>{kq.kyHieu}</strong><span>{kq.tenKQHT}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="matrix-muted">{dsKqht.some((kq) => kq.trangThai === "dang_su_dung") ? "Đã thêm hết KQHT đang sử dụng." : "Chưa có KQHT đang sử dụng. Hãy tạo KQHT trước."}</p>
            )}
          </section>

          <section className="panel matrix-step">
            <header>
              <h3>2. Tỷ lệ mức độ</h3>
              <span className={tyLeHopLe(tyLeChung) ? "matrix-sum matrix-sum-ok" : "matrix-sum matrix-sum-bad"}>Tổng {tongTyLeChung}%</span>
            </header>
            <div className="matrix-ratio">
              {TEN_MUC_DO.map((ten, i) => (
                <label key={ten}>
                  <span>{ten}</span>
                  <span className="matrix-pct"><input aria-label={`Tỷ lệ chung ${ten}`} className="matrix-input" max={100} min={0} onChange={(event) => {
                    const tyLe = [...tyLeChung] as BaMuc;
                    tyLe[i] = soThuc(event.target.value);
                    doiTyLeChung(tyLe);
                  }} step="0.01" type="number" value={tyLeChung[i]} />%</span>
                </label>
              ))}
            </div>
            <div className="matrix-presets">
              <span>Mẫu nhanh:</span>
              {MAU_TY_LE.map((mau) => (
                <button className={cungTyLe(mau, tyLeChung) ? "matrix-preset is-active" : "matrix-preset"} key={khoaTyLe(mau)} onClick={() => doiTyLeChung(mau)} type="button">{mau.join(" · ")}</button>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="panel table-panel">
        {!chiXem && <div className="matrix-step-title"><h3>3. Số câu từng KQHT</h3></div>}
        {loiTruong.cauTruc && <div className="form-alert" role="alert"><BieuTuong name="alert" size={16} /><span>{loiTruong.cauTruc}</span></div>}

        <div className="table-scroll">
          <table className="data-table matrix-grid">
            <thead>
              <tr><th>KQHT</th><th>SỐ CÂU</th>{TEN_MUC_DO.map((ten) => <th key={ten}>{ten.toLocaleUpperCase("vi")}</th>)}{!chiXem && <th><span className="sr-only">THAO TÁC</span></th>}</tr>
            </thead>
            <tbody>
              {dong.map((d) => (
                <tr className={d.dangSuDung ? undefined : "matrix-row-inactive"} key={d.maKQHT}>
                  <td>
                    <div className="outcome-name">
                      <strong>{d.kyHieu} — {d.tenKQHT}</strong>
                      {d.rieng && <span className="matrix-tag">Tỷ lệ riêng</span>}
                      {!d.dangSuDung && <small className="field-error">Đã ngừng sử dụng</small>}
                    </div>
                  </td>
                  <td>
                    <input aria-label={`Số câu KQHT ${d.kyHieu}`} className="matrix-input" disabled={chiXem} min={0} onChange={(event) => {
                      const soCau = soNguyen(event.target.value);
                      capNhatDong(d.maKQHT, (x) => ({ ...x, soCau, soCauMuc: quyRaSoCau(soCau, x.tyLe) }));
                    }} onFocus={(event) => event.target.select()} type="number" value={d.soCau} />
                    {d.rieng && !tyLeHopLe(d.tyLe) && <small className="field-error">Tổng {Math.round(tongBa(d.tyLe) * 100) / 100}%</small>}
                  </td>
                  {MUC_DO.map((maMD, i) => {
                    const coSanO = layCoSan(d.maKQHT, maMD);
                    const thieu = d.soCauMuc[i] > coSanO;
                    return (
                      <td className={thieu ? "matrix-cell matrix-cell-short" : "matrix-cell"} key={maMD}>
                        {d.rieng && !chiXem ? (
                          <span className="matrix-pct"><input aria-label={`Tỷ lệ ${TEN_MUC_DO[i]} KQHT ${d.kyHieu}`} className="matrix-input" max={100} min={0} onChange={(event) => {
                            const giaTri = soThuc(event.target.value);
                            capNhatDong(d.maKQHT, (x) => {
                              const tyLe = [...x.tyLe] as BaMuc;
                              tyLe[i] = giaTri;
                              return { ...x, tyLe, soCauMuc: quyRaSoCau(x.soCau, tyLe) };
                            });
                          }} step="0.01" type="number" value={d.tyLe[i]} />%</span>
                        ) : null}
                        <strong className="matrix-count">{d.soCauMuc[i]} câu</strong>
                        <small className="matrix-available">{thieu ? `Thiếu: ngân hàng có ${coSanO}` : `Có sẵn ${coSanO}`}</small>
                      </td>
                    );
                  })}
                  {!chiXem && (
                    <td>
                      <div className="row-actions">
                        <button aria-label={d.rieng ? `Dùng tỷ lệ chung cho ${d.kyHieu}` : `Đặt tỷ lệ riêng cho ${d.kyHieu}`} className="row-action" onClick={() => batTatTyLeRieng(d)} title={d.rieng ? "Dùng tỷ lệ chung" : "Đặt tỷ lệ riêng"} type="button"><BieuTuong name={d.rieng ? "layers" : "edit"} size={16} /></button>
                        <button aria-label={`Bỏ KQHT ${d.kyHieu}`} className="row-action danger" onClick={() => setDong((x) => x.filter((y) => y.maKQHT !== d.maKQHT))} title="Bỏ khỏi ma trận" type="button"><BieuTuong name="x" size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {dong.length > 0 && (
              <tfoot>
                <tr><th>Tổng</th><th>{tongSoCau} câu</th>{MUC_DO.map((maMD, i) => <th key={maMD}>{dong.reduce((tong, d) => tong + d.soCauMuc[i], 0)} câu</th>)}{!chiXem && <th />}</tr>
              </tfoot>
            )}
          </table>
        </div>
        {dong.length === 0 && <div className="empty-state"><BieuTuong name="layers" size={28} /><strong>Chưa có KQHT nào</strong><span>{chiXem ? "Ma trận không có KQHT." : "Bấm vào KQHT ở bước 1 để thêm."}</span></div>}
      </section>

      {!chiXem && (
        <section className="matrix-savebar" aria-live="polite">
          <div>
            <strong>{tongSoCau} câu · {dong.length} KQHT · {thoiGianLam} phút</strong>
            {lyDoChuaLuu.length > 0
              ? <small className="field-error">{lyDoChuaLuu[0]}{lyDoChuaLuu.length > 1 && ` (và ${lyDoChuaLuu.length - 1} lỗi khác)`}</small>
              : soOThieu > 0
                ? <small className="matrix-warn">{soOThieu} ô thiếu câu trong ngân hàng: vẫn lưu được nhưng chưa kích hoạt được.</small>
                : <small className="matrix-ok">Sẵn sàng lưu.</small>}
          </div>
          <button aria-busy={submitting} className="button button-primary" disabled={submitting || lyDoChuaLuu.length > 0} type="submit">
            <BieuTuong name="check" size={16} /> {submitting ? "Đang lưu…" : "Lưu ma trận"}
          </button>
        </section>
      )}
    </form>

    {suaThongTin && (
      <HopThoaiThongTinMaTran
        nutXacNhan={<><BieuTuong name="check" size={16} /> {tenMT ? "Cập nhật" : "Tiếp tục"}</>}
        onDong={dongHopThoai}
        onXacNhan={(ten, thoiGian) => {
          setTenMT(ten);
          setThoiGianLam(thoiGian);
          setLoiTruong((x) => ({ ...x, tenMT: undefined, thoiGianLam: undefined }));
          setSuaThongTin(false);
        }}
        tenMT={tenMT}
        thoiGianLam={thoiGianLam}
        tieuDe={chiTiet || tenMT ? "Sửa thông tin ma trận" : "Tạo ma trận đề"}
      />
    )}
    </>
  );
}
