import type { SVGProps } from "react";

/**
 * Biểu tượng CampusExam: chữ "C" (Campus) mở khe, dấu tick đáp án đúng vươn ra ngoài.
 * Bố cục cân theo khung 64×64: cụm chữ C và dấu tick canh giữa cả hai trục, lề trái/phải ~11 đơn vị.
 * `nen`: chọn phối màu theo nền đặt logo — "sang" (nền trắng), "toi" (nền xanh đậm), "don-sac" (in đen trắng).
 */
type NenLogo = "sang" | "toi" | "don-sac";

const phoiMau: Record<NenLogo, { khung: string; chuC: string; dauTick: string }> = {
  sang: { khung: "#1E40AF", chuC: "#FFFFFF", dauTick: "#F59E0B" },
  toi: { khung: "#2563EB", chuC: "#FFFFFF", dauTick: "#FBBF24" },
  "don-sac": { khung: "#0F172A", chuC: "#FFFFFF", dauTick: "#FFFFFF" },
};

type LogoProps = SVGProps<SVGSVGElement> & { size?: number; nen?: NenLogo };

export function LogoCampusExam({ size = 36, nen = "sang", className, ...props }: LogoProps) {
  const mau = phoiMau[nen];
  // Ở cỡ nhỏ nét mảnh sẽ bị mờ, nên tăng độ dày nét.
  const doDayNet = size <= 16 ? 8 : size <= 32 ? 7 : 6;

  return (
    <svg
      aria-hidden="true"
      className={className ? `ce-logo ${className}` : "ce-logo"}
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect fill={mau.khung} height="64" rx="15" width="64" />
      <path d="M32.2 18.75 A15 15 0 1 0 44.5 33.6" fill="none" stroke={mau.chuC} strokeLinecap="round" strokeWidth={doDayNet} />
      <path d="M20.5 30.5 L27.5 37.5 L49.5 15.5" fill="none" stroke={mau.dauTick} strokeLinecap="round" strokeLinejoin="round" strokeWidth={doDayNet} />
    </svg>
  );
}
