import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[copy-home] Source not found: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

const root = process.cwd();
const src = path.join(root, 'home', 'build');
const dest = path.join(root, 'dist', 'spa');

console.log(`[copy-home] Copying ${src} -> ${dest}`);
copyDir(src, dest);
console.log('[copy-home] Done');