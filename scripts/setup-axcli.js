#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for axcli availability...');

// Check if axcli is available in system PATH
exec('which axcli', (err, stdout, stderr) => {
  if (!err && stdout.trim()) {
    console.log('✅ axcli found in system PATH:', stdout.trim());
    console.log('🚀 Advanced accessibility features are fully available!');
    return;
  }

  // Check for local build
  const localAxcliPath = path.resolve(__dirname, '../mac/axcli/.build/release/axcli');
  if (fs.existsSync(localAxcliPath)) {
    console.log('✅ axcli found locally:', localAxcliPath);
    console.log('🚀 Advanced accessibility features are fully available!');
    return;
  }

  console.log('⚠️  axcli not found - accessibility tools will use fallback methods');
  console.log('');
  console.log('📋 Current Status:');
  console.log('   ✅ get_front_window_contents - Works with AppleScript fallback');
  console.log('   ✅ get_accessible_tabs - Works with basic tab info');
  console.log('   ⚠️  Tab content extraction - Limited without axcli');
  console.log('');
  console.log('🔧 To enable full accessibility features, you can:');
  console.log('');
  console.log('1. 📦 Install axcli from a trusted source (if available)');
  console.log('2. 🛠️  Build axcli locally (requires development setup)');
  console.log('3. 🤝 Use the built-in fallback methods (current default)');
  console.log('');
  console.log('ℹ️  Note: axcli appears to be a custom macOS accessibility CLI tool.');
  console.log('   The tools work without it, but with reduced functionality.');
  console.log('');
  console.log('🚀 Your accessibility tools are ready to use!');
});

// Function to test accessibility tools
function testAccessibilityTools() {
  console.log('');
  console.log('🧪 Testing accessibility tools...');
  
  // Test AppleScript fallback for front window
  exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
    if (err) {
      console.log('❌ AppleScript access may be restricted');
      console.log('💡 Enable Accessibility permissions in System Preferences for your terminal');
    } else {
      console.log('✅ AppleScript accessibility: Working');
      console.log('   Front app:', stdout.trim());
    }
  });

  // Test basic browser tab access
  exec(`osascript -e 'tell application "Google Chrome" to get title of active tab of first window' 2>/dev/null || echo "Chrome not accessible"`, (err, stdout) => {
    if (stdout.includes('Chrome not accessible')) {
      console.log('⚠️  Browser tab access may be limited');
    } else {
      console.log('✅ Browser tab access: Working');
    }
  });
}

// Run test if requested
if (process.argv.includes('--test')) {
  testAccessibilityTools();
} 