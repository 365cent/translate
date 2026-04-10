import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'index.html');
const outputDir = path.join(root, 'dist');
const outputPath = path.join(outputDir, 'index.html');
const envPath = path.join(root, '.env');

async function loadEnvFileIfPresent() {
  try {
    await access(envPath);
  } catch {
    return;
  }

  const envContent = await readFile(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

await loadEnvFileIfPresent();

const workerUrl = process.env.WORKER_URL || '';
const deeplUrl = process.env.DEEPL_URL || '';
if (!workerUrl && !deeplUrl) {
  console.error('Missing DEEPL_URL or WORKER_URL environment variable.');
  process.exit(1);
}

const template = await readFile(inputPath, 'utf8');
const output = template
  .replace('__DEEPL_URL__', deeplUrl)
  .replace('__WORKER_URL__', workerUrl);

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, output, 'utf8');

console.log(`Built ${outputPath}`);
