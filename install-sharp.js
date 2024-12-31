const { execSync } = require('child_process');
const isNetlify = process.env.NETLIFY === 'true';
const isWindows = process.platform === 'win32';

if (isNetlify) {
  console.log('Netlify environment detected. Installing sharp for Linux...');
  execSync('npm install sharp --platform=linux --arch=x64', { stdio: 'inherit' });
} else if (isWindows) {
  console.log('Windows environment detected. Installing sharp for Windows...');
  execSync('npm install sharp --platform=win32 --arch=x64', { stdio: 'inherit' });
} else {
  console.log('Default sharp installation...');
  execSync('npm install sharp', { stdio: 'inherit' });
}
