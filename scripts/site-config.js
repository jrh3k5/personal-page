import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Load site configuration
 */
export function loadSiteConfig() {
  const configPath = path.join('src', 'config.yml');

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content) || {};
  }

  return {};
}