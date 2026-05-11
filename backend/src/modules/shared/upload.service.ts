import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import config from '../../config/env.js';
import { Request } from 'express';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const uploadService = {
  async uploadFile(
    file: Express.Multer.File,
    subfolder: string = ''
  ): Promise<{ url: string; key: string }> {
    await ensureUploadDir();

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    const subfolderPath = subfolder ? path.join(UPLOAD_DIR, subfolder) : UPLOAD_DIR;

    // Ensure subfolder exists
    if (subfolder) {
      await fs.mkdir(subfolderPath, { recursive: true });
    }

    const filePath = path.join(subfolderPath, filename);
    await fs.writeFile(filePath, file.buffer);

    const key = subfolder ? `${subfolder}/${filename}` : filename;
    const url = `/uploads/${key}`;

    return { url, key };
  },

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  },

  getFilePath(key: string): string {
    return path.join(UPLOAD_DIR, key);
  },

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  },
};

export default uploadService;
