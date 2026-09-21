import sharp from "sharp";

export const photoLimit = 5 * 1024 * 1024;
export async function normalizeInspectionPhoto(file: File): Promise<Buffer> {
  if (!file.size || file.size > photoLimit) throw new Error("Choose an image up to 5 MB.");
  // Decode actual bytes; neither the extension nor supplied MIME type authorizes a format.
  const bytes = Buffer.from(await file.arrayBuffer());
  const decoder = sharp(bytes, { limitInputPixels: 40000000, failOn: "warning" });
  const metadata = await decoder.metadata();
  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) > 1) throw new Error("Use a single JPEG, PNG, or WebP image.");
  // Orientation is applied, metadata stripped, and content re-encoded as a bounded JPEG.
  const result = await decoder.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
  if (result.length > photoLimit) throw new Error("This photo is too large after processing. Choose a smaller image.");
  return result;
}
export async function limitedPhotoForm(request: Request) {
  const maxBody = photoLimit + 256 * 1024;
  if (Number(request.headers.get("content-length")) > maxBody || !request.body) throw new Error("Upload one photo up to 5 MB.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBody) { await reader.cancel(); throw new Error("Upload one photo up to 5 MB."); }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
}
