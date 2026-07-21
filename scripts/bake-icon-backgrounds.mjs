import sharp from 'sharp';

const SOURCE = 'public/assets/icons/mapshroom-icon-transparent-512.png';
const BG = { r: 9, g: 9, b: 11, alpha: 1 }; // #09090b

async function writeIcon(outPath, size, { padding = 0.12 } = {}) {
  const mushroomSize = Math.round(size * (1 - padding * 2));
  const mushroom = await sharp(SOURCE)
    .resize(mushroomSize, mushroomSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: mushroom, gravity: 'centre' }])
    .png()
    .toFile(outPath);

  console.log('wrote', outPath);
}

async function countTransparent(path) {
  const { data } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) transparent += 1;
  }
  console.log(path, 'transparentPx', transparent);
}

await writeIcon('public/assets/icons/mapshroom-pwa-192.png', 192, { padding: 0.14 });
await writeIcon('public/assets/icons/mapshroom-pwa-512.png', 512, { padding: 0.14 });
await writeIcon('public/assets/icons/apple-touch-icon.png', 180, { padding: 0.14 });
await writeIcon('public/assets/icons/favicon-32.png', 32, { padding: 0.1 });
await writeIcon('public/assets/icons/favicon-16.png', 16, { padding: 0.08 });

await sharp('public/assets/icons/favicon-32.png').resize(32, 32).toFile('public/favicon.ico');
console.log('wrote public/favicon.ico');

await countTransparent('public/assets/icons/mapshroom-pwa-192.png');
await countTransparent('public/assets/icons/mapshroom-pwa-512.png');
await countTransparent('public/assets/icons/apple-touch-icon.png');
