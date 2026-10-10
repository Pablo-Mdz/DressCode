// Redimensiona y comprime en el teléfono antes de subir:
import { translate } from "./i18n";

// fotos más livianas = subidas rápidas, menos espacio en Supabase y menos costo de IA.

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toJpeg(source: ImageBitmap | HTMLImageElement, maxSide: number, quality: number): Promise<Blob> {
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(translate("garment.imageError")))), "image/jpeg", quality),
  );
}

export async function prepareImages(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await loadBitmap(file);
  const [full, thumb] = await Promise.all([toJpeg(bitmap, 1400, 0.85), toJpeg(bitmap, 512, 0.8)]);
  if ("close" in bitmap) bitmap.close();
  return { full, thumb };
}
