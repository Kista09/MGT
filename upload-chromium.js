// Run once: node upload-chromium.js
// Downloads the Chromium binary from GitHub and uploads it to Vercel Blob
// so the approve-onboarding function can fetch it quickly at runtime.
const { put } = require('@vercel/blob');
const https = require('https');
const fs   = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
    if (m) process.env[m[1]] = m[2];
  }
}

function download(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (!redirects) return reject(new Error('Too many redirects'));
        return resolve(download(res.headers.location, redirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      let downloaded = 0;
      res.on('data', c => {
        chunks.push(c);
        downloaded += c.length;
        process.stdout.write(`\r  ${(downloaded / 1024 / 1024).toFixed(1)} MB downloaded…`);
      });
      res.on('end', () => { process.stdout.write('\n'); resolve(Buffer.concat(chunks)); });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const packageJsonPath = path.join(path.dirname(require.resolve('@sparticuz/chromium-min')), '..', '..', 'package.json');
  const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const arch = process.env.CHROMIUM_ARCH || 'x64';
  const filename = `chromium-v${version}-pack.${arch}.tar`;
  const githubUrl = `https://github.com/Sparticuz/chromium/releases/download/v${version}/${filename}`;

  console.log(`Downloading chromium v${version} from GitHub…`);
  const data = await download(githubUrl);
  console.log(`Downloaded ${(data.length / 1024 / 1024).toFixed(1)} MB. Uploading to Vercel Blob…`);

  const blob = await put(`chromium/${filename}`, data, {
    access: 'public',
    contentType: 'application/x-tar',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log('\n✅ Done!');
  console.log('Blob URL:', blob.url);
  console.log('\nAdd this environment variable in Vercel project settings:');
  console.log(`  CHROMIUM_BINARY_URL = ${blob.url}`);
}

main().catch(err => { console.error(err); process.exit(1); });
