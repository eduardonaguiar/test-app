import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const webDistPath = path.resolve(repoRoot, 'apps/web/dist');
const desktopWebDistPath = path.resolve(repoRoot, 'apps/desktop/web-dist');

await rm(desktopWebDistPath, { recursive: true, force: true });
await mkdir(desktopWebDistPath, { recursive: true });
await cp(webDistPath, desktopWebDistPath, { recursive: true });

console.log(`Copied ${webDistPath} -> ${desktopWebDistPath}`);
