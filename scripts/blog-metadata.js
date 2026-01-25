const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const blogSourceDir = './src/blog/';

class BlogMetadata {
  constructor(
    title,
    summary,
    previewText,
    publicationDate,
    thumbnail, 
    openGraph, 
    seo, 
) {
    this.title = title;
    this.summary = summary;
    this.thumbnail = thumbnail;
    this.openGraph = openGraph;
    this.seo = seo;
    this.publicationDate = publicationDate;
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

  if (!fs.existsSync(filePath)) {
    throw new Error('Unable to log blog metadata from non-existent file path: ' + filePath);
  }

  const metadataContent = fs.readFileSync(metaPath, 'utf8');
  const data = yaml.load(metadataContent);
  if (!data) {
    throw new Error('Unable to parse blog metadata from file: ' + metaPath);
  }
  
  // Extract date from path for metadata
  // First strip any possible preceding "./" from the path
  const cleanPath = filePath.startsWith('./') ? filePath.slice(2) : filePath;
  const pathParts = cleanPath.split('/');
  let publishedDate;
  if (pathParts.length != 6) {
    throw new Error('Unable to extract date from blog post path: ' + filePath);
  }
  
  const year = pathParts[2];
  const month = pathParts[3];
  const day = pathParts[4];
  publishedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (!publishedDate || isNaN(publishedDate.getTime())) {
    throw new Error('Invalid date extracted from blog post path: ' + filePath);
  }

  const thumbnailData = new BlogThumbnail(
    data.thumbnail.image,
    data.thumbnail.alt,
  );

  const openGraphData = new BlogOpenGraph(
    data.og.image,
  );

  const seoData = new BlogSEO(
    data.seo.keywords,
  );

  const blogContent = fs.readFileSync(filePath, 'utf8');
  const lines = blogContent.split('\n');

  let blogTitle;
  let previewText;
  for (const line of lines) {
    if (line.startsWith('#')) {
      if (!blogTitle && line.startsWith('# ')) {
        blogTitle = line.slice(2).trim();
      }
    } else if (!previewText && line.trim()) {
        // Clean up markdown formatting for summary
        let cleanLine = line
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links
          .replace(/\*\*(.*?)\*\*/g, '$1')          // Remove bold
          .replace(/\*(.*?)\*/g, '$1')              // Remove italic
          .replace(/`([^`]+)`/g, '$1');             // Remove inline code

        previewText = cleanLine.trim().length > 200
          ? cleanLine.trim().slice(0, 200) + '...'
          : cleanLine.trim();
      }

      if (!previewText && !blogTitle) {
        // Stop reading the lines once we have both title and summary
        break;
      }
  }

  if (!blogTitle) {
    throw new Error('Unable to extract blog title from file: ' + filePath);
  }

  if (!previewText) {
    throw new Error('Unable to extract blog preview text from file: ' + filePath);
  }

  return new BlogMetadata(
    blogTitle,
    data.summary,
    previewText,
    publishedDate,
    thumbnailData,
    openGraphData,
    seoData,
  );
}

module.exports = { 
  BlogMetadata,
  BlogThumbnail,
  BlogOpenGraph,
  BlogSEO,
  blogSourceDir, 
  loadBlogMetadata,
 };