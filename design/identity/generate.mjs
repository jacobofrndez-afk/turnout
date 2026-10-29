import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { BRAND } from '../../src/lib/brand-copy.ts';
import { LOGO_COLORS as C, markMarkup, letteringDrawing, letteringMarkup, lockupDrawing, lockupMarkup } from '../../src/components/logo-geometry.ts';

const svg = (body, w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="geometricPrecision">${body}</svg>`;
const save = (name, body) => writeFileSync(`public/brand/${name}`, body);
const logo = (size, ink = C.ink, signal = C.signal, id = 'turnout-lockup') => {
  const l = lockupDrawing(size);
  return svg(lockupMarkup(ink, signal, size, id), l.width, l.height);
};
mkdirSync('public/brand', { recursive: true });
save('mark.svg', svg(markMarkup({ size: 256 }), 256, 256));
save('mark-mono.svg', svg(markMarkup({ size: 256, ink: '#111111', signal: '#111111', trail: false }), 256, 256));
save('mark-reverse.svg', svg(markMarkup({ size: 256, ink: C.reverse, signal: C.reverseSignal }), 256, 256));
save('lettering.svg', svg(letteringMarkup(C.ink, 152), letteringDrawing(152).width + 2, 152));
save('lockup.svg', logo(152));
save('lockup-reverse.svg', logo(152, C.reverse, C.reverseSignal));
writeFileSync('public/logo.svg', logo(152));
await sharp(Buffer.from(svg(markMarkup({ size: 1024 }), 1024, 1024))).png().toFile('public/brand/mark.png');
await sharp(Buffer.from(logo(456))).png().toFile('public/brand/lockup.png');
// The favicon is transparent. The platform icon and social card have intentional backgrounds.
writeFileSync('src/app/icon.svg', svg(markMarkup({ size: 32 }), 32, 32));
const apple = svg(`<rect width="180" height="180" fill="${C.ink}"/><g transform="translate(22 22)">${markMarkup({ size: 136, ink: C.reverse, signal: C.reverseSignal })}</g>`, 180, 180);
await sharp(Buffer.from(apple)).png().toFile('src/app/apple-icon.png');
const ogSize = 180, ogLogo = lockupDrawing(ogSize), ogX = Math.round((1200 - ogLogo.width)/2);
const og = svg(`<rect width="1200" height="630" fill="#FFFFFF"/><path d="M80 528H1120" stroke="#E8DEEC"/><g transform="translate(${ogX} 170)">${lockupMarkup(C.ink, C.signal, ogSize)}</g><text x="${ogX}" y="480" font-family="Arial, sans-serif" font-size="26" fill="${C.ink}">${BRAND.tagline}</text>`, 1200, 630);
await sharp(Buffer.from(og)).png().toFile('src/app/opengraph-image.png');
const proofSize = 168, proofLogo = lockupDrawing(proofSize), proofX = Math.round((1200-proofLogo.width)/2), proofY = Math.round((320-proofLogo.height)/2);
const proof = svg(`<rect width="1200" height="640" fill="#FFFFFF"/><g transform="translate(${proofX} ${proofY})">${lockupMarkup(C.ink, C.signal, proofSize, 'proof-light')}</g><rect y="320" width="1200" height="320" fill="${C.ink}"/><g transform="translate(${proofX} ${320+proofY})">${lockupMarkup(C.reverse, C.reverseSignal, proofSize, 'proof-dark')}</g>`, 1200, 640);
await sharp(Buffer.from(proof)).png().toFile('public/brand/identity.png');
console.log('Generated native-size SVGs, transparent PNGs, favicon, Apple icon, share card and identity preview.');
