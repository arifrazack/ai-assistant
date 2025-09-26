#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const MODEL_FILE = path.join(MODELS_DIR, 'ggml-base.en.bin');

console.log('🎤 Setting up Whisper.cpp model for voice input...\n');

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  console.log('✅ Created models directory');
}

// Check if model already exists
if (fs.existsSync(MODEL_FILE)) {
  const stats = fs.statSync(MODEL_FILE);
  console.log(`✅ Whisper model already exists (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  console.log('🎉 Setup complete! Voice input should now work in the Electron app.');
  process.exit(0);
}

console.log('📥 Downloading whisper.cpp base.en model (~148MB)...');
console.log('This may take a few minutes depending on your internet connection.\n');

// Download progress tracking
let downloadedBytes = 0;
let totalBytes = 0;
let lastUpdate = 0;

const file = fs.createWriteStream(MODEL_FILE);

const request = https.get(MODEL_URL, (response) => {
  // Handle redirects
  if (response.statusCode === 301 || response.statusCode === 302) {
    console.log(`🔄 Following redirect to: ${response.headers.location}`);
    const redirectRequest = https.get(response.headers.location, handleResponse);
    redirectRequest.on('error', handleError);
    redirectRequest.setTimeout(30000, handleTimeout);
    return;
  }
  
  if (response.statusCode !== 200) {
    console.error(`❌ Failed to download: HTTP ${response.statusCode}`);
    fs.unlinkSync(MODEL_FILE);
    process.exit(1);
  }
  
  handleResponse(response);
});

  totalBytes = parseInt(response.headers['content-length'], 10);
  console.log(`📊 Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

  response.on('data', (chunk) => {
    downloadedBytes += chunk.length;
    
    // Update progress every 1MB or at completion
    if (downloadedBytes - lastUpdate > 1024 * 1024 || downloadedBytes === totalBytes) {
      const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
      const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(1);
      process.stdout.write(`\r📥 Downloaded: ${downloadedMB} MB (${percent}%)`);
      lastUpdate = downloadedBytes;
    }
  });

  response.pipe(file);
}

function handleError(err) {
  console.error('❌ Error downloading model:', err.message);
  console.log('\n📚 Manual setup instructions:');
  console.log('1. Visit: https://huggingface.co/ggerganov/whisper.cpp/tree/main');
  console.log('2. Download ggml-base.en.bin');
  console.log(`3. Place it in: ${MODELS_DIR}/ggml-base.en.bin`);
  process.exit(1);
}

function handleTimeout() {
  console.error('❌ Download timeout. Please check your internet connection.');
  process.exit(1);
}

file.on('finish', () => {
  file.close();
  console.log('\n✅ Download completed!');
  console.log(`📁 Model saved to: ${MODEL_FILE}`);
  console.log('\n🎉 Setup complete! Voice input should now work in the Electron app.');
  console.log('\nNext steps:');
  console.log('1. Make sure you have a microphone connected');
  console.log('2. Start the Electron app: npm run electron:dev');
  console.log('3. Click the 🎤 button to test voice input');
});

file.on('error', (err) => {
  fs.unlinkSync(MODEL_FILE);
  console.error('❌ Error writing file:', err.message);
  process.exit(1);
});

request.on('error', handleError);
request.setTimeout(30000, () => {
  request.abort();
  handleTimeout();
}); 