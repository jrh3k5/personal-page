#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Run a command and return a promise
 */
function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(description);
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Copy static files from src/static to dist
 */
function copyStaticFiles() {
  console.log('Copying static files...');

  const srcStatic = 'src/static';
  const dist = 'dist';

  if (fs.existsSync(srcStatic)) {
    fs.copySync(srcStatic, dist);
  } else {
    console.warn('Warning: src/static directory not found');
  }
}

/**
 * Main build function
 */
async function build() {
  try {
    console.log('Building site...');

    // Remove existing dist directory and create fresh one
    fs.removeSync('dist');
    fs.ensureDirSync('dist');

    // Generate index.html from template and presentations data
    await runCommand(
      'node',
      ['scripts/generate-main-page.js', 'src/templates/presentations.yaml', 'src/templates/index.html.template', 'dist/index.html'],
      'Generating index.html from template...'
    );

    // Process blog content if it exists
    if (fs.existsSync('src/blog') && fs.readdirSync('src/blog').some(file => file.endsWith('.md') || fs.statSync(path.join('src/blog', file)).isDirectory())) {
      await runCommand(
        'node',
        ['scripts/process-blog.js', 'src/templates/blog-post.html.template', 'src/templates/blog-index.html.template', 'dist/'],
        'Processing blog content...'
      );
    } else {
      console.log('No blog content found, skipping blog processing...');
    }

    // Copy static files
    copyStaticFiles();

    console.log('Build completed successfully! Output is in ./dist/');

  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies || {});

  for (const dep of dependencies) {
    try {
      require.resolve(dep);
    } catch (error) {
      console.error(`Missing dependency: ${dep}`);
      console.error('Please run: npm install');
      process.exit(1);
    }
  }
}

// Run the build
if (require.main === module) {
  checkDependencies();
  build();
}