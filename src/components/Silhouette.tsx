import type { GarmentKind } from "../lib/types";

// Figurines de línea fina para prendas sin foto (sugerencias de compra).
const PATHS: Record<GarmentKind, string> = {
  remera: "M30 22 L42 16 Q50 24 58 16 L70 22 L82 36 L72 42 L68 38 L68 100 L32 100 L32 38 L28 42 L18 36 Z",
  camisa: "M30 20 L42 14 Q50 22 58 14 L70 20 L84 38 L74 46 L68 40 L68 104 L32 104 L32 40 L26 46 L16 38 Z M50 20 L50 104",
  sweater: "M32 20 L42 15 Q50 22 58 15 L68 20 L86 44 L86 96 L76 96 L76 52 L70 46 L70 104 L30 104 L30 46 L24 52 L24 96 L14 96 L14 44 Z M30 96 L70 96",
  campera: "M30 18 L42 12 L50 34 L58 12 L70 18 L86 40 L80 108 L20 108 L14 40 Z M50 34 L50 108 M42 12 L46 52 M58 12 L54 52",
  pantalon: "M32 12 L68 12 L72 108 L56 108 L50 44 L44 108 L28 108 Z M32 22 L68 22",
  pollera: "M34 22 L66 22 L80 100 L20 100 Z M34 30 L66 30",
  vestido: "M38 12 L44 12 Q50 20 56 12 L62 12 L64 40 L80 106 L20 106 L36 40 Z M36 40 L64 40",
  zapato: "M12 78 Q28 76 40 62 Q52 72 76 76 Q90 78 90 88 L12 88 Z",
  zapatilla: "M12 80 Q24 78 34 64 L50 64 Q60 74 80 76 Q92 78 90 90 L12 90 Z M12 84 L90 84 M40 66 L44 74 M48 66 L52 74",
  bolso: "M26 48 L74 48 L78 104 L22 104 Z M38 48 Q38 26 50 26 Q62 26 62 48",
  accesorio: "M42 14 L58 14 L58 42 L42 42 Z M42 78 L58 78 L58 106 L42 106 Z M50 44 A16 16 0 1 1 49.9 44 Z",
};

export default function Silhouette({
  kind,
  stroke = "#111111",
  width = 84,
  strokeWidth = 1.3,
}: {
  kind: GarmentKind;
  stroke?: string;
  width?: number;
  strokeWidth?: number;
}) {
  return (
    <svg viewBox="0 0 100 120" width={width} height={(width * 120) / 100} aria-hidden>
      <path d={PATHS[kind] ?? PATHS.accesorio} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Para tiles con fondo del color de la prenda: trazo blanco sobre colores oscuros.
export function strokeFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#111111";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140 ? "#FFFFFF" : "#111111";
}
