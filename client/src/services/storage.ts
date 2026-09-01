import { supabase } from "../lib/supabase";

export async function uploadMediaAsset(file: File, bucket = "Uploads"): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `carousel/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function compressAvatarImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 256; // High DPI crisp 256x256 avatar
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failure'));
          return;
        }

        // Center square crop
        const minEdge = Math.min(img.width, img.height);
        const startX = (img.width - minEdge) / 2;
        const startY = (img.height - minEdge) / 2;

        ctx.drawImage(img, startX, startY, minEdge, minEdge, 0, 0, targetSize, targetSize);

        // Convert to WebP (fallback to JPEG) at 80% quality (~20KB)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image compression error'));
          },
          'image/webp',
          0.82
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Uploads compressed avatar directly to Supabase bucket.
 */
export async function uploadCompressedAvatar(file: File, userId: string): Promise<string> {
  const compressedBlob = await compressAvatarImage(file);
  const fileName = `avatars/${userId}_${Date.now()}.webp`;

  const { data, error } = await supabase.storage
    .from('media-assets')
    .upload(fileName, compressedBlob, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('media-assets')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}