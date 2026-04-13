// Pure Node.js PNG generator — no native modules needed
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 for PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, crcData, crcBuf]);
}

function inRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  const corners = [
    [x + r, y + r], [x + w - r, y + r],
    [x + r, y + h - r], [x + w - r, y + h - r],
  ];
  for (const [cx, cy] of corners) {
    if (px >= cx - r && px <= cx + r && py >= cy - r && py <= cy + r) {
      if ((px - cx) ** 2 + (py - cy) ** 2 > r * r) return false;
    }
  }
  return true;
}

function getPixel(x, y, s) {
  const bg      = [30, 43, 36];
  const primary = [64, 138, 113];
  const light   = [93, 184, 138];

  const cx = s / 2, cy = s / 2;
  const dx = x - cx, dy = y - cy;

  const margin = s * 0.04;
  const rad    = s * 0.18;
  const thick  = s * 0.025;

  const outerOk = inRoundedRect(x, y, margin, margin, s - margin*2, s - margin*2, rad);
  const innerOk = inRoundedRect(x, y, margin+thick, margin+thick, s-(margin+thick)*2, s-(margin+thick)*2, rad-thick);

  if (!outerOk) return bg;
  if (!innerOk) return primary; // border ring

  // Bell dimensions
  const br   = s * 0.22;
  const bcy  = cy - s * 0.03;
  const relY = y - bcy;

  // Top arc
  const distArc = Math.sqrt(dx*dx + (y-(bcy-br*0.15))*(y-(bcy-br*0.15)));
  const inArc = distArc < br*0.55 && y < bcy + br*0.15;

  // Body
  const halfW  = br*0.5 + relY*0.5;
  const inBody = relY >= -br*0.15 && relY <= br*0.5 && Math.abs(dx) < halfW;

  // Bottom bar
  const inBar = relY > br*0.5 && relY < br*0.65 && Math.abs(dx) < br*0.75;

  // Clapper
  const inClapper = Math.sqrt(dx*dx + (relY-br*0.82)**2) < br*0.18;

  // Stem
  const inStem = relY > -br*0.85 && relY < -br*0.6 && Math.abs(dx) < br*0.12;

  if (inArc || inBody || inBar || inClapper || inStem) return light;
  return bg;
}

function createPNG(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y, size);
      row[1 + x*3]   = r;
      row[1 + x*3+1] = g;
      row[1 + x*3+2] = b;
    }
    rows.push(row);
  }

  const raw        = Buffer.concat(rows);
  const compressed = zlib.deflateSync(raw, { level: 6 });
  const sig        = Buffer.from([137,80,78,71,13,10,26,10]);

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const publicDir = path.join(__dirname, 'public');

[192, 512].forEach(size => {
  const buf  = createPNG(size);
  const file = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`✓ icon-${size}.png  (${buf.length} bytes)`);
});
