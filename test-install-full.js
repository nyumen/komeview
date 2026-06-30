const { downloadArtifact } = require('./node_modules/@electron/get');
const extract = require('extract-zip');
const fs = require('fs');
const path = require('path');

const version = '31.7.7';
const platformPath = 'Electron.app/Contents/MacOS/Electron';

console.log('Downloading...');
downloadArtifact({
  version,
  artifactName: 'electron',
  platform: 'darwin',
  arch: 'arm64'
}).then(zipPath => {
  console.log('Downloaded zip:', zipPath);
  console.log('Extracting to node_modules/electron/dist ...');
  // 一旦古いdistを削除してクリーンにする
  const distDir = path.join(__dirname, 'node_modules/electron/dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
  
  return extract(zipPath, { dir: distDir });
}).then(() => {
  console.log('Extracted successfully!');
  return fs.promises.writeFile(path.join(__dirname, 'node_modules/electron/path.txt'), platformPath);
}).then(() => {
  console.log('path.txt written successfully!');
}).catch(err => {
  console.error('Error during process:', err);
});
