import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CloudinaryConfig } from '../config/cloudinary.config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private cloudinaryConfig: CloudinaryConfig) {
    // Khởi tạo cloudinary config
    this.cloudinaryConfig.getInstance();
  }

  // ─── Upload 1 ảnh ─────────────────────────────────────
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Không có file được gửi lên');
    }

    // Kiểm tra loại file
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)');
    }

    // Kiểm tra kích thước file (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File ảnh không được vượt quá 5MB');
    }

    try {
      const result = await this.uploadStream(file.buffer, { folder });
      this.logger.log(`✅ Image uploaded: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      this.logger.error('❌ Upload failed', error);
      throw new BadRequestException('Upload ảnh thất bại');
    }
  }

  // ─── Upload nhiều ảnh ─────────────────────────────────
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được gửi lên');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  // ─── Xóa ảnh theo publicId ────────────────────────────
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`✅ Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`❌ Delete failed for ${publicId}`, error);
      throw new BadRequestException('Xóa ảnh thất bại');
    }
  }

  // ─── Helper: upload từ buffer (base64) ───────────────
  private uploadStream(
    buffer: Buffer,
    options: object,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      cloudinary.uploader.upload(base64, options, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }
}
