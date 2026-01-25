const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load site configuration
 */
function loadSiteConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'config.yml');

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content) || {};
  }

  return {};
}

module.exports = { loadSiteConfig };