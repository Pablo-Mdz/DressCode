// Genera los íconos PNG de la PWA a partir de un SVG (solo trazos, sin fuentes).
// Uso: npm run icons
import sharp from "sharp";

const hanger = (scale, offset, width) => `
  <g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#111111" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 21a5 5 0 1 1 5-5c0 2.5-2.5 3.8-5 5.5v3.5"/>
    <path d="M32 25 9 43.5c-2 1.6-.9 4.5 1.5 4.5h43c2.4 0 3.5-2.9 1.5-4.5L32 25Z"/>
  </g>`;

const svg = (scale, offset, width) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ffffff"/>${hanger(scale, offset, width)}</svg>`;

// Maskable: el contenido debe quedar dentro del 80% central.
const out = [
  [svg(0.8, 6.4, 2), 192, "public/pwa-192.png"],
  [svg(0.8, 6.4, 2), 512, "public/pwa-512.png"],
  [svg(0.8, 6.4, 2), 180, "public/apple-touch-icon.png"],
  [svg(0.6, 12.8, 2.4), 512, "public/pwa-maskable-512.png"],
];

for (const [source, size, file] of out) {
  await sharp(Buffer.from(source), { density: 600 }).resize(size, size).png().toFile(file);
  console.log("✓", file);
}
