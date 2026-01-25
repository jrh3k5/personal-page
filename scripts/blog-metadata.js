const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const blogSourceDir = './src/blog';

class BlogMetadata {
  constructor(thumbnail) {
    this.thumbnail = thumbnail;
  }
}

class BlogThumbnail {
  constructor(image, alt) {
    this.image = image;
    this.alt = alt;
  }
}

class BlogOpenGraph {
  constructor(image) {
    this.image = image;
  }
}

class BlogSEO {
  constructor(keywords) {
    this.keywords = keywords;
  }
}

/**
 * Load metadata from a .meta.yaml file if it exists
 */
function loadBlogMetadata(filePath) {
  const basePath = path.parse(filePath).dir + '/' + path.parse(filePath).name;
  const metaPath = `${basePath}.meta.yaml`;

  if (fs.existsSync(metaPath)) {
    const content = fs.readFileSync(metaPath, 'utf8');
    const data = yaml.load(content) || {};
    
    return new BlogMetadata(
      data.thumbnail ? new BlogThumbnail(data.thumbnail.image, data.thumbnail.alt) : null,
      data.openGraph ? new BlogOpenGraph(data.openGraph.image) : null,
      data.seo ? new BlogSEO(data.seo.keywords) : null
    );
  }

  return new BlogMetadata();
}

module.exports = { 
  BlogMetadata,
  BlogThumbnail,
  BlogOpenGraph,
  BlogSEO,
  blogSourceDir, 
  loadBlogMetadata,
 };