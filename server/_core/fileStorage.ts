/**
 * File Storage Stub
 * Имитирует загрузку файлов (локальное хранилище)
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Создать директорию uploads если её нет
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`[FILE STORAGE] Создана директория: ${UPLOAD_DIR}`);
}

export interface FileUploadResult {
  success: boolean;
  fileId: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Загрузить файл (заглушка)
 * В production используется S3
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<FileUploadResult> {
  const fileId = randomBytes(16).toString('hex');
  const ext = path.extname(originalFilename);
  const filename = `${fileId}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  // Сохранить файл локально
  fs.writeFileSync(filepath, buffer);
  
  const url = `/uploads/${filename}`;
  
  console.log(`[FILE STORAGE] ✅ Файл загружен: ${filename}`);
  console.log(`[FILE STORAGE] Размер: ${buffer.length} байт`);
  console.log(`[FILE STORAGE] MIME: ${mimeType}`);
  
  return {
    success: true,
    fileId,
    filename,
    url,
    size: buffer.length,
    mimeType,
    uploadedAt: new Date(),
  };
}

/**
 * Получить URL файла
 */
export function getFileUrl(fileId: string): string {
  return `/uploads/${fileId}`;
}

/**
 * Удалить файл
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  const filename = `${fileId}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    console.log(`[FILE STORAGE] ✅ Файл удалён: ${filename}`);
    return true;
  }
  
  console.log(`[FILE STORAGE] ⚠️ Файл не найден: ${filename}`);
  return false;
}

/**
 * Получить информацию о файле
 */
export function getFileInfo(fileId: string): FileUploadResult | null {
  const filename = `${fileId}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const stats = fs.statSync(filepath);
  
  return {
    success: true,
    fileId,
    filename,
    url: `/uploads/${filename}`,
    size: stats.size,
    mimeType: 'application/octet-stream',
    uploadedAt: stats.birthtime,
  };
}

/**
 * Очистить все загруженные файлы (для разработки)
 */
export function clearAllUploads(): void {
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.rmSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`[FILE STORAGE] ✅ Все файлы удалены`);
  }
}
