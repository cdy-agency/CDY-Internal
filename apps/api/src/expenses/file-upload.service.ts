import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;

export interface UploadResult {
  url: string;
  path: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    // TODO: migrate to S3/R2 for production file storage
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ??
      join(process.cwd(), 'uploads');
    const receiptsDir = join(this.uploadDir, 'receipts');
    if (!existsSync(receiptsDir)) {
      mkdirSync(receiptsDir, { recursive: true });
    }
  }

  upload(file: Express.Multer.File): UploadResult {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, PDF',
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    const filename = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = join(this.uploadDir, 'receipts', filename);
    writeFileSync(filePath, file.buffer);

    this.logger.debug(`Uploaded receipt: ${filename}`);

    return {
      url: `/uploads/receipts/${filename}`,
      path: filePath,
    };
  }
}
