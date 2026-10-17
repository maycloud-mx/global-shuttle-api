import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  v2 as cloudinary,
  type UploadApiErrorResponse,
  type UploadApiResponse,
} from 'cloudinary';
import { loadEnvironment } from '../config/environment.js';
import type { UploadedImage, UploadImageOptions } from './media.types.js';

const CLOUDINARY_IDENTIFIER_PATTERN = /^[A-Za-z0-9/_-]+$/;

@Injectable()
export class MediaService {
  constructor() {
    const config = loadEnvironment();

    cloudinary.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(
    buffer: Buffer,
    options: UploadImageOptions,
  ): Promise<UploadedImage> {
    if (buffer.length === 0) {
      throw new BadRequestException('Image file cannot be empty');
    }

    this.validateIdentifier(options.folder, 'folder');
    if (options.publicId) {
      this.validateIdentifier(options.publicId, 'publicId');
    }

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder,
            public_id: options.publicId,
            resource_type: 'image',
            overwrite: false,
          },
          (
            error: UploadApiErrorResponse | undefined,
            response: UploadApiResponse | undefined,
          ) => {
            if (error) {
              reject(error);
              return;
            }

            if (!response) {
              reject(new Error('Cloudinary returned an empty upload response'));
              return;
            }

            resolve(response);
          },
        );

        uploadStream.end(buffer);
      });

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch {
      throw new BadGatewayException('Image could not be uploaded');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    this.validateIdentifier(publicId, 'publicId');

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });
    } catch {
      throw new BadGatewayException('Image could not be deleted');
    }
  }

  private validateIdentifier(value: string, field: string): void {
    if (!value.trim() || !CLOUDINARY_IDENTIFIER_PATTERN.test(value)) {
      throw new BadRequestException(`Invalid Cloudinary ${field}`);
    }
  }
}
