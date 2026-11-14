import { Outlet } from "react-router-dom";

import "../styles/phong-thi.css";

/**
 * Phòng thi là một không gian riêng: không có menu, liên kết hay thông báo của cổng thí sinh,
 * để thí sinh chỉ tập trung vào bài làm.
 */
export default function BoCucPhongThi() {
  return (
    <div className="pt">
      <Outlet />
    </div>
  );
}
