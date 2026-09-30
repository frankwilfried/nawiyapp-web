/**
 * Réduit une photo avant envoi (côté 1600 px max, JPEG 85 %) : les photos de téléphone
 * font souvent 3 à 8 Mo, trop lourd pour la limite serveur et coûteux en données mobiles.
 * Les PDF et les petites images sont envoyés tels quels.
 */
export async function compressImage(file, { maxSide = 1600, quality = 0.85, skipBelow = 600 * 1024 } = {}) {
  if (!file.type.startsWith('image/') || file.size <= skipBelow || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file; // format que le navigateur ne sait pas décoder (HEIC…) : le serveur tranchera
  }
}
