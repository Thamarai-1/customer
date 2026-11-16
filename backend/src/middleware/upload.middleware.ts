import multer from 'multer';
import { Request } from 'express';

// Secure memory storage prevents arbitrary executable files written to filesystem
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'text/csv',
    'application/json',
    'application/vnd.ms-excel',
    'text/plain'
  ];
  const allowedExtensions = ['.csv', '.json'];

  const originalName = file.originalname.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => originalName.endsWith(ext));

  if (hasValidExtension || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Only CSV and JSON files are supported.'));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB upload limit
  },
  fileFilter
});
