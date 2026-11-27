/**
 * Kiểu dữ liệu hợp đồng API.
 * Khi backend chạy ở Development có thể đối chiếu với /openapi/v1.json.
 */

/** Lỗi theo trường: khóa là tên trường JSON, ví dụ `tenKQHT`. */
export type ValidationErrors = Record<string, string[]>;

export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  /** Mã lỗi ổn định, ví dụ `VALIDATION_FAILED`. */
  code?: string;
  errors?: ValidationErrors;
  traceId?: string;
  /** Có khi `code = AUTH_ACCOUNT_LOCKED`: thời điểm hết tạm khóa (UTC). */
  khoaDen?: string;
};

export type VaiTro = "ADMIN" | "THISINH";

export type TaiKhoanHienTai = {
  mtk: number;
  tenDN: string;
  hoTen: string;
  vaiTro: VaiTro;
  /** Mã số thí sinh; null với quản trị viên. */
  msts: string | null;
};

export type PhienDangNhap = {
  accessToken: string;
  hetHan: string;
  taiKhoan: TaiKhoanHienTai;
};

export type DangNhapRequest = {
  tenDN: string;
  matKhau: string;
  ghiNho: boolean;
};

export type DoiMatKhauRequest = {
  matKhauCu: string;
  matKhauMoi: string;
};

/** Một trang của API danh sách có phân trang (mục 1.3). */
export type TrangDuLieu<T> = {
  duLieu: T[];
  trang: number;
  kichThuocTrang: number;
  tongSoDong: number;
  tongSoTrang: number;
};

export type TruyVanTrang = {
  trang?: number;
  kichThuocTrang?: number;
  sapXep?: string;
  tuKhoa?: string;
};

/** KQHOCTAP.TRANGTHAI, CAUHOI.TRANGTHAI. */
export type TrangThaiSuDung = "dang_su_dung" | "ngung_su_dung";

/** 1 dễ, 2 trung bình, 3 khó. */
export type MaMucDo = 1 | 2 | 3;

export type KqhtDto = {
  maKQHT: number;
  tenKQHT: string;
  thuTu: number;
  moTa: string | null;
  trangThai: TrangThaiSuDung;
  kyHieu: string;
  /** Số câu hỏi thuộc KQHT; lớn hơn 0 thì không đổi được thứ tự và không xóa được. */
  soCauHoi: number;
};

/** `PUT /kqht/{maKQHT}`: ký hiệu suy ra từ thứ tự; trạng thái đổi qua PATCH. */
export type SuaKqhtRequest = {
  tenKQHT: string;
  thuTu: number;
  moTa?: string | null;
};

export type CauHoiTomTat = {
  maCH: number;
  maCauHoi: string;
  tomTat: string;
  kqht: { maKQHT: number; thuTu: number; kyHieu: string };
  maMD: MaMucDo;
  trangThai: TrangThaiSuDung;
  coHinhAnh: boolean;
  ngayCapNhat: string;
};

export type ViTriHinhAnh = "NOIDUNG" | "DAA" | "DAB" | "DAC" | "DAD";

export type DapAn = "A" | "B" | "C" | "D";

export type CauHoiChiTiet = {
  maCH: number;
  maCauHoi: string;
  maKQHT: number;
  maMD: MaMucDo;
  noiDung: string;
  phuongAnA: string;
  phuongAnB: string;
  phuongAnC: string;
  phuongAnD: string;
  dapAnDung: DapAn;
  coDinhDapAn: boolean;
  trangThai: TrangThaiSuDung;
  hinhAnh: { maTN: number; viTri: ViTriHinhAnh; thuTu: number; url: string; altText: string | null }[];
  /** Số đề gốc chứa câu hỏi; lớn hơn 0 thì không xóa được. */
  soDeDaDung: number;
  phienBan: string;
  ngayTao: string;
  ngayCapNhat: string | null;
};

export type NoiDungCauHoi = {
  noiDung: string;
  phuongAnA: string;
  phuongAnB: string;
  phuongAnC: string;
  phuongAnD: string;
  dapAnDung: DapAn;
  coDinhDapAn: boolean;
};

export type TaoCauHoiRequest = NoiDungCauHoi & { maKQHT: number; maMD: MaMucDo };

/** Không đổi được KQHT/mức độ vì chúng quyết định mã câu hỏi. */
export type SuaCauHoiRequest = NoiDungCauHoi & { phienBan: string };

export type TruyVanCauHoi = TruyVanTrang & {
  maKQHT?: number;
  maMD?: MaMucDo;
  trangThai?: TrangThaiSuDung;
  /** `maCauHoi`, `ngayCapNhat`, `ngayTao`; tiền tố `-` là giảm dần. */
  sapXep?: string;
};

export type ThongKeCauHoi = {
  tongSo: number;
  dangSuDung: number;
  ngungSuDung: number;
  /** Số KQHT đang sử dụng. */
  soKQHT: number;
};

export type GioiTinh = "nu" | "nam";

export type TrangThaiTaiKhoan = "khoa" | "hoat_dong";

export type ThiSinhTomTat = {
  msts: string;
  hoTen: string;
  /** `YYYY-MM-DD`. */
  ngaySinh: string;
  gioiTinh: GioiTinh | null;
  lop: string | null;
  trangThaiTaiKhoan: TrangThaiTaiKhoan;
  /** false khi thí sinh còn dùng mật khẩu mặc định (ngày sinh). */
  daDoiMatKhau: boolean;
  soLuotThi: number;
  ngayTao: string;
};

export type ThiSinhChiTiet = ThiSinhTomTat & {
  noiSinh: string | null;
  cccd: string | null;
  lanDNCuoi: string | null;
  /** Số kỳ thi được phân công; lớn hơn 0 thì không xóa được. */
  soLanPhanCong: number;
};

/** `GET /toi/ho-so`: hồ sơ thí sinh tự xem; không có dữ liệu quản trị. */
export type HoSoCaNhan = {
  msts: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: GioiTinh | null;
  lop: string | null;
  noiSinh: string | null;
  cccd: string | null;
  ngayTao: string;
};

export type HoSoThiSinh = {
  hoTen: string;
  ngaySinh: string;
  gioiTinh: GioiTinh | null;
  lop: string | null;
  noiSinh: string | null;
  cccd: string | null;
};

/** Tạo kèm tài khoản: tên đăng nhập = MSTS, mật khẩu mặc định = ngày sinh ddMMyyyy. */
export type TaoThiSinhRequest = HoSoThiSinh & { msts: string };

export type TruyVanThiSinh = TruyVanTrang & {
  lop?: string;
  trangThai?: TrangThaiTaiKhoan;
  daDoiMatKhau?: boolean;
  /** `msts`, `hoTen`, `lop`, `ngayTao`; tiền tố `-` là giảm dần. */
  sapXep?: string;
};

export type TaoKqhtRequest = {
  tenKQHT: string;
  thuTu: number;
  moTa?: string | null;
  trangThai?: TrangThaiSuDung;
  kyHieu: string;
};

export type MucDoVanDe = "canh_bao" | "loi";

export type VanDeNhapCauHoi = {
  code: string;
  noiDung: string;
  mucDo: MucDoVanDe;
};

export type HinhAnhXemTruoc = {
  maDanhDau: string;
  viTri: "NOIDUNG" | "DAA" | "DAB" | "DAC" | "DAD";
  thuTu: number;
  tenFile: string;
  mimeType: string;
};

export type DongXemTruocCauHoi = {
  soDong: number;
  maCauHoi: string | null;
  kyHieu: string | null;
  maMD: MaMucDo | null;
  stt: number | null;
  noiDung: string;
  phuongAnA: string;
  phuongAnB: string;
  phuongAnC: string;
  phuongAnD: string;
  dapAnDung: string | null;
  danhDauCauDan: string | null;
  ghiChu: string | null;
  hinhAnh: HinhAnhXemTruoc[];
  vanDe: VanDeNhapCauHoi[];
  hopLe: boolean;
};

export type XemTruocNhapCauHoi = {
  tongDong: number;
  soDongHopLe: number;
  soDongLoi: number;
  tongHinhAnh: number;
  dong: DongXemTruocCauHoi[];
  /** Mã để xác nhận nhập; null khi còn dòng lỗi (không xác nhận được). */
  maXemTruoc: string | null;
  /** Hạn xác nhận (UTC), 30 phút sau khi xem trước. */
  hetHan: string | null;
};

export type TrangThaiLanImport = "dang_xu_ly" | "hoan_tat" | "that_bai" | "hoan_tat_co_loi";

export type LanImport = {
  maLanImport: number;
  tenFile: string;
  tongDong: number;
  soThanhCong: number;
  soDongLoi: number;
  thoiGian: string;
  trangThai: TrangThaiLanImport;
  nguoiThucHien: string;
};

export type DongXemTruocThiSinh = {
  soDong: number;
  msts: string | null;
  hoTen: string | null;
  /** yyyy-MM-dd */
  ngaySinh: string | null;
  gioiTinh: GioiTinh | null;
  lop: string | null;
  noiSinh: string | null;
  cccd: string | null;
  loi: string[];
  hopLe: boolean;
};

export type XemTruocNhapThiSinh = {
  tongDong: number;
  soDongHopLe: number;
  soDongLoi: number;
  dong: DongXemTruocThiSinh[];
  /** null khi còn dòng lỗi hoặc tệp không có dòng nào. */
  maXemTruoc: string | null;
  hetHan: string | null;
};

/** MATRAN.TRANGTHAIMATRAN. */
export type TrangThaiMaTran = "dang_soan" | "su_dung" | "ngung_su_dung";

export type MaTranTomTat = {
  maMT: number;
  tenMT: string;
  tongSoCau: number;
  thoiGianLam: number;
  trangThai: TrangThaiMaTran;
  soKQHT: number;
  daSinhDe: boolean;
  ngayTao: string;
  ngayCapNhat: string | null;
};

export type OCauTruc = {
  maMD: MaMucDo;
  soCau: number;
  /** % của mức độ trong KQHT. */
  tyLe: number | null;
};

export type KqhtTrongMaTran = {
  maKQHT: number;
  kyHieu: string;
  tenKQHT: string;
  dangSuDung: boolean;
  soCau: number;
  mucDo: OCauTruc[];
};

export type MaTranChiTiet = Omit<MaTranTomTat, "soKQHT"> & {
  phienBan: string;
  kqht: KqhtTrongMaTran[];
};

/** Số câu đang sử dụng trong ngân hàng của một ô KQHT × mức độ. */
export type DoPhu = {
  maKQHT: number;
  maMD: MaMucDo;
  coSan: number;
};

export type DongCauTruc = {
  maKQHT: number;
  maMD: MaMucDo;
  soCau: number;
  tyLe: number | null;
};

/** Mỗi KQHT gửi đủ ba dòng mức độ 1, 2, 3. */
export type LuuMaTranRequest = {
  tenMT: string;
  thoiGianLam: number;
  cauTruc: DongCauTruc[];
};

export type SuaMaTranRequest = LuuMaTranRequest & { phienBan: string };

export type TruyVanMaTran = TruyVanTrang & {
  trangThai?: TrangThaiMaTran;
};

export type SinhDeRequest = {
  maMT: number;
  /** Để trống thì hệ thống đặt dạng DG-0007. */
  maDeGocHienThi?: string;
  soDeCon: number;
};

export type KetQuaSinhDe = {
  maDe: number;
  maDeGocHienThi: string;
  tongSoCau: number;
  /** Số câu đã từng nằm trong các đề gốc trước. */
  soCauTrung: number;
  soDeCon: number;
};

export type DeGocTomTat = {
  maDe: number;
  maDeGocHienThi: string;
  maMT: number;
  tenMT: string;
  tongSoCau: number;
  soDeCon: number;
  daGanKyThi: boolean;
  ngayTao: string;
};

export type TruyVanDeThi = TruyVanTrang & {
  maMT?: number;
  chuaGanKyThi?: boolean;
};

export type HinhTrongDe = {
  /** Vị trí gốc của hình. */
  viTri: ViTriHinhAnh;
  thuTu: number;
  url: string;
  altText: string | null;
};

export type CauTrongDeGoc = {
  thuTu: number;
  maCH: number;
  maCauHoi: string;
  kyHieu: string;
  maMD: MaMucDo;
  noiDung: string;
  phuongAnA: string;
  phuongAnB: string;
  phuongAnC: string;
  phuongAnD: string;
  dapAnDung: DapAn;
  coDinhDapAn: boolean;
  hinhAnh: HinhTrongDe[];
};

export type DeConTomTat = { maDeCon: number; tenDeCon: string };

export type DeGocChiTiet = Omit<DeGocTomTat, "soDeCon"> & {
  deCon: DeConTomTat[];
  cauHoi: CauTrongDeGoc[];
};

export type PhuongAnHienThi = {
  nhan: DapAn;
  /** Phương án gốc đang hiển thị ở nhãn này; hình của phương án theo nhãn gốc. */
  nhanGoc: DapAn;
  noiDung: string;
};

export type CauTrongDeCon = {
  ttCau: number;
  thuTuGoc: number;
  maCauHoi: string;
  noiDung: string;
  phuongAn: PhuongAnHienThi[];
  dapAnDungHienThi: DapAn;
  hinhAnh: HinhTrongDe[];
};

export type DeConChiTiet = {
  maDeCon: number;
  tenDeCon: string;
  maDe: number;
  maDeGocHienThi: string;
  cauHoi: CauTrongDeCon[];
};

/* ---------- Kỳ thi (/ky-thi) ---------- */

/** Trạng thái hiển thị; ba trạng thái giữa tính theo giờ bắt đầu và thời lượng. */
export type TrangThaiKyThi = "nhap" | "da_phat_hanh" | "dang_thi" | "da_ket_thuc" | "da_huy";

export type CachPhanDe = "ngau_nhien" | "can_bang";

export type TrangThaiThiSinhKyThi = "chua_thi" | "dang_thi" | "da_nop" | "he_thong_thu";

export type KyThiTomTat = {
  maKT: number;
  tenKT: string;
  monThi: string;
  /** ISO UTC. */
  tgBatDau: string;
  thoiLuong: number;
  trangThai: TrangThaiKyThi;
  soThiSinh: number;
  soDaNop: number;
  daGanDe: boolean;
  maDeGocHienThi: string | null;
};

export type DeGocCuaKyThi = {
  maDe: number;
  maDeGocHienThi: string;
  tenMT: string;
  tongSoCau: number;
  soDeCon: number;
};

export type KyThiChiTiet = {
  maKT: number;
  tenKT: string;
  monThi: string;
  tgBatDau: string;
  thoiLuong: number;
  soPhutChoVaoTre: number;
  hienDiem: boolean;
  cachPhanDe: CachPhanDe;
  trangThai: TrangThaiKyThi;
  ngayTao: string;
  ngayPhatHanh: string | null;
  phienBan: string;
  deGoc: DeGocCuaKyThi | null;
  soThiSinh: number;
  soDaVaoThi: number;
};

export type ThiSinhKyThi = {
  msts: string;
  hoTen: string;
  lop: string | null;
  soMay: string | null;
  tenDeCon: string;
  trangThai: TrangThaiThiSinhKyThi;
};

export type TruyVanKyThi = TruyVanTrang & { trangThai?: TrangThaiKyThi };

export type LuuKyThiRequest = {
  tenKT: string;
  monThi: string;
  /** ISO UTC. */
  tgBatDau: string;
  thoiLuong: number;
  soPhutChoVaoTre: number;
  hienDiem: boolean;
  cachPhanDe: CachPhanDe;
};

export type SuaKyThiRequest = LuuKyThiRequest & { phienBan: string };

export type KetQuaPhanCong = { soThem: number; boQua: string[] };

export type KiemTraPhatHanh = { phatHanhDuoc: boolean; conThieu: string[] };

/* ---------- Thí sinh làm bài (/toi/ky-thi) ---------- */

export type TrangThaiBaiCuaToi = "chua_vao" | "dang_lam" | "da_nop" | "he_thong_thu" | "vang_thi";

export type KyThiCuaToiApi = {
  maKT: number;
  tenKT: string;
  monThi: string;
  tgBatDau: string;
  thoiLuong: number;
  soCau: number;
  soMay: string | null;
  moCongLuc: string;
  dongCongLuc: string;
  ketThucLuc: string;
  trangThaiBaiLam: TrangThaiBaiCuaToi;
  duocVaoThi: boolean;
  hienDiem: boolean;
  /** Chỉ có khi bài đã nộp/thu và kỳ thi cho hiện điểm. Thí sinh chỉ thấy điểm, không thấy số câu đúng/sai. */
  diem: number | null;
};

export type DanhSachKyThiCuaToi = { gioServer: string; duLieu: KyThiCuaToiApi[] };

export type HinhLamBai = { viTri: ViTriHinhAnh; thuTu: number; url: string; altText: string | null };

export type CauLamBai = {
  ttCau: number;
  noiDung: string;
  phuongAn: { nhan: DapAn; noiDung: string }[];
  hinhAnh: HinhLamBai[];
};

export type BaiLam = {
  maBL: number;
  trangThai: TrangThaiBaiCuaToi;
  gioServer: string;
  hanNop: string;
  kyThi: { tenKT: string; monThi: string; tenDeCon: string; soCau: number; thoiLuong: number };
  cauHoi: CauLamBai[];
  traLoi: { ttCau: number; dapAnChon: DapAn | null; danhDau: boolean }[];
};

/** `dapAnChon`: "" bỏ chọn, bỏ trống là không đổi. */
export type ThayDoiTraLoi = { ttCau: number; dapAnChon?: DapAn | ""; danhDau?: boolean };

export type LoTraLoi = { soThuTuLo: number; thayDoi: ThayDoiTraLoi[] };

export type KetQuaLuu = { loDaLuu: number; luuLuc: string; hanNop: string };

export type KetQuaNop = {
  trangThai: TrangThaiBaiCuaToi;
  tgNop: string;
  hienDiem: boolean;
  diem: number | null;
};

/* ---------- Theo dõi thi (/ky-thi/{maKT}/giam-sat) ---------- */

export type ThiSinhGiamSat = {
  msts: string;
  hoTen: string;
  lop: string | null;
  soMay: string | null;
  tenDeCon: string;
  trangThai: TrangThaiThiSinhKyThi;
  maBL: number | null;
  tgVaoThi: string | null;
  tgNop: string | null;
  lanHoatDongCuoi: string | null;
  soCauDaLam: number;
  phutCongThem: number;
  hanNop: string | null;
  soCauDung: number | null;
  diem: number | null;
};

export type GiamSatKyThi = {
  maKT: number;
  tenKT: string;
  monThi: string;
  trangThai: TrangThaiKyThi;
  gioServer: string;
  tgBatDau: string;
  dongCongLuc: string;
  ketThucLuc: string;
  tongSoCau: number;
  soLuong: { duocPhanCong: number; chuaVao: number; dangLam: number; daNop: number; heThongThu: number };
  thiSinh: ThiSinhGiamSat[];
};

/* ---------- Nhật ký hoạt động (/nhat-ky) ---------- */

export type NhatKy = {
  maNhatKy: number;
  nhom: string;
  hanhDong: string;
  doiTuong: string;
  chiTiet: string | null;
  thoiGian: string;
  nguoiThucHien: string | null;
};

/* ---------- Kết quả kỳ thi (quản trị) ---------- */

export type TrangThaiKetQuaThiSinh = "da_nop" | "he_thong_thu" | "dang_lam" | "vang_thi" | "chua_vao";

export type KyThiKetQua = {
  maKT: number;
  tenKT: string;
  monThi: string;
  tgBatDau: string;
  thoiLuong: number;
  trangThai: TrangThaiKyThi;
  tongSoCau: number;
};

/** Điểm tính trên bài đã nộp hoặc hệ thống thu; null khi chưa có bài. `tyLeDat` là phần trăm. */
export type ChiSoKetQua = {
  soPhanCong: number;
  soDaThi: number;
  diemTrungBinh: number | null;
  diemCaoNhat: number | null;
  diemThapNhat: number | null;
  tyLeDat: number | null;
};

export type KhoangDiem = { tu: number; den: number; soBai: number };

export type CauSai = {
  maCauHoi: string;
  noiDung: string;
  soLuot: number;
  soSai: number;
  soChonSai: number;
  soBoTrong: number;
  tyLeSai: number;
};

/** Một ô KQHT × mức độ. `tyLeDung` là phần trăm, null khi chưa có lượt trả lời nào. */
export type OTyLeDung = { soCau: number; soLuot: number; soDung: number; tyLeDung: number | null };

export type DongTyLeDung = {
  maKQHT: number;
  kyHieu: string;
  tenKQHT: string;
  theoMucDo: OTyLeDung[];
  tong: OTyLeDung;
};

export type BangTyLeDung = {
  mucDo: { maMD: number; tenMD: string }[];
  dong: DongTyLeDung[];
  tongTheoMucDo: OTyLeDung[];
  tongCong: OTyLeDung;
};

export type ThongKeKetQua = {
  kyThi: KyThiKetQua;
  chiSo: ChiSoKetQua;
  phoDiem: KhoangDiem[];
  cauSaiNhieuNhat: CauSai[];
  tyLeDungTheoKqht: BangTyLeDung;
};

export type DongBangDiem = {
  msts: string;
  hoTen: string;
  lop: string | null;
  soMay: string | null;
  tenDeCon: string | null;
  soCauDung: number | null;
  /** Tổng số câu − số câu đúng (gồm câu bỏ trống); null khi chưa có bài. */
  soCauSai: number | null;
  tongSoCau: number;
  diem: number | null;
  trangThai: TrangThaiKetQuaThiSinh;
  tgNop: string | null;
};

export type KetQuaCau = "dung" | "sai" | "bo_trong";

/** Một câu trong bài của thí sinh, theo thứ tự và nhãn phương án của đề con thí sinh đã làm. */
export type CauBaiLam = {
  ttCau: number;
  maCauHoi: string;
  noiDung: string;
  /** Phương án A–D theo thứ tự hiển thị. */
  phuongAn: string[];
  dapAnChon: DapAn | null;
  dapAnDung: DapAn;
  ketQua: KetQuaCau;
};

/** Bài làm chi tiết của một thí sinh (chỉ quản trị viên): điểm, số câu đúng/sai/bỏ trống, từng câu. */
export type BaiLamChiTiet = {
  msts: string;
  hoTen: string;
  lop: string | null;
  soMay: string | null;
  tenDeCon: string;
  trangThai: TrangThaiKetQuaThiSinh;
  tgNop: string | null;
  diem: number | null;
  soCauDung: number;
  soCauSai: number;
  soBoTrong: number;
  tongSoCau: number;
  cauHoi: CauBaiLam[];
};

export type TruyVanBangDiem = TruyVanTrang & { tuKhoa?: string; trangThai?: TrangThaiKetQuaThiSinh };
