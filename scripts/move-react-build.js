#!/usr/bin/env node

/**
 * Post-build script to move React app build output to dist/react/
 * 
 * This script:
 * 1. Creates dist/react/ directory
 * 2. Moves React app files (index.html, assets/) to dist/react/
 * 3. Keeps classic app files (editor.html, stories.html, etc.) in dist/
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const reactDir = path.join(distDir, 'react');

// Files/directories to move to react/ subdirectory
const reactFiles = [
  'index.html',
  'assets'
];

// Files/directories to keep in dist/ (classic app)
// (Not currently used, but kept for reference)
// const classicFiles = [
//   'editor.html',
//   'stories.html',
//   'editor.css',
//   'stories.css',
//   'editor.js',
//   'stories.js',
//   'app.js',
//   'drive.js',
//   'global.css',
//   'footer.css',
//   'docs.html',
//   'docs.css',
//   'migration-plan.html',
//   'migration-plan',
//   'opening-sentences.js'
// ];

function moveReactBuild() {
  console.log('Moving React build output to dist/react/...');

  // Create react directory if it doesn't exist
  if (!fs.existsSync(reactDir)) {
    fs.mkdirSync(reactDir, { recursive: true });
    console.log('Created dist/react/ directory');
  }

  // Move React app files to react/ subdirectory
  let movedCount = 0;
  for (const file of reactFiles) {
    const sourcePath = path.join(distDir, file);
    const destPath = path.join(reactDir, file);

    if (fs.existsSync(sourcePath)) {
      // Check if it's a directory or file
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        // Move directory
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.renameSync(sourcePath, destPath);
        console.log(`Moved directory: ${file} -> react/${file}`);
      } else {
        // Move file
        fs.renameSync(sourcePath, destPath);
        console.log(`Moved file: ${file} -> react/${file}`);
      }
      movedCount++;
    } else {
      console.warn(`Warning: ${file} not found in dist/, skipping`);
    }
  }

  console.log(`\nMoved ${movedCount} React app file(s) to dist/react/`);
  console.log('Classic app files remain in dist/');
  console.log('\nBuild structure:');
  console.log('  dist/');
  console.log('    editor.html (classic app)');
  console.log('    stories.html (classic app)');
  console.log('    ... (other classic app files)');
  console.log('    react/');
  console.log('      index.html (React app)');
  console.log('      assets/ (React app assets)');

  restoreClassicIndex();
}

function restoreClassicIndex() {
  const classicIndexSource = path.join(__dirname, '..', 'public', 'index.html');
  const classicIndexDest = path.join(distDir, 'index.html');

  if (!fs.existsSync(classicIndexSource)) {
    console.warn('Warning: public/index.html not found; cannot restore classic index.');
    return;
  }

  fs.copyFileSync(classicIndexSource, classicIndexDest);
  console.log('\nRestored classic index at dist/index.html');
}

// Run the script
try {
  moveReactBuild();
  console.log('\n✅ React build output moved successfully!');
} catch (error) {
  console.error('\n❌ Error moving React build output:');
  console.error(error);
  process.exit(1);
}

