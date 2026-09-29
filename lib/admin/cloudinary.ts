import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export interface UploadedImage { publicId: string; src: string; width: number; height: number; format: string; bytes: number }

/**
 * Cap the long edge and let Cloudinary pick the quality once, on ingest, so the
 * stored asset is also the delivered asset. Everything downstream then uses a
 * single canonical URL per image and `next/image` does the responsive resizing.
 *
 * This is deliberate: a per-request transformation (e.g. a Cloudinary loader for
 * next/image) bills a separate transformation for every width x format and is
 * how the 25-credit free tier gets exhausted — at which point Cloudinary stops
 * delivering and the site loses its images.
 */
const INGEST = [{ width: 2560, height: 2560, crop: "limit", quality: "auto:good" }];

export async function uploadImage(bytes: Uint8Array, options: { folder?: string; publicId?: string; overwrite?: boolean } = {}): Promise<UploadedImage> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: options.publicId ? undefined : (options.folder ?? "radesign/uploads"),
      public_id: options.publicId,
      overwrite: options.overwrite ?? false,
      resource_type: "image",
      transformation: INGEST,
    }, (error, response) => {
      if (error || !response) reject(error ?? new Error("Cloudinary upload returned no response."));
      else resolve(response);
    });
    stream.end(Buffer.from(bytes));
  });
  return { publicId: result.public_id, src: result.secure_url, width: result.width, height: result.height, format: result.format, bytes: result.bytes };
}

export async function destroyImage(publicId: string) {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
