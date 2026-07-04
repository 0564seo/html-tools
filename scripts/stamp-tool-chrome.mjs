import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const stamp = process.env.DEPLOY_STAMP || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const htmlRoots = [
  path.join(ROOT_DIR, 'index.html'),
  path.join(ROOT_DIR, 'tools')
];

const toolChromePattern = /(assets\/js\/tool-chrome\.js)(\?v=[^"'\\\s<>]+)?/g;

function walkHtmlFiles(targetPath, files = []) {
  if (!fs.existsSync(targetPath)) {
    return files;
  }

  const stat = fs.statSync(targetPath);
  if (stat.isFile()) {
    if (targetPath.endsWith('.html')) {
      files.push(targetPath);
    }
    return files;
  }

  for (const entry of fs.readdirSync(targetPath, { withFileTypes: true })) {
    if (entry.name === 'archive' || entry.name === 'dist' || entry.name === 'node_modules') {
      continue;
    }
    walkHtmlFiles(path.join(targetPath, entry.name), files);
  }

  return files;
}

let changedCount = 0;

for (const rootPath of htmlRoots) {
  for (const filePath of walkHtmlFiles(rootPath)) {
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = original.replace(toolChromePattern, '$1?v=' + stamp);

    if (updated !== original) {
      fs.writeFileSync(filePath, updated);
      changedCount += 1;
    }
  }
}

console.log(`Stamped tool-chrome.js cache buster: v=${stamp} across ${changedCount} HTML files`);
