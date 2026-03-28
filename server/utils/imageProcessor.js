import sharp from 'sharp';

/**
 * Compresses and resizes an image buffer for optimal Gemini API consumption.
 * Reduces token cost by keeping images small while retaining enough detail.
 *
 * @param {Buffer} buffer - Raw image buffer
 * @param {object} options
 * @param {number} options.maxWidth - Max width in px (default 1024)
 * @param {number} options.quality - JPEG quality 1-100 (default 80)
 * @returns {Promise<{ buffer: Buffer, mimeType: string }>}
 */
export async function compressImage(buffer, { maxWidth = 1024, quality = 80 } = {}) {
  const processed = await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality, progressive: true })
    .toBuffer();

  return {
    buffer: processed,
    mimeType: 'image/jpeg',
  };
}

/**
 * Converts an image buffer to base64 for Gemini API inline data
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {{ inlineData: { data: string, mimeType: string } }}
 */
export function toGeminiImagePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}
