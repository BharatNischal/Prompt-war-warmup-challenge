import { describe, it, expect } from 'vitest';
import { compressImage, toGeminiImagePart } from '../../server/utils/imageProcessor.js';
import sharp from 'sharp';

describe('Image Processor', () => {
  describe('compressImage', () => {
    it('compresses a PNG buffer to JPEG', async () => {
      // Create a simple 100x100 red PNG
      const testImage = await sharp({
        create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
      })
        .png()
        .toBuffer();

      const result = await compressImage(testImage);
      expect(result.mimeType).toBe('image/jpeg');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(0);
    });

    it('respects maxWidth option for large images', async () => {
      const largeImage = await sharp({
        create: { width: 2048, height: 1024, channels: 3, background: { r: 0, g: 128, b: 0 } },
      })
        .png()
        .toBuffer();

      const result = await compressImage(largeImage, { maxWidth: 512 });
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBeLessThanOrEqual(512);
    });

    it('does not enlarge small images', async () => {
      const smallImage = await sharp({
        create: { width: 200, height: 150, channels: 3, background: { r: 0, g: 0, b: 255 } },
      })
        .png()
        .toBuffer();

      const result = await compressImage(smallImage, { maxWidth: 1024 });
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(200);
    });

    it('applies quality setting', async () => {
      const testImage = await sharp({
        create: { width: 500, height: 500, channels: 3, background: { r: 128, g: 128, b: 128 } },
      })
        .png()
        .toBuffer();

      const highQ = await compressImage(testImage, { quality: 95 });
      const lowQ = await compressImage(testImage, { quality: 20 });
      expect(lowQ.buffer.length).toBeLessThanOrEqual(highQ.buffer.length);
    });
  });

  describe('toGeminiImagePart', () => {
    it('converts buffer to Gemini inline data format', () => {
      const buf = Buffer.from('test-image-data');
      const result = toGeminiImagePart(buf, 'image/jpeg');

      expect(result).toHaveProperty('inlineData');
      expect(result.inlineData.mimeType).toBe('image/jpeg');
      expect(result.inlineData.data).toBe(buf.toString('base64'));
    });

    it('handles PNG mime type', () => {
      const buf = Buffer.from('png-data');
      const result = toGeminiImagePart(buf, 'image/png');
      expect(result.inlineData.mimeType).toBe('image/png');
    });

    it('returns valid base64 string', () => {
      const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JFIF header bytes
      const result = toGeminiImagePart(buf, 'image/jpeg');
      expect(() => Buffer.from(result.inlineData.data, 'base64')).not.toThrow();
    });
  });
});
