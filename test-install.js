const { downloadArtifact } = require('./node_modules/@electron/get');
const { version } = require('./node_modules/electron/package.json');

console.log('Starting download for version:', version);
console.log('Platform:', process.platform, 'Arch:', process.arch);

downloadArtifact({
  version,
  artifactName: 'electron',
  platform: process.platform,
  arch: process.arch
}).then(zipPath => {
  console.log('Downloaded zip path:', zipPath);
}).catch(err => {
  console.error('Error:', err);
});
