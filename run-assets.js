const { execSync } = require('child_process');
try {
  console.log("Running capacitor-assets...");
  // Use npx specifically to run it from locally-installed node_modules
  execSync('npx @capacitor/assets generate --android --iconBackgroundColor "#0F172A" --splashBackgroundColor "#0F172A"', { stdio: 'inherit' });
  console.log("Assets overwritten!");
} catch (e) {
  console.error(e.message);
}
