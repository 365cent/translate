import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'index.html');
const outputDir = path.join(root, 'dist');
const outputPath = path.join(outputDir, 'index.html');

const workerUrl = process.env.WORKER_URL;
if (!workerUrl) {
  console.error('Missing WORKER_URL environment variable.');
  process.exit(1);
}

const template = await readFile(inputPath, 'utf8');
const output = template.replace('__WORKER_URL__', workerUrl);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, output, 'utf8');

console.log(`Built ${outputPath}`);
