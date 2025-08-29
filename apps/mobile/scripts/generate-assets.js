const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create app icon (1024x1024)
function generateAppIcon() {
  const canvas = createCanvas(1024, 1024);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(1, '#2E7D32');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // White circle background
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(512, 512, 350, 0, Math.PI * 2);
  ctx.fill();

  // Golf ball
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(512, 450, 120, 0, Math.PI * 2);
  ctx.fill();

  // Golf ball dimples
  ctx.fillStyle = '#e0e0e0';
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc(460 + i * 20, 410 + j * 30, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // AI circuit lines
  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 5]);

  // Left circuit
  ctx.beginPath();
  ctx.moveTo(300, 512);
  ctx.lineTo(350, 512);
  ctx.lineTo(350, 450);
  ctx.lineTo(392, 450);
  ctx.stroke();

  // Right circuit
  ctx.beginPath();
  ctx.moveTo(724, 512);
  ctx.lineTo(674, 512);
  ctx.lineTo(674, 450);
  ctx.lineTo(632, 450);
  ctx.stroke();

  // Text "AI"
  ctx.fillStyle = '#4CAF50';
  ctx.font = 'bold 180px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI', 512, 650);

  // Save icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../assets/icon.png'), buffer);
  console.log('✅ App icon generated: assets/icon.png');
}

// Create splash screen (1284x2778)
function generateSplashScreen() {
  const canvas = createCanvas(1284, 2778);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 2778);
  gradient.addColorStop(0, '#66BB6A');
  gradient.addColorStop(0.5, '#4CAF50');
  gradient.addColorStop(1, '#2E7D32');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1284, 2778);

  // Logo circle
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(642, 1200, 250, 0, Math.PI * 2);
  ctx.fill();

  // Golf ball in logo
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(642, 1150, 80, 0, Math.PI * 2);
  ctx.fill();

  // AI text in logo
  ctx.fillStyle = '#4CAF50';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI', 642, 1320);

  // App name
  ctx.fillStyle = 'white';
  ctx.font = 'bold 80px Arial';
  ctx.fillText('Golf AI Coach', 642, 1600);

  // Tagline
  ctx.font = '40px Arial';
  ctx.fillText('Perfect Your Swing with AI', 642, 1680);

  // Loading indicator
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(642, 2200, 40, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Save splash
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../assets/splash.png'), buffer);
  console.log('✅ Splash screen generated: assets/splash.png');
}

// Create adaptive icon for Android (512x512)
function generateAdaptiveIcon() {
  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext('2d');

  // Transparent background (will use backgroundColor in app.json)
  ctx.clearRect(0, 0, 512, 512);

  // Golf ball
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(256, 230, 80, 0, Math.PI * 2);
  ctx.fill();

  // Golf ball shadow
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.beginPath();
  ctx.arc(256, 235, 80, 0, Math.PI * 2);
  ctx.fill();

  // AI text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI', 256, 360);

  // Save adaptive icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../assets/adaptive-icon.png'), buffer);
  console.log('✅ Adaptive icon generated: assets/adaptive-icon.png');
}

// Create favicon for web (48x48)
function generateFavicon() {
  const canvas = createCanvas(48, 48);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, 48, 48);

  // White circle
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(24, 24, 18, 0, Math.PI * 2);
  ctx.fill();

  // Mini golf ball
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(24, 20, 8, 0, Math.PI * 2);
  ctx.fill();

  // AI text
  ctx.fillStyle = '#4CAF50';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AI', 24, 36);

  // Save favicon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(__dirname, '../assets/favicon.png'), buffer);
  console.log('✅ Favicon generated: assets/favicon.png');
}

// Check if canvas is available
try {
  console.log('🎨 Generating app assets...');
  generateAppIcon();
  generateSplashScreen();
  generateAdaptiveIcon();
  generateFavicon();
  console.log('✨ All assets generated successfully!');
} catch (error) {
  console.log('⚠️  Canvas not installed. To generate assets automatically, run:');
  console.log('npm install canvas');
  console.log('\nAlternatively, create the following files manually:');
  console.log('- assets/icon.png (1024x1024)');
  console.log('- assets/splash.png (1284x2778)');
  console.log('- assets/adaptive-icon.png (512x512)');
  console.log('- assets/favicon.png (48x48)');
}
