/**
 * Google Drive Service Utility — OFFLINE STANDALONE MODE
 * 
 * Seluruh sambungan ke Google Drive & Google Apps Script dinonaktifkan.
 * File lampiran disimpan secara lokal sebagai Base64 Data URL.
 */

const STORAGE_KEY_GDRIVE_CONFIG = 'st_gdrive_config';

/**
 * Retrieves the current Google Drive configuration (Always Disabled)
 */
export function getGoogleDriveConfig() {
  return {
    enabled: false,
    webAppUrl: '',
    rootFolder: '',
    autoMigrate: false
  };
}

/**
 * Saves Google Drive configuration (Always Disabled)
 */
export function saveGoogleDriveConfig(config) {
  try {
    const disabledConfig = {
      enabled: false,
      webAppUrl: '',
      rootFolder: '',
      autoMigrate: false
    };
    localStorage.setItem(STORAGE_KEY_GDRIVE_CONFIG, JSON.stringify(disabledConfig));
    return disabledConfig;
  } catch (e) {
    return null;
  }
}

/**
 * Converts a File object into a Base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Format berkas tidak didukung'));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Tests connection to the Google Apps Script Web App (Disabled)
 */
export function testGoogleDriveConnection() {
  return Promise.resolve({
    success: false,
    message: 'Google Drive dinonaktifkan (Project berjalan dalam Mode Lokal Penuh)'
  });
}

/**
 * Uploads a file directly to Google Drive (Disabled - returns local Base64)
 */
export async function uploadToGoogleDrive({ file }) {
  if (!file) {
    throw new Error('Tidak ada berkas yang dipilih');
  }
  const base64 = await fileToBase64(file);
  return {
    success: true,
    fileId: `local_${Date.now()}`,
    name: file.name,
    url: base64,
    viewUrl: base64,
    downloadUrl: base64,
    storageProvider: 'local'
  };
}

/**
 * Deletes a file from Google Drive (Safe No-op)
 */
export async function deleteFromGoogleDrive() {
  return { success: true, message: 'Mode lokal' };
}

/**
 * Checks if a given URL string points to Google Drive
 */
export function isGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('drive.google.com') || url.includes('googleusercontent.com/d/') || url.includes('google.com/macros');
}

/**
 * Extracts Google Drive file ID from a URL
 */
export function extractGDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}
