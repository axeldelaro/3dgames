import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const outDir = path.resolve('public/icons');
fs.mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function renderOmniversePNG(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const rMax = size * 0.48;

  for (let y = 0; y < size; y++) {
    const rowOff = y * stride;
    raw[rowOff] = 0;
    const ny = (y - cy) / (size * 0.5);
    for (let x = 0; x < size; x++) {
      const nx = (x - cx) / (size * 0.5);
      const dist = Math.hypot(x - cx, y - cy);

      // Rounded squircle mask
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);
      const squircle = Math.pow(ax, 4.2) + Math.pow(ay, 4.2);
      if (squircle > 0.94) {
        const px = rowOff + 1 + x * 4;
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
        continue;
      }

      // Deep space obsidian gradient
      let r = 6 + (1 - ny) * 10;
      let g = 12 + (1 - ny) * 18;
      let b = 24 + (1 - ny) * 32;

      // Atmospheric horizon glow
      const horizon = Math.exp(-Math.pow((ny + 0.08) * 4.5, 2));
      r += horizon * 18;
      g += horizon * 95;
      b += horizon * 145;

      // Central planet sphere with directional lighting
      const pr = 0.46;
      const pDist2 = nx * nx + ny * ny;
      if (pDist2 < pr * pr) {
        const pz = Math.sqrt(pr * pr - pDist2);
        const lx = -0.55;
        const ly = -0.58;
        const lz = 0.6;
        const ndotl = Math.max(0, (nx * lx + ny * ly + pz * lz) / pr);
        const rim = Math.pow(1 - pz / pr, 2.6);
        const latBands = 0.5 + 0.5 * Math.sin(ny * 26 + nx * 6);
        r = 14 + ndotl * (38 + latBands * 28) + rim * 40;
        g = 34 + ndotl * (135 + latBands * 45) + rim * 185;
        b = 62 + ndotl * (195 + latBands * 30) + rim * 235;
      }

      // Orbital ring (tilted ellipse)
      const rx = nx * 0.94 - ny * 0.34;
      const ry = (nx * 0.34 + ny * 0.94) * 2.85;
      const ringR = Math.hypot(rx, ry);
      if (ringR > 0.54 && ringR < 0.76) {
        const behindPlanet = pDist2 < pr * pr && ry < 0;
        if (!behindPlanet) {
          const band = 1 - Math.abs(ringR - 0.65) / 0.11;
          const glow = Math.pow(Math.max(0, band), 1.5);
          r += glow * 235;
          g += glow * 178;
          b += glow * 72;
        }
      }

      // Outer cyber border glow
      if (dist > rMax * 0.88) {
        const edge = Math.max(0, 1 - Math.abs(squircle - 0.88) * 14);
        r += edge * 35;
        g += edge * 165;
        b += edge * 210;
      }

      const px = rowOff + 1 + x * 4;
      raw[px] = Math.min(255, Math.max(0, Math.round(r)));
      raw[px + 1] = Math.min(255, Math.max(0, Math.round(g)));
      raw[px + 2] = Math.min(255, Math.max(0, Math.round(b)));
      raw[px + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), renderOmniversePNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), renderOmniversePNG(512));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="bg" cx="35%" cy="28%" r="75%">
      <stop offset="0%" stop-color="#112945"/>
      <stop offset="60%" stop-color="#07111f"/>
      <stop offset="100%" stop-color="#03070e"/>
    </radialGradient>
    <radialGradient id="planet" cx="34%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#6ef2ff"/>
      <stop offset="45%" stop-color="#1785b8"/>
      <stop offset="85%" stop-color="#0b2d4d"/>
      <stop offset="100%" stop-color="#2ad5ff"/>
    </radialGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffcf6e"/>
      <stop offset="50%" stop-color="#38e8ff"/>
      <stop offset="100%" stop-color="#ff9d42"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="240" height="240" rx="52" fill="url(#bg)" stroke="#29d8ff" stroke-opacity="0.45" stroke-width="4"/>
  <circle cx="128" cy="128" r="62" fill="url(#planet)"/>
  <ellipse cx="128" cy="132" rx="98" ry="30" transform="rotate(-18 128 128)" fill="none" stroke="url(#ring)" stroke-width="10" stroke-linecap="round"/>
</svg>`;
fs.writeFileSync(path.join(outDir, 'favicon.svg'), svg, 'utf8');
console.log('Generated public/icons/icon-192.png, icon-512.png, and favicon.svg');
