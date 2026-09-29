import { getDb } from "@/lib/admin/mongo";
import { destroyImage, uploadImage } from "@/lib/admin/cloudinary";

export interface MediaAsset{id:string;publicId:string;src:string;filename:string;mime:string;width:number;height:number;size:number;alt:string;credit:string;state:"ready"|"processing"|"failed";archived:boolean;createdAt:string;}

type MediaDoc = Omit<MediaAsset, "id"> & { _id: string };

const map = ({ _id, ...rest }: MediaDoc): MediaAsset => ({ id: _id, ...rest });

async function collection() {
  return (await getDb()).collection<MediaDoc>("media");
}

export async function listMedia(): Promise<MediaAsset[]> {
  return (await (await collection()).find().sort({ createdAt: -1 }).toArray()).map(map);
}

/** Soft delete: the asset stays in Cloudinary so it can be restored. */
export async function archiveMedia(id: string) {
  await (await collection()).updateOne({ _id: id }, { $set: { archived: true } });
  return listMedia();
}

/** Hard delete: removes the asset from Cloudinary too, freeing storage credits. */
export async function deleteMedia(id: string) {
  const col = await collection();
  const doc = await col.findOne({ _id: id });
  if (doc?.publicId) await destroyImage(doc.publicId);
  await col.deleteOne({ _id: id });
  return listMedia();
}

/**
 * Uploads to Cloudinary and records it in Mongo in the one request, so the
 * image is live on the public site immediately — no rebuild, which is the
 * defect this replaces (files written to public/ are only served if they
 * existed when `next build` ran).
 */
export async function saveUpload(file: File, bytes: Uint8Array, alt: string, credit: string) {
  const uploaded = await uploadImage(bytes);
  const id = `upload-${crypto.randomUUID()}`;
  try {
    await (await collection()).insertOne({
      _id: id, publicId: uploaded.publicId, src: uploaded.src, filename: file.name,
      mime: file.type, width: uploaded.width, height: uploaded.height, size: uploaded.bytes,
      alt, credit, state: "ready", archived: false, createdAt: new Date().toISOString(),
    });
  } catch (error) {
    // Roll the upload back, or a failed insert would strand a paid-for asset
    // in Cloudinary that nothing references.
    await destroyImage(uploaded.publicId).catch(() => {});
    throw error;
  }
  return (await listMedia()).find((item) => item.id === id);
}
