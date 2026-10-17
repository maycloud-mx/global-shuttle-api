export interface UploadImageOptions {
  folder: string;
  publicId?: string;
}

export interface UploadedImage {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}
