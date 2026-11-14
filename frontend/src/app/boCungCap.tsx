import type { PropsWithChildren } from "react";

import { NhaCungCapXacThuc } from "../features/xac-thuc/NhaCungCapXacThuc";

export function BoCungCapUngDung({ children }: PropsWithChildren) {
  return <NhaCungCapXacThuc>{children}</NhaCungCapXacThuc>;
}
