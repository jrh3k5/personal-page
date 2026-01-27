#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { blogSourceDir } from './blog-metadata.js';

import { main as mainPageMain } from './generate-main-page.js';
import { main as processBlogMain } from './process-blog.js';
import { main as processBlogRSSMain } from './process-blog-rss.js';

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
    mainPageMain(
      'src/templates/presentations.yaml',
      'src/templates/index.html.template',
      'dist/index.html'
    )

    // Process blog content if it exists
    if (fs.existsSync(blogSourceDir) && fs.readdirSync(blogSourceDir).some(file => file.endsWith('.md') || fs.statSync(path.join(blogSourceDir, file)).isDirectory())) {
      processBlogMain(
        'src/templates/blog-post.html.template',
        'src/templates/blog-index.html.template',
        'dist/',
      );

      processBlogRSSMain('dist/blog/rss.xml');
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

/*
 * entrypoint
 */
checkDependencies();
build();