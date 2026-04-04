import { writeFileSync } from 'fs';

function generateSvgIcon(size) {
  const r = Math.round(size * 0.15);
  const fontSize = Math.round(size * 0.4);
  const dotR = Math.round(size * 0.06);
  const dotCx = Math.round(size * 0.72);
  const dotCy = Math.round(size * 0.28);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size/2 + fontSize*0.12}" font-family="system-ui,sans-serif" font-weight="800" font-size="${fontSize}" fill="#4F8CFF" text-anchor="middle" dominant-baseline="central">S</text>
  <circle cx="${dotCx}" cy="${dotCy}" r="${dotR}" fill="#10b981"/>
</svg>`;
}

writeFileSync('public/icon-192.svg', generateSvgIcon(192));
writeFileSync('public/icon-512.svg', generateSvgIcon(512));

console.log('SVG icons generated: icon-192.svg, icon-512.svg');
