const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== METS Cross-Platform Build Script ===');

// Check if we have the required files
const requiredFiles = [
  'dist/index.html',
  'dist-electron/main.js',
  'dist-electron/preload.js'
];

console.log('Checking required files...');
let allFilesExist = true;
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

if (!allFilesExist) {
  console.error('❌ Please run "npm run build" first to generate required files');
  process.exit(1);
}

console.log('\n=== Starting Cross-Platform Build ===');

// Build for different platforms
const platforms = [
  { name: 'macOS', flag: '--mac' },
  { name: 'Windows', flag: '--win' },
  { name: 'Linux', flag: '--linux' }
];

async function buildPlatform(platform) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Building for ${platform.name}...`);
    
    const command = `npx electron-builder ${platform.flag}`;
    const child = exec(command, { cwd: __dirname });
    
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${platform.name} build completed successfully!`);
        resolve();
      } else {
        console.error(`❌ ${platform.name} build failed with code ${code}`);
        reject(new Error(`Build failed for ${platform.name}`));
      }
    });
  });
}

async function buildAll() {
  try {
    // Build sequentially to avoid conflicts
    for (const platform of platforms) {
      await buildPlatform(platform);
    }
    
    console.log('\n=== Build Summary ===');
    console.log('✅ All platforms built successfully!');
    
    // List generated files
    if (fs.existsSync('release')) {
      console.log('\n📦 Generated files:');
      const files = fs.readdirSync('release');
      files.forEach(file => {
        const filePath = path.join('release', file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          const size = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`  ${file} (${size} MB)`);
        }
      });
    }
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildAll();