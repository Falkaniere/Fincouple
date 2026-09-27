import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

// Marca: duas metades de um coração formando um gráfico de barras crescente --
// "as contas de vocês dois". Desenhado em SVG para sair nítido em qualquer tamanho.
const BRAND = '#0d9488';
const BRAND_DARK = '#0f766e';
const LIGHT = '#5eead4';

/**
 * @param size lado do quadrado
 * @param pad fração de respiro em volta (maskable precisa de ~20%)
 * @param bg cor do fundo
 */
function svg({ size, pad, rounded }) {
  const inner = size * (1 - pad * 2);
  const o = size * pad;
  // Grade de 100x100 dentro da área segura.
  const u = inner / 100;
  const x = (n) => (o + n * u).toFixed(2);
  const y = (n) => (o + n * u).toFixed(2);

  const bars = [
    { cx: 22, h: 30, fill: LIGHT },
    { cx: 50, h: 52, fill: '#ffffff' },
    { cx: 78, h: 72, fill: '#ffffff' },
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BRAND}"/>
      <stop offset="1" stop-color="${BRAND_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" ${rounded ? `rx="${size * 0.22}"` : ''} fill="url(#g)"/>
  ${bars
    .map((b) => {
      const w = 16 * u;
      const bx = x(b.cx) - w / 2;
      const by = y(100 - b.h);
      const bh = b.h * u;
      return `<rect x="${bx.toFixed(2)}" y="${by}" width="${w.toFixed(2)}" height="${bh.toFixed(2)}" rx="${(w / 2).toFixed(2)}" fill="${b.fill}" opacity="${b.fill === '#ffffff' ? 0.95 : 0.8}"/>`;
    })
    .join('\n  ')}
  <path d="M ${x(50)} ${y(40)}
           c ${(-6 * u).toFixed(2)} ${(-9 * u).toFixed(2)} ${(-21 * u).toFixed(2)} ${(-5 * u).toFixed(2)} ${(-21 * u).toFixed(2)} ${(6 * u).toFixed(2)}
           0 ${(11 * u).toFixed(2)} ${(21 * u).toFixed(2)} ${(21 * u).toFixed(2)} ${(21 * u).toFixed(2)} ${(21 * u).toFixed(2)}
           0 0 ${(21 * u).toFixed(2)} ${(-10 * u).toFixed(2)} ${(21 * u).toFixed(2)} ${(-21 * u).toFixed(2)}
           0 ${(-11 * u).toFixed(2)} ${(-15 * u).toFixed(2)} ${(-15 * u).toFixed(2)} ${(-21 * u).toFixed(2)} ${(-6 * u).toFixed(2)} z"
        fill="#ffffff" opacity="0.18"/>
</svg>`;
}

async function png(name, { size, pad, rounded }) {
  const buf = Buffer.from(svg({ size, pad, rounded }));
  await sharp(buf).png({ compressionLevel: 9 }).toFile(`public/icons/${name}`);
  console.log('  ', name);
}

// Ícones normais: pouco respiro, cantos arredondados (o iOS já recorta).
await png('icon-192.png', { size: 192, pad: 0.14, rounded: true });
await png('icon-512.png', { size: 512, pad: 0.14, rounded: true });
// Maskable: 20% de respiro e fundo até a borda, porque o Android recorta.
await png('icon-maskable-512.png', { size: 512, pad: 0.22, rounded: false });
// apple-touch-icon: o iOS não arredonda sozinho no atalho, mas também não
// aceita transparência -- fundo cheio resolve os dois casos.
await png('apple-touch-icon.png', { size: 180, pad: 0.14, rounded: false });

// Favicon SVG, nítido em qualquer zoom e mais leve que .ico.
writeFileSync('public/icons/icon.svg', svg({ size: 64, pad: 0.1, rounded: true }));
console.log('   icon.svg');
