import sharp from 'sharp';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagesDir = join(__dirname, '..', 'Assets', 'images');

const jobs = [
  { in: 'Yuvraj image.jpeg', out: 'Yuvraj image.webp' },
  { in: 'yuvraj_sketch.png', out: 'yuvraj_sketch.webp' },
];

for (const { in: input, out: output } of jobs) {
  const inputPath = join(imagesDir, input);
  const outputPath = join(imagesDir, output);
  if (!existsSync(inputPath)) {
    console.warn('Skip (missing):', input);
    continue;
  }
  await sharp(inputPath).webp({ quality: 85 }).toFile(outputPath);
  console.log('Created:', output);
}
