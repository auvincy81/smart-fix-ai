import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentShopContext } from "@/lib/auth/session";
import { workshopDb } from "@/lib/workshop/data";
import { limitedPhotoForm, normalizeInspectionPhoto } from "@/lib/inspections/images";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getCurrentShopContext();
  if (!context.ok) return Response.json({ error: "Sign in to a shop to upload inspection photos." }, { status: context.code === "NOT_AUTHENTICATED" ? 401 : 403 });
  const id = (await params).id;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Inspection not found." }, { status: 404 });
  const db = await workshopDb();
  const inspection = await db.from("inspections").select("id").eq("id", id).eq("shop_id", context.data.shop.id).maybeSingle();
  if (inspection.error) return Response.json({ error: "Inspection is temporarily unavailable." }, { status: 503 });
  if (!inspection.data) return Response.json({ error: "Inspection not found." }, { status: 404 });
  let form: FormData;
  let photo: Buffer;
  try {
    form = await limitedPhotoForm(request);
    const file = form.get("photo");
    if (!(file instanceof File)) throw new Error("Choose an image up to 5 MB.");
    photo = await normalizeInspectionPhoto(file);
  } catch {
    return Response.json({ error: "Choose a valid, single JPEG, PNG, or WebP image up to 5 MB and 40 megapixels." }, { status: 400 });
  }
  const fields = z.object({ itemId: z.union([z.uuid(), z.literal("")]), caption: z.string().trim().max(500) }).safeParse({ itemId: form.get("itemId") ?? "", caption: form.get("caption") ?? "" });
  if (!fields.success) return Response.json({ error: "Choose a checklist item and a caption up to 500 characters." }, { status: 400 });
  if (fields.data.itemId) {
    const item = await db.from("inspection_items").select("id").eq("id", fields.data.itemId).eq("inspection_id", id).maybeSingle();
    if (item.error || !item.data) return Response.json({ error: "That item does not belong to this inspection." }, { status: 400 });
  }
  const key=z.uuid().safeParse(form.get("requestKey")||randomUUID());
  if(!key.success)return Response.json({error:"Reload the photo form before uploading."},{status:400});
  const photoId=key.data;
  const previous=await db.from("inspection_photos").select("id").eq("id",photoId).eq("inspection_id",id).eq("shop_id",context.data.shop.id).maybeSingle();
  if(previous.data)return Response.json({id:previous.data.id},{status:201});
  const path = `${context.data.shop.id}/${id}/${photoId}.jpg`;
  const storage = db.storage.from("inspection-photos");
  const uploaded = await storage.upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (uploaded.error) {
    const retry=await db.from("inspection_photos").select("id").eq("id",photoId).eq("inspection_id",id).eq("shop_id",context.data.shop.id).maybeSingle();
    if(retry.data)return Response.json({id:retry.data.id},{status:201});
    return Response.json({ error: "Photo storage is temporarily unavailable. Try again." }, { status: 503 });
  }
  const saved = await db.from("inspection_photos").insert({ id: photoId, shop_id: context.data.shop.id, inspection_id: id, inspection_item_id: fields.data.itemId || null, storage_path: path, caption: fields.data.caption || null });
  if (saved.error) {
    await storage.remove([path]);
    return Response.json({ error: "Photo details could not be saved. Try again." }, { status: 503 });
  }
  revalidatePath(`/inspections/${id}`);
  return Response.json({ id: photoId }, { status: 201 });
}
