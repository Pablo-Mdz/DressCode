// Genera los íconos PNG de la PWA a partir de un SVG (solo trazos, sin fuentes).
// Uso: npm run icons
import sharp from "sharp";

const crown = (scale, offset) => `
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="M15 42 L13 22 L23 31 L32 16 L41 31 L51 22 L49 42 Z" fill="#c8a24c"/>
    <rect x="15" y="44" width="34" height="5" rx="1" fill="#c8a24c"/>
    <circle cx="13" cy="20" r="2.6" fill="#e3c77a"/>
    <circle cx="32" cy="14" r="2.6" fill="#e3c77a"/>
    <circle cx="51" cy="20" r="2.6" fill="#e3c77a"/>
    <circle cx="32" cy="34" r="3" fill="#9b1c20"/>
  </g>`;

const standard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0d0b0a"/>
  <rect x="4" y="4" width="56" height="56" fill="none" stroke="#c8a24c" stroke-width="1.2"/>
  <rect x="6" y="6" width="52" height="52" fill="none" stroke="#c8a24c" stroke-width="0.4"/>
  ${crown(1, 0)}
</svg>`;

// Maskable: el contenido debe quedar dentro del 80% central.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0d0b0a"/>
  ${crown(0.7, 9.6)}
</svg>`;

const out = [
  [standard, 192, "public/pwa-192.png"],
  [standard, 512, "public/pwa-512.png"],
  [standard, 180, "public/apple-touch-icon.png"],
  [maskable, 512, "public/pwa-maskable-512.png"],
];

for (const [svg, size, file] of out) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(file);
  console.log("✓", file);
}
