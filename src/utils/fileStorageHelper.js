/**
 * Universal File Storage Helper — OFFLINE STANDALONE MODE
 * 
 * Mengonversi seluruh file lampiran menjadi Base64 Data URL
 * yang disimpan langsung di LocalStorage browser tanpa cloud.
 */

/**
 * Converts a file to base64 data URL
 */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file (Local Base64 storage)
 */
export async function uploadUniversalFile({ file }) {
  if (!file) {
    throw new Error('Tidak ada berkas yang dipilih');
  }

  const base64 = await readFileAsBase64(file);
  return {
    success: true,
    url: base64,
    name: file.name,
    storageProvider: 'local'
  };
}
