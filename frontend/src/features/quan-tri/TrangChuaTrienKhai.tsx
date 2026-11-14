import { BieuTuong, type TenBieuTuong } from "../../components/BieuTuong";

type Props = {
  tieuDe: string;
  moTa: string;
  bieuTuong: TenBieuTuong;
};

/** Trang giữ chỗ cho chức năng đã có trong menu nhưng chưa triển khai. */
export default function TrangChuaTrienKhai({ tieuDe, moTa, bieuTuong }: Props) {
  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <h2>{tieuDe}</h2>
          <p>{moTa}</p>
        </div>
      </section>
      <section className="placeholder-page">
        <span><BieuTuong name={bieuTuong} size={26} /></span>
        <h2>Chức năng đang được xây dựng</h2>
        <p>Chức năng này sẽ được bổ sung trong phiên bản sau.</p>
      </section>
    </div>
  );
}
