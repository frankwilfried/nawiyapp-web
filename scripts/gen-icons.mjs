// Génère les icônes PWA 192x192 et 512x512 sans dépendance externe
// Utilise des PNGs encodés manuellement (format minimal valide)

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, '../public/icons');
mkdirSync(OUT, { recursive: true });

// Crée un PNG minimal d'une couleur unie avec un cercle au centre
// On utilise le format PNG brut (zlib deflate simplifié)
function createPNG(size, bgHex, fgHex) {
  // Convertit hex en RGB
  const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [bgR, bgG, bgB] = hex2rgb(bgHex);
  const [fgR, fgG, fgB] = hex2rgb(fgHex);

  // Construit les données image (RGBA)
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const inCircle = Math.sqrt(dx*dx + dy*dy) < r;
      // Lettre N au centre (simple rectangle)
      const nx = cx - size*0.1, ny = cy - size*0.18, nw = size*0.2, nh = size*0.36;
      if (inCircle) {
        row.push(fgR, fgG, fgB, 255);
      } else {
        row.push(bgR, bgG, bgB, 255);
      }
    }
    rows.push(row);
  }

  // Encode PNG via zlib (utilise pako-like via Buffer)
  // Méthode : utiliser le module zlib natif Node.js
  return { rows, size };
}

// Utilise sharp si dispo, sinon génère via SVG + Inkscape/rsvg — fallback: écrit le SVG
// On génère directement un SVG qu'on peut utiliser comme icône maskable
function writeSVG(size, path) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0F3528"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.38}" fill="#1D9E75"/>
  <text x="${size/2}" y="${size/2 + size*0.13}"
    font-family="Arial,sans-serif" font-weight="bold"
    font-size="${size*0.32}" fill="white" text-anchor="middle">N</text>
</svg>`;
  writeFileSync(path, svg, 'utf8');
  console.log('✓ SVG écrit :', path);
}

writeSVG(192, join(OUT, 'icon-192.svg'));
writeSVG(512, join(OUT, 'icon-512.svg'));

// Génère aussi le PNG via encode-PNG natif Node
import { deflateSync } from 'zlib';

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (~crc) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crcBuf = Buffer.concat([t, d]);
  return Buffer.concat([uint32BE(d.length), t, d, uint32BE(crc32(crcBuf))]);
}

function makePNG(size, bgHex, fgHex, dotColor) {
  const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [bgR, bgG, bgB] = hex2rgb(bgHex);
  const [fgR, fgG, fgB] = hex2rgb(fgHex);
  const [dR, dG, dB]    = hex2rgb(dotColor);

  const cx = size / 2, cy = size / 2, r = size * 0.38;
  // Lettre N : deux barres verticales + diagonale
  const nW = size * 0.07; // largeur barre
  const nH = size * 0.36; // hauteur lettre
  const nL = cx - size * 0.1; // barre gauche x
  const nR = cx + size * 0.03; // barre droite x
  const nT = cy - nH / 2;

  function isN(x, y) {
    // Barre gauche
    if (x >= nL && x <= nL + nW && y >= nT && y <= nT + nH) return true;
    // Barre droite
    if (x >= nR && x <= nR + nW && y >= nT && y <= nT + nH) return true;
    // Diagonale (de haut-gauche à bas-droit)
    const t = (y - nT) / nH;
    const diagX = nL + nW/2 + t * (nR - nL);
    if (Math.abs(x - diagX) < nW * 0.8) return true;
    return false;
  }

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      if (Math.sqrt(dx*dx + dy*dy) < r) {
        if (isN(x, y)) { raw.push(dR, dG, dB, 255); }
        else            { raw.push(fgR, fgG, fgB, 255); }
      } else {
        raw.push(bgR, bgG, bgB, 255);
      }
    }
  }

  const compressed = deflateSync(Buffer.from(raw));
  const ihdr = Buffer.concat([uint32BE(size), uint32BE(size), Buffer.from([8, 6, 0, 0, 0])]);
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const png = makePNG(size, '#0F3528', '#1D9E75', '#FFFFFF');
  const path = join(OUT, `icon-${size}.png`);
  writeFileSync(path, png);
  console.log(`✓ PNG ${size}×${size} écrit :`, path);
}
