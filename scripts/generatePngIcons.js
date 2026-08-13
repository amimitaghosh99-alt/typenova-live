import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

// CRC32 calculation table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, crcPayload, crcBuf]);
}

function createPng(width, height, drawFn) {
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    createChunk('IHDR', ihdr),
    createChunk('IDAT', deflated),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

// Draw the 3D Supernova Keycap
function drawKeycap(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded squircle (r=0.22)
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const dist = Math.pow(Math.abs(cx), 4) + Math.pow(Math.abs(cy), 4);
  if (dist > 0.055) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Base background fill (deep obsidian)
  let r = 11, g = 19, b = 41, a = 255;

  // Distance from center for glowing supernova aura
  const dCenter = Math.sqrt(Math.pow(nx - 0.5, 2) + Math.pow(ny - 0.48, 2));
  if (dCenter < 0.35) {
    const glow = Math.pow(1 - dCenter / 0.35, 2);
    r = Math.min(255, r + 0 * glow);
    g = Math.min(255, g + 240 * glow * 0.4);
    b = Math.min(255, b + 255 * glow * 0.5);
  }

  // Isometric Top diamond: (0.5, 0.16) to (0.86, 0.38) to (0.5, 0.60) to (0.14, 0.38)
  const isInsideDiamond = (px, py, x0, y0, x1, y1, x2, y2, x3, y3) => {
    function sign(p1x, p1y, p2x, p2y, p3x, p3y) {
      return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
    }
    const d1 = sign(px, py, x0, y0, x1, y1);
    const d2 = sign(px, py, x1, y1, x2, y2);
    const d3 = sign(px, py, x2, y2, x3, y3);
    const d4 = sign(px, py, x3, y3, x0, y0);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0) || (d4 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0) || (d4 > 0);
    return !(hasNeg && hasPos);
  };

  // Left bevel
  const inLeftBevel = isInsideDiamond(nx, ny, 0.14, 0.38, 0.5, 0.60, 0.5, 0.88, 0.14, 0.66);
  if (inLeftBevel) {
    r = 15; g = 23; b = 42;
  }

  // Right bevel
  const inRightBevel = isInsideDiamond(nx, ny, 0.5, 0.60, 0.86, 0.38, 0.86, 0.66, 0.5, 0.88);
  if (inRightBevel) {
    r = 6; g = 10; b = 20;
  }

  // Top face
  const inTop = isInsideDiamond(nx, ny, 0.5, 0.16, 0.86, 0.38, 0.5, 0.60, 0.14, 0.38);
  if (inTop) {
    r = 20; g = 30; b = 55;
  }

  // Cyan Neon Stroke on Top Face edges
  const distToDiamondEdge = Math.abs(Math.abs(nx - 0.5) / 0.36 + Math.abs(ny - 0.38) / 0.22 - 1.0);
  if (distToDiamondEdge < 0.04) {
    r = 0; g = 240; b = 255;
  } else if (distToDiamondEdge < 0.07) {
    const blend = (0.07 - distToDiamondEdge) / 0.03;
    r = Math.round(r * (1 - blend) + 0 * blend);
    g = Math.round(g * (1 - blend) + 240 * blend);
    b = Math.round(b * (1 - blend) + 255 * blend);
  }

  // Front edge highlight
  if (Math.abs(ny - (0.60 - Math.abs(nx - 0.5) * (0.22 / 0.36))) < 0.02 && nx >= 0.14 && nx <= 0.86) {
    r = 255; g = 255; b = 255;
  }

  // Supernova Starburst Center Core (Center at 0.5, 0.38)
  const sx = Math.abs(nx - 0.5);
  const sy = Math.abs(ny - 0.38);
  const starCross = (sx < 0.025 && sy < 0.14) || (sy < 0.025 && sx < 0.14);
  const starDiamond = (sx + sy < 0.06);

  if (starDiamond) {
    r = 255; g = 255; b = 255;
  } else if (starCross) {
    r = 125; g = 244; b = 255;
  }

  return [r, g, b, a];
}

// Generate PNG buffers
console.log('Generating PNG and ICO icons...');
const png64 = createPng(64, 64, drawKeycap);
const png192 = createPng(192, 192, drawKeycap);
const png512 = createPng(512, 512, drawKeycap);

fs.writeFileSync(path.join(publicDir, 'favicon.png'), png64);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

// Generate valid ICO format wrapping the 64x64 PNG
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 Image

const icoDirEntry = Buffer.alloc(16);
icoDirEntry.writeUInt8(64, 0);   // Width 64
icoDirEntry.writeUInt8(64, 1);   // Height 64
icoDirEntry.writeUInt8(0, 2);    // Colors 0 (no palette)
icoDirEntry.writeUInt8(0, 3);    // Reserved
icoDirEntry.writeUInt16LE(1, 4);  // Color planes
icoDirEntry.writeUInt16LE(32, 6); // 32 bpp
icoDirEntry.writeUInt32LE(png64.length, 8); // Image data length
icoDirEntry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, icoDirEntry, png64]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoFile);

console.log('Icons generated successfully: favicon.ico, favicon.png, apple-touch-icon.png, icon-192.png, icon-512.png');
