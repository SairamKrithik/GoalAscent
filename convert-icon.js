const sharp = require('sharp');
const fs = require('fs');

const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="1024" height="1024">
  <!-- Mountain base gradient bar -->
  <rect x="2" y="38" width="44" height="2.5" rx="1.25" fill="rgba(59,130,246,0.18)"/>
  
  <!-- Mountain left slope -->
  <path d="M6 38 L24 14 L30 22" stroke="#3B82F6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  
  <!-- Mountain right slope -->
  <path d="M30 22 L36 30 L42 38" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.6"/>
  
  <!-- Ascending arrow on the path -->
  <path d="M18 26 L24 14" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M21 17 L24 14 L27 17" stroke="#60A5FA" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  
  <!-- Summit dot -->
  <circle cx="24" cy="14" r="2.5" fill="#60A5FA"/>
  <circle cx="24" cy="14" r="4.5" fill="rgba(96,165,250,0.15)"/>
</svg>`;

if (!fs.existsSync('assets')) {
  fs.mkdirSync('assets');
}

sharp(Buffer.from(svgCode))
  .png()
  .toFile('assets/icon.png')
  .then(() => console.log('Icon generated successfully!'))
  .catch(err => console.error('Error generating icon:', err));

sharp(Buffer.from(svgCode))
  .png()
  .toFile('assets/splash.png')
  .then(() => console.log('Splash generated successfully!'))
  .catch(err => console.error('Error generating splash:', err));
