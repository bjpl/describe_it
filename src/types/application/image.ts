/**
 * Image processing types
 */

export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'svg' | 'bmp' | 'tiff';

/**
 * Image processing types
 */
export interface ImageData {
  id: string;
  url: string;
  alt_text?: string;
  width: number;
  height: number;
  format: ImageFormat;
  size_bytes: number;
  metadata: ImageMetadata;
}

export interface ImageMetadata {
  captured_at?: string;
  camera_model?: string;
  photographer?: string;
  location?: ImageLocation;
  tags: string[];
  color_palette: ColorInfo[];
  dominant_colors: string[];
  brightness: number;
  contrast: number;
  quality_score: number;
}

export interface ImageLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  country?: string;
  city?: string;
}

export interface ColorInfo {
  hex: string;
  rgb: [number, number, number];
  hsl: [number, number, number];
  percentage: number;
}
