// Quita el fondo de la foto de una prenda DENTRO del teléfono (gratis, sin servidores)
// y la centra sobre fondo blanco, como en una tienda online.
//
// Usa @imgly/background-removal (modelo ISNet, licencia AGPL-3.0). La primera vez el
// navegador descarga el modelo (~40 MB) y lo deja en caché; después funciona sin esa descarga.

import { shrinkImage } from "./image";

export type BgProgress = { phase: "download" | "process"; percent: number };

const WORK_SIDE = 1024; // tamaño con el que trabaja el modelo: rápido y suficiente
const OUT_W = 1200;
const OUT_H = 1500; // 4:5, igual que las tarjetas de la app
const PADDING = 0.08;

export async function whiteBackground(file: Blob, onProgress?: (p: BgProgress) => void): Promise<File> {
  // Import dinámico: la librería (y su motor de IA) solo se descarga si se usa.
  const { removeBackground } = await import("@imgly/background-removal");

  const input = await shrinkImage(file, WORK_SIDE);
  const cutout = await removeBackground(input, {
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (!onProgress || !total) return;
      const phase = key.startsWith("fetch") ? "download" : "process";
      onProgress({ phase, percent: Math.round((current / total) * 100) });
    },
  });

  const bitmap = await createImageBitmap(cutout);
  const box = opaqueBounds(bitmap);

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // Escala la prenda para que entre con margen y la centra.
  const maxW = OUT_W * (1 - PADDING * 2);
  const maxH = OUT_H * (1 - PADDING * 2);
  const scale = Math.min(maxW / box.w, maxH / box.h);
  const w = box.w * scale;
  const h = box.h * scale;
  ctx.drawImage(bitmap, box.x, box.y, box.w, box.h, (OUT_W - w) / 2, (OUT_H - h) / 2, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.9),
  );
  return new File([blob], "prenda.jpg", { type: "image/jpeg" });
}

// Rectángulo que ocupa la prenda (píxeles no transparentes).
function opaqueBounds(bitmap: ImageBitmap) {
  const c = document.createElement("canvas");
  c.width = bitmap.width;
  c.height = bitmap.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Nada detectado: usar la imagen completa.
  if (maxX < 0) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
