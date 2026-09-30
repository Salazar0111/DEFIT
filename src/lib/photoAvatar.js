import { supabase } from "./supabase";

const SIZE = 384;

// Recorta al centro en cuadrado, reduce a 384 px y devuelve un JPEG liviano.
export function photoToSquareBlob(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto."))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la foto.")); };
    img.src = url;
  });
}

// Sube la foto a la carpeta de la persona, borra las anteriores y devuelve la URL pública.
export async function uploadAvatar(userId, file) {
  const blob = await photoToSquareBlob(file);
  if (userId === "demo") return URL.createObjectURL(blob);
  const path = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error("No se pudo subir la foto. Revisa tu conexión.");
  const { data: old } = await supabase.storage.from("avatars").list(userId);
  const stale = (old || []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (stale.length) await supabase.storage.from("avatars").remove(stale);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
