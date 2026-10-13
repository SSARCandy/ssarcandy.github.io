'use strict';

// Shared LQIP (low-quality image placeholder) encoder for the build helpers:
// build_images.js (local images under source/img) and fetch_flickr_photos.js
// (the /photography Flickr thumbnails).
//
// sharp is optional: if its native binary is unavailable on this platform the
// placeholders are simply empty (images still get their reserved box) rather than
// failing the build.
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp not available; LQIP placeholders will be empty.');
}

// A ~24px, pre-blurred JPEG of the image as a base64 data URI (~400 bytes).
// Upscaled by the browser when shown, so it stays soft without a CSS filter.
async function buildLqip(buffer) {
  if (!sharp) return '';
  try {
    const buf = await sharp(buffer) // first frame for GIFs
      .resize(24, null, { fit: 'inside' })
      .blur(2)
      .jpeg({ quality: 40 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (e) {
    console.warn(`LQIP generation failed: ${e.message}`);
    return '';
  }
}

module.exports = { buildLqip };
