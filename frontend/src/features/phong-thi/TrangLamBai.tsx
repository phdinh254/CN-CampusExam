import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BieuTuong } from "../../components/BieuTuong";
import { LogoCampusExam } from "../../components/LogoCampusExam";
import { LoiApiHttp } from "../../services/khachHttp";
import type { BaiLam, DapAn, KetQuaNop, ThayDoiTraLoi } from "../../types/api";
import { toiApi } from "../cong-thi-sinh/api";
import { NoiDungCoHinh } from "../de-thi/NoiDungCoHinh";
import { useTaiKhoan } from "../xac-thuc/NhaCungCapXacThuc";

const CHU_CAI: DapAn[] = ["A", "B", "C", "D"];
const CHU_KY_LUU_MS = 3000;
const dinhDangDiem = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const dinhDangGio = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });

type TraLoiCau = { dapAnChon: DapAn | null; danhDau: boolean };
type TrangThaiLuu = "da_luu" | "dang_luu" | "cho_luu" | "mat_ket_noi";
type ManHinh =
  | { loai: "dang_tai" }
  | { loai: "loi"; tieuDe: string; noiDung: string }
  | { loai: "lam_bai" }
  | { loai: "ket_qua"; ketQua: KetQuaNop };

const hai = (n: number) => String(n).padStart(2, "0");

function dinhDangThoiGian(giay: number) {
  const gio = Math.floor(giay / 3600);
  const phut = Math.floor((giay % 3600) / 60);
  return gio > 0 ? `${gio}:${hai(phut)}:${hai(giay % 60)}` : `${hai(phut)}:${hai(giay % 60)}`;
}

/** Thay đổi chưa gửi được lưu tạm trong trình duyệt để không mất khi tải lại trang lúc mất mạng. */
const khoaChoLuu = (maBL: number) => `campusexam-cho-luu-${maBL}`;

function docChoLuu(maBL: number): Map<number, ThayDoiTraLoi> {
  try {
    const raw = window.sessionStorage.getItem(khoaChoLuu(maBL));
    const ds = raw ? (JSON.parse(raw) as ThayDoiTraLoi[]) : [];
    return new Map(ds.map((td) => [td.ttCau, td]));
  } catch {
    return new Map();
  }
}

function ghiChoLuu(maBL: number, choLuu: Map<number, ThayDoiTraLoi>) {
  try {
    if (choLuu.size === 0) window.sessionStorage.removeItem(khoaChoLuu(maBL));
    else window.sessionStorage.setItem(khoaChoLuu(maBL), JSON.stringify([...choLuu.values()]));
  } catch {
    /* Không có sessionStorage thì vẫn lưu qua mạng như thường. */
  }
}

/** Gộp thay đổi mới vào thay đổi đang chờ của cùng câu. */
function gop(cu: ThayDoiTraLoi | undefined, moi: ThayDoiTraLoi): ThayDoiTraLoi {
  return { ...cu, ...moi, ttCau: moi.ttCau };
}

export default function TrangLamBai() {
  const navigate = useNavigate();
  const taiKhoan = useTaiKhoan();
  const [params] = useSearchParams();
  const maKT = Number(params.get("maKT")) || null;

  const [manHinh, setManHinh] = useState<ManHinh>({ loai: "dang_tai" });
  const [bai, setBai] = useState<BaiLam | null>(null);
  const [traLoi, setTraLoi] = useState<Map<number, TraLoiCau>>(new Map());
  const [cauHienTai, setCauHienTai] = useState(1);
  const [hienDanhSach, setHienDanhSach] = useState(true);
  const [xacNhanNop, setXacNhanNop] = useState(false);
  const [dangNop, setDangNop] = useState(false);
  const [loiNop, setLoiNop] = useState<string | null>(null);
  const [trangThaiLuu, setTrangThaiLuu] = useState<TrangThaiLuu>("da_luu");
  const [luuLuc, setLuuLuc] = useState<Date | null>(null);
  const [hanNop, setHanNop] = useState<number>(0);
  const [doLech, setDoLech] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const choLuu = useRef<Map<number, ThayDoiTraLoi>>(new Map());
  const dangGui = useRef(false);
  const daKetThuc = useRef(false);
  const lanNopTuDong = useRef(0);

  const soCau = bai?.cauHoi.length ?? 0;
  const conLaiGiay = Math.max(0, Math.floor((hanNop - (now + doLech)) / 1000));

  const ketThuc = useCallback((tieuDe: string, noiDung: string) => {
    daKetThuc.current = true;
    setManHinh({ loai: "loi", tieuDe, noiDung });
  }, []);

  /** Gửi các thay đổi đang chờ thành một lô; lỗi mạng thì giữ lại để gửi lần sau. */
  const guiLo = useCallback(async () => {
    if (!bai || !maKT || dangGui.current || daKetThuc.current || choLuu.current.size === 0) return;
    dangGui.current = true;
    const lo = [...choLuu.current.values()];
    choLuu.current = new Map();
    setTrangThaiLuu("dang_luu");
    try {
      const kq = await toiApi.luu(maKT, { soThuTuLo: Date.now(), thayDoi: lo });
      setHanNop(new Date(kq.hanNop).getTime());
      setLuuLuc(new Date(kq.luuLuc));
      setTrangThaiLuu(choLuu.current.size > 0 ? "cho_luu" : "da_luu");
    } catch (error) {
      // Trả lô về hàng chờ; thay đổi mới hơn của cùng câu được giữ.
      for (const td of lo) choLuu.current.set(td.ttCau, gop(td, choLuu.current.get(td.ttCau) ?? { ttCau: td.ttCau }));
      if (error instanceof LoiApiHttp && error.code === "ATTEMPT_CLOSED") {
        ketThuc("Bài làm đã đóng", "Đã hết giờ làm bài, hệ thống đã thu bài của bạn.");
      } else {
        setTrangThaiLuu("mat_ket_noi");
      }
    } finally {
      ghiChoLuu(bai.maBL, choLuu.current);
      dangGui.current = false;
    }
  }, [bai, maKT, ketThuc]);

  // Vào phòng thi: bắt đầu hoặc tiếp tục bài, khôi phục thay đổi chưa gửi.
  useEffect(() => {
    if (!maKT) {
      setManHinh({ loai: "loi", tieuDe: "Không có kỳ thi", noiDung: "Hãy vào phòng thi từ trang chi tiết kỳ thi." });
      return;
    }
    let huy = false;
    toiApi.batDau(maKT)
      .then((ketQua) => {
        if (huy) return;
        const daLuu = new Map<number, TraLoiCau>(ketQua.traLoi.map((tl) => [tl.ttCau, { dapAnChon: tl.dapAnChon, danhDau: tl.danhDau }]));
        const choGui = docChoLuu(ketQua.maBL);
        for (const td of choGui.values()) {
          const cu = daLuu.get(td.ttCau) ?? { dapAnChon: null, danhDau: false };
          daLuu.set(td.ttCau, {
            dapAnChon: td.dapAnChon === undefined ? cu.dapAnChon : td.dapAnChon || null,
            danhDau: td.danhDau ?? cu.danhDau,
          });
        }
        choLuu.current = choGui;
        setTraLoi(daLuu);
        setDoLech(new Date(ketQua.gioServer).getTime() - Date.now());
        setHanNop(new Date(ketQua.hanNop).getTime());
        setTrangThaiLuu(choGui.size > 0 ? "cho_luu" : "da_luu");
        setBai(ketQua);
        setManHinh({ loai: "lam_bai" });
      })
      .catch((error: unknown) => {
        if (huy) return;
        if (error instanceof LoiApiHttp && error.code === "ATTEMPT_CLOSED") {
          ketThuc("Bài làm đã đóng", "Bạn đã nộp bài hoặc hệ thống đã thu bài. Không thể làm lại.");
        } else if (error instanceof LoiApiHttp && error.code === "EXAM_NOT_OPEN") {
          ketThuc("Phòng thi chưa mở", error.message);
        } else {
          ketThuc("Không vào được phòng thi", error instanceof Error ? error.message : "Đã có lỗi xảy ra.");
        }
      });
    return () => { huy = true; };
  }, [maKT, ketThuc]);

  // Đồng hồ và tự lưu định kỳ.
  useEffect(() => {
    if (manHinh.loai !== "lam_bai") return undefined;
    const dongHo = window.setInterval(() => setNow(Date.now()), 1000);
    const luu = window.setInterval(() => void guiLo(), CHU_KY_LUU_MS);
    return () => { window.clearInterval(dongHo); window.clearInterval(luu); };
  }, [manHinh.loai, guiLo]);

  /** Nộp bài kèm các thay đổi chưa gửi; dùng cả khi hết giờ. */
  const nopBai = useCallback(async () => {
    if (!bai || !maKT || daKetThuc.current) return;
    setDangNop(true);
    setLoiNop(null);
    const lo = [...choLuu.current.values()];
    try {
      const ketQua = await toiApi.nop(maKT, { soThuTuLo: Date.now(), thayDoi: lo });
      daKetThuc.current = true;
      choLuu.current = new Map();
      ghiChoLuu(bai.maBL, choLuu.current);
      setXacNhanNop(false);
      setManHinh({ loai: "ket_qua", ketQua });
    } catch (error) {
      setLoiNop(error instanceof Error ? `Chưa nộp được: ${error.message}. Hãy thử lại.` : "Chưa nộp được bài. Hãy thử lại.");
      setXacNhanNop(true);
    } finally {
      setDangNop(false);
    }
  }, [bai, maKT]);

  // Hết giờ theo đồng hồ máy chủ: nộp ngay (máy chủ tự quyết định nhận lô cuối hay thu bài).
  // Mất mạng thì thử lại tối đa mỗi 5 giây.
  useEffect(() => {
    if (manHinh.loai !== "lam_bai" || hanNop <= 0 || conLaiGiay > 0 || dangNop) return;
    if (now - lanNopTuDong.current < 5000) return;
    lanNopTuDong.current = now;
    void nopBai();
  }, [manHinh.loai, hanNop, conLaiGiay, dangNop, nopBai, now]);

  // Cảnh báo khi đóng tab hoặc tải lại trang giữa giờ thi.
  useEffect(() => {
    if (manHinh.loai !== "lam_bai") return undefined;
    const chan = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", chan);
    return () => window.removeEventListener("beforeunload", chan);
  }, [manHinh.loai]);

  const ghiThayDoi = useCallback((td: ThayDoiTraLoi) => {
    choLuu.current.set(td.ttCau, gop(choLuu.current.get(td.ttCau), td));
    if (bai) ghiChoLuu(bai.maBL, choLuu.current);
    setTrangThaiLuu((cu) => (cu === "mat_ket_noi" ? cu : "cho_luu"));
  }, [bai]);

  const chonPhuongAn = useCallback((ttCau: number, nhan: DapAn) => {
    setTraLoi((cu) => {
      const moi = new Map(cu);
      moi.set(ttCau, { danhDau: cu.get(ttCau)?.danhDau ?? false, dapAnChon: nhan });
      return moi;
    });
    ghiThayDoi({ ttCau, dapAnChon: nhan });
  }, [ghiThayDoi]);

  const doiDanhDau = useCallback((ttCau: number) => {
    const danhDau = !(traLoi.get(ttCau)?.danhDau ?? false);
    setTraLoi((cu) => {
      const moi = new Map(cu);
      moi.set(ttCau, { dapAnChon: cu.get(ttCau)?.dapAnChon ?? null, danhDau });
      return moi;
    });
    ghiThayDoi({ ttCau, danhDau });
  }, [ghiThayDoi, traLoi]);

  const chuyenCau = useCallback((so: number) => {
    setCauHienTai(Math.min(soCau, Math.max(1, so)));
    void guiLo();
  }, [soCau, guiLo]);

  // Phím tắt: A–D hoặc 1–4 chọn phương án, ← → chuyển câu, Esc đóng hộp thoại nộp bài.
  useEffect(() => {
    if (manHinh.loai !== "lam_bai") return undefined;
    function xuLyPhim(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement && event.target.type === "text") return;
      if (xacNhanNop) {
        if (event.key === "Escape" && !dangNop) setXacNhanNop(false);
        return;
      }
      const i = Math.max("abcd".indexOf(event.key.toLowerCase()), "1234".indexOf(event.key));
      if (i >= 0) chonPhuongAn(cauHienTai, CHU_CAI[i]);
      else if (event.key === "ArrowRight") chuyenCau(cauHienTai + 1);
      else if (event.key === "ArrowLeft") chuyenCau(cauHienTai - 1);
    }
    window.addEventListener("keydown", xuLyPhim);
    return () => window.removeEventListener("keydown", xuLyPhim);
  }, [manHinh.loai, cauHienTai, xacNhanNop, dangNop, chonPhuongAn, chuyenCau]);

  const cau = bai?.cauHoi.find((c) => c.ttCau === cauHienTai);
  const traLoiCau = traLoi.get(cauHienTai);
  const soDaTraLoi = [...traLoi.values()].filter((tl) => tl.dapAnChon).length;
  const soDanhDau = [...traLoi.values()].filter((tl) => tl.danhDau).length;
  const mucThoiGian = conLaiGiay <= 60 ? "nguy-cap" : conLaiGiay <= 5 * 60 ? "sap-het" : "";
  const nhanLuu: Record<TrangThaiLuu, string> = {
    da_luu: luuLuc ? `Đã lưu lúc ${dinhDangGio.format(luuLuc)}` : "Đã lưu",
    dang_luu: "Đang lưu…",
    cho_luu: "Chờ lưu…",
    mat_ket_noi: "Mất kết nối, đang thử lại",
  };

  return (
    <>
      <header className="pt-bar">
        <div className="pt-exam">
          <LogoCampusExam className="pt-logo" nen="sang" size={42} />
          <div>
            <strong>{bai?.kyThi.tenKT ?? "Phòng thi"}</strong>
            {bai && <small>Mã đề {bai.kyThi.tenDeCon} · {bai.kyThi.soCau} câu · {bai.kyThi.thoiLuong} phút</small>}
          </div>
        </div>

        {manHinh.loai === "lam_bai" && (
          <div aria-label={`Thời gian còn lại ${dinhDangThoiGian(conLaiGiay)}`} className={`pt-timer ${mucThoiGian}`} role="timer">
            <span className="pt-timer-label"><BieuTuong name="clock" size={14} /> Thời gian còn lại</span>
            <span className="pt-timer-value">{dinhDangThoiGian(conLaiGiay)}</span>
          </div>
        )}

        <div className="pt-bar-end">
          {manHinh.loai === "lam_bai" && (
            <span aria-live="polite" className={`pt-save pt-save-${trangThaiLuu}`}>
              <BieuTuong name={trangThaiLuu === "mat_ket_noi" ? "alert" : "check"} size={14} /> {nhanLuu[trangThaiLuu]}
            </span>
          )}
          <div className="pt-candidate">
            <strong>{taiKhoan.hoTen}</strong>
            <small>{taiKhoan.msts}</small>
          </div>
        </div>
      </header>

      {manHinh.loai === "dang_tai" && <main className="pt-result"><section className="pt-result-card"><p className="pt-result-meta">Đang mở bài thi…</p></section></main>}

      {manHinh.loai === "loi" && (
        <main className="pt-result">
          <section aria-labelledby="pt-thong-bao" className="pt-result-card">
            <span aria-hidden="true" className="pt-result-icon pt-result-icon-info"><BieuTuong name="alert" size={30} /></span>
            <h1 id="pt-thong-bao">{manHinh.tieuDe}</h1>
            <p className="pt-result-meta">{manHinh.noiDung}</p>
            <Link className="pt-btn pt-btn-primary" to={maKT ? `/candidate/thi/${maKT}` : "/candidate/thi/tham-gia"}>Về trang kỳ thi</Link>
          </section>
        </main>
      )}

      {manHinh.loai === "ket_qua" && bai && (
        <main className="pt-result">
          <section aria-labelledby="pt-ket-qua" className="pt-result-card">
            <span aria-hidden="true" className="pt-result-icon"><BieuTuong name="check" size={30} /></span>
            <h1 id="pt-ket-qua">{manHinh.ketQua.trangThai === "he_thong_thu" ? "Hết giờ, hệ thống đã thu bài" : "Bạn đã nộp bài"}</h1>
            <p className="pt-result-meta">{bai.kyThi.tenKT} · Mã đề {bai.kyThi.tenDeCon} · {manHinh.ketQua.trangThai === "he_thong_thu" ? "Thu" : "Nộp"} lúc {dinhDangGio.format(new Date(manHinh.ketQua.tgNop))}</p>
            {manHinh.ketQua.hienDiem && manHinh.ketQua.diem !== null ? (
              <div className="pt-result-score">
                <div><span>Điểm</span><strong>{dinhDangDiem.format(manHinh.ketQua.diem)}</strong><small>/ 10</small></div>
                <div><span>Số câu đúng</span><strong>{manHinh.ketQua.soCauDung}</strong><small>/ {manHinh.ketQua.tongSoCau}</small></div>
              </div>
            ) : (
              <p className="pt-result-hidden">Kỳ thi này không hiển thị điểm ngay. Bài làm của bạn đã được ghi nhận.</p>
            )}
            <button className="pt-btn pt-btn-primary" onClick={() => navigate("/candidate")} type="button">Về trang chủ</button>
          </section>
        </main>
      )}

      {manHinh.loai === "lam_bai" && bai && cau && (
        <div className="pt-body co-danh-sach">
          <main className="pt-main">
            <article aria-labelledby="pt-noi-dung" className="pt-question">
              <div className="pt-question-meta">
                <span className="pt-question-no">Câu {cauHienTai}/{soCau}</span>
                <button aria-pressed={traLoiCau?.danhDau ?? false} className={`pt-flag ${traLoiCau?.danhDau ? "on" : ""}`} onClick={() => doiDanhDau(cauHienTai)} type="button">
                  <BieuTuong name="flag" size={15} /> {traLoiCau?.danhDau ? "Đã đánh dấu xem lại" : "Đánh dấu xem lại"}
                </button>
              </div>

              <h1 id="pt-noi-dung"><NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={cau.noiDung} viTri="NOIDUNG" /></h1>

              <fieldset className="pt-answers">
                <legend className="sr-only">Chọn một phương án</legend>
                {cau.phuongAn.map((pa) => (
                  <label className={traLoiCau?.dapAnChon === pa.nhan ? "chon" : ""} key={pa.nhan}>
                    <input
                      checked={traLoiCau?.dapAnChon === pa.nhan}
                      name={`cau-${cauHienTai}`}
                      onChange={() => chonPhuongAn(cauHienTai, pa.nhan)}
                      type="radio"
                    />
                    <span className="pt-letter">{pa.nhan}</span>
                    <span className="pt-answer-text"><NoiDungCoHinh hinhAnh={cau.hinhAnh} noiDung={pa.noiDung} viTri={`DA${pa.nhan}`} /></span>
                  </label>
                ))}
              </fieldset>
              <div className="pt-question-nav">
                <button className="pt-btn pt-btn-ghost" disabled={cauHienTai === 1} onClick={() => chuyenCau(cauHienTai - 1)} type="button">
                  <BieuTuong name="arrow-left" size={16} /> Câu trước
                </button>
                <button className="pt-btn pt-btn-primary" disabled={cauHienTai === soCau} onClick={() => chuyenCau(cauHienTai + 1)} type="button">
                  Câu tiếp <BieuTuong name="arrow-right" size={16} />
                </button>
              </div>
            </article>
          </main>

          <aside aria-label="Danh sách câu hỏi" className="pt-map">
            <div className="pt-map-head">
              <strong>Danh sách câu</strong>
              <span>Đã trả lời {soDaTraLoi}/{soCau}</span>
            </div>
            <div aria-hidden="true" className="pt-progress"><i style={{ width: `${soCau ? (soDaTraLoi / soCau) * 100 : 0}%` }} /></div>
            {hienDanhSach && (
              <div className="pt-grid" id="pt-bang-cau">
                {bai.cauHoi.map(({ ttCau: so }) => {
                  const tl = traLoi.get(so);
                  const daLam = !!tl?.dapAnChon;
                  const xemLai = !!tl?.danhDau;
                  return (
                    <button
                      aria-current={so === cauHienTai ? "step" : undefined}
                      aria-label={`Câu ${so}${daLam ? ", đã trả lời" : ""}${xemLai ? ", đánh dấu xem lại" : ""}`}
                      className={[daLam ? "da-lam" : "", xemLai ? "danh-dau" : "", so === cauHienTai ? "hien-tai" : ""].join(" ")}
                      key={so}
                      onClick={() => chuyenCau(so)}
                      type="button"
                    >
                      {so}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="pt-map-actions">
              <button aria-controls="pt-bang-cau" aria-expanded={hienDanhSach} className="pt-btn pt-btn-ghost" onClick={() => setHienDanhSach((hien) => !hien)} type="button">
                <BieuTuong name="dashboard" size={16} /> {hienDanhSach ? "Thu gọn danh sách" : "Danh sách câu"}
              </button>
              <button className="pt-btn pt-btn-primary pt-submit" onClick={() => { setLoiNop(null); setXacNhanNop(true); }} type="button">
                <BieuTuong name="file" size={16} /> Nộp bài
              </button>
            </div>
          </aside>
        </div>
      )}

      {xacNhanNop && manHinh.loai === "lam_bai" && (
        <div className="pt-overlay" role="presentation">
          <div aria-labelledby="pt-nop-tieu-de" aria-modal="true" className="pt-dialog" role="dialog">
            <h2 id="pt-nop-tieu-de">Nộp bài thi?</h2>
            {loiNop && <p className="pt-dialog-error" role="alert">{loiNop}</p>}
            <dl>
              <div><dt>Đã trả lời</dt><dd>{soDaTraLoi}/{soCau}</dd></div>
              <div><dt>Chưa trả lời</dt><dd className={soCau - soDaTraLoi > 0 ? "canh-bao" : ""}>{soCau - soDaTraLoi}</dd></div>
              <div><dt>Đánh dấu xem lại</dt><dd>{soDanhDau}</dd></div>
              <div><dt>Thời gian còn lại</dt><dd>{dinhDangThoiGian(conLaiGiay)}</dd></div>
            </dl>
            <div className="pt-dialog-actions">
              <button autoFocus className="pt-btn pt-btn-ghost" disabled={dangNop} onClick={() => setXacNhanNop(false)} type="button">Quay lại làm bài</button>
              <button className="pt-btn pt-btn-primary" disabled={dangNop} onClick={() => void nopBai()} type="button">{dangNop ? "Đang nộp…" : "Nộp bài"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
