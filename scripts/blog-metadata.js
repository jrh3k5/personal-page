const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const blogSourceDir = './src/blog';

/**
 * Load metadata from a .meta.yaml file if it exists
 */
function loadBlogMetadata(filePath) {
  const basePath = path.parse(filePath).dir + '/' + path.parse(filePath).name;
  const metaPath = `${basePath}.meta.yaml`;

  if (fs.existsSync(metaPath)) {
    const content = fs.readFileSync(metaPath, 'utf8');
    return yaml.load(content) || {};
  }

  return {};
}

module.exports = { blogSourceDir, loadBlogMetadata };