import fs from 'node:fs';
import path from 'node:path';

const srcSpa = path.resolve('dist', 'spa');
const srcNetpiu = path.resolve('dist', 'netpiu');
const outRoot = path.resolve('deploy', 'www');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory()) {
    for (const f of fs.readdirSync(p)) rmrf(path.join(p, f));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const stat = fs.lstatSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log('[prepare-deploy] Start');
// Clean output
rmrf(outRoot);
ensureDir(outRoot);

// 1) Copy SPA to root
if (!fs.existsSync(srcSpa)) {
  console.warn('[prepare-deploy] dist/spa not found');
} else {
  console.log('[prepare-deploy] Copy dist/spa -> deploy/www');
  copyDir(srcSpa, outRoot);
}

// 2) Copy Netpiu app under /netpiu
if (!fs.existsSync(srcNetpiu)) {
  console.warn('[prepare-deploy] dist/netpiu not found');
} else {
  console.log('[prepare-deploy] Copy dist/netpiu -> deploy/www/netpiu');
  copyDir(srcNetpiu, path.join(outRoot, 'netpiu'));
  // Ensure absolute asset paths work: place assets at domain root
  const netpiuAssets = path.join(srcNetpiu, 'assets');
  if (fs.existsSync(netpiuAssets)) {
    console.log('[prepare-deploy] Copy netpiu assets -> deploy/www/assets');
    copyDir(netpiuAssets, path.join(outRoot, 'assets'));
  }
  const netpiuFavicon = path.join(srcNetpiu, 'favicon.ico');
  if (fs.existsSync(netpiuFavicon)) {
    console.log('[prepare-deploy] Copy netpiu favicon -> deploy/www/favicon.ico');
    fs.copyFileSync(netpiuFavicon, path.join(outRoot, 'favicon.ico'));
  }
}

console.log('[prepare-deploy] Done. Output:', outRoot);