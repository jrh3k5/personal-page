#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

/**
 * Load metadata from a .meta.yaml file if it exists
 */
function loadBlogMetadata(filePath) {
  const basePath = path.parse(filePath).dir + '/' + path.parse(filePath).name;
  const metaPath = `${basePath}.meta.yaml`;

  if (fs.existsSync(metaPath)) {
    try {
      const content = fs.readFileSync(metaPath, 'utf8');
      return yaml.load(content) || {};
    } catch (error) {
      console.warn(`Warning: Could not load metadata from ${metaPath}: ${error.message}`);
      return {};
    }
  }

  return {};
}

/**
 * Generate table of contents from markdown content
 */
function generateTableOfContents(content) {
  const headerPattern = /^(#{1,6})\s+(.*?)$/gm;
  const headers = [];
  let match;

  while ((match = headerPattern.exec(content)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();

    // Generate anchor ID
    const anchorId = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '-')
      .replace(/^-+|-+$/g, '');

    headers.push({ level, title, anchor: anchorId });
  }

  if (headers.length === 0) {
    return '';
  }

  // Generate collapsible TOC HTML
  let tocHtml = '<div class="table-of-contents">\n';
  tocHtml += '<input type="checkbox" id="toc-toggle" class="toc-checkbox">\n';
  tocHtml += '<label for="toc-toggle" class="toc-header">Table of Contents <span class="toc-arrow"></span></label>\n';
  tocHtml += '<ul class="toc-content">\n';

  headers.forEach(header => {
    const indentClass = `toc-level-${header.level}`;
    tocHtml += `  <li class="${indentClass}"><a href="#${header.anchor}">${header.title}</a></li>\n`;
  });

  tocHtml += '</ul>\n';
  tocHtml += '</div>';

  return tocHtml;
}

/**
 * Add anchor IDs to headers in HTML content
 */
function addHeaderAnchors(content) {
  return content.replace(/<(h[1-6])>(.*?)<\/\1>/g, (match, tag, title) => {
    const anchorId = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `<${tag} id="${anchorId}">${title}</${tag}>`;
  });
}

/**
 * Extract metadata from markdown content
 */
function extractMetadata(content, filePath = null) {
  const lines = content.split('\n');
  let title = null;
  let summary = null;

  // Extract title from first H1
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      break;
    }
  }

  // Extract summary from first paragraph
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      // Clean up markdown formatting for summary
      let cleanLine = line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links
        .replace(/\*\*(.*?)\*\*/g, '$1')          // Remove bold
        .replace(/\*(.*?)\*/g, '$1')              // Remove italic
        .replace(/`([^`]+)`/g, '$1');             // Remove inline code

      summary = cleanLine.trim().length > 200
        ? cleanLine.trim().slice(0, 200) + '...'
        : cleanLine.trim();
      break;
    }
  }

  // Load additional metadata from YAML file if available
  const externalMeta = filePath ? loadBlogMetadata(filePath) : {};

  return {
    title: title || 'Untitled',
    summary: summary || 'No summary available.',
    externalMeta
  };
}

/**
 * Process a single blog markdown file
 */
function processBlogFile(filePath, outputDir, blogTemplate) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract metadata
  const metadata = extractMetadata(content, filePath);

  // Generate table of contents from markdown
  const tocHtml = generateTableOfContents(content);

  // Convert to HTML using marked
  const htmlContent = marked(content);

  // Add anchor IDs to headers
  const finalHtmlContent = addHeaderAnchors(htmlContent);

  // Generate output path
  const relPath = path.relative('src/blog', filePath);
  const outputPath = path.join(outputDir, relPath.replace('.md', '.html'));

  // Create output directory
  fs.ensureDirSync(path.dirname(outputPath));

  // Calculate relative path depth for CSS and navigation
  const pathDepth = relPath.split('/').length - 1;
  const cssPath = '../'.repeat(pathDepth + 1) + 'styles.css';
  const homePath = '../'.repeat(pathDepth + 1) + 'index.html';
  const blogIndexPath = pathDepth > 0 ? '../'.repeat(pathDepth) + 'index.html' : 'index.html';

  // Extract date from path for metadata
  const pathParts = relPath.split('/');
  let publishedDate = '2025-01-01T00:00:00Z';
  if (pathParts.length >= 3) {
    try {
      const year = pathParts[0];
      const month = pathParts[1];
      const day = pathParts[2];
      publishedDate = `${year}-${month}-${day}T00:00:00Z`;
    } catch (error) {
      // Use default date
    }
  }

  // Generate blog URL
  const blogUrl = `blog/${relPath.replace('.md', '.html')}`;

  // Extract external metadata
  const externalMeta = metadata.externalMeta || {};

  // Generate OpenGraph metadata (default to 'article' type)
  const ogType = externalMeta.og?.type || 'article';
  let ogImageMeta = '';

  // Use OpenGraph image, or fall back to thumbnail image
  const ogImage = externalMeta.og?.image || externalMeta.thumbnail?.image;
  const ogImageAlt = externalMeta.og?.image_alt || externalMeta.thumbnail?.alt;

  if (ogImage) {
    ogImageMeta = `\n    <meta property="og:image" content="${ogImage}">`;
    if (ogImageAlt) {
      ogImageMeta += `\n    <meta property="og:image:alt" content="${ogImageAlt}">`;
    }
  }

  // Generate Twitter Card metadata (default to 'summary_large_image' for better image display)
  const twitterCardType = externalMeta.twitter?.card || 'summary_large_image';
  let twitterImageMeta = '';

  // Use Twitter image, or fall back to OpenGraph image, or fall back to thumbnail image
  const twitterImage = externalMeta.twitter?.image || ogImage;

  if (twitterImage) {
    twitterImageMeta = `\n    <meta name="twitter:image" content="${twitterImage}">`;
  }

  // Generate HTML from template
  let finalHtml = blogTemplate
    .replace(/\{\{TITLE\}\}/g, metadata.title)
    .replace(/\{\{TABLE_OF_CONTENTS\}\}/g, tocHtml)
    .replace(/\{\{CONTENT\}\}/g, finalHtmlContent)
    .replace(/\{\{CSS_PATH\}\}/g, cssPath)
    .replace(/\{\{HOME_PATH\}\}/g, homePath)
    .replace(/\{\{BLOG_INDEX_PATH\}\}/g, blogIndexPath)
    .replace(/\{\{SUMMARY\}\}/g, metadata.summary)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, publishedDate)
    .replace(/\{\{BLOG_URL\}\}/g, blogUrl)
    .replace(/\{\{OG_TYPE\}\}/g, ogType)
    .replace(/\{\{OG_IMAGE_META\}\}/g, ogImageMeta)
    .replace(/\{\{TWITTER_CARD_TYPE\}\}/g, twitterCardType)
    .replace(/\{\{TWITTER_IMAGE_META\}\}/g, twitterImageMeta);

  // Write output
  fs.writeFileSync(outputPath, finalHtml);

  // Extract thumbnail information from metadata
  const thumbnailImage = externalMeta.thumbnail?.image || '';
  const thumbnailAlt = externalMeta.thumbnail?.alt || '';

  // Extract date from path
  let dateObj = new Date();
  if (pathParts.length >= 3) {
    try {
      const year = parseInt(pathParts[0]);
      const month = parseInt(pathParts[1]) - 1; // JavaScript months are 0-based
      const day = parseInt(pathParts[2]);
      dateObj = new Date(year, month, day);
    } catch (error) {
      // Use current date
    }
  }

  return {
    title: metadata.title,
    summary: metadata.summary,
    url: relPath.replace('.md', '.html'),
    date: dateObj.toISOString().split('T')[0],
    dateDisplay: dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    thumbnail: thumbnailImage,
    thumbnailAlt: thumbnailAlt
  };
}

/**
 * Generate blog index page
 */
function generateBlogIndex(posts, indexTemplate, outputPath) {
  // Sort posts by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Generate posts HTML
  const postsHtml = posts.map(post => {
    // Include thumbnail if available
    let thumbnailHtml = '';
    if (post.thumbnail) {
      thumbnailHtml = `
            <div class="blog-thumbnail">
                <img src="${post.thumbnail}" alt="${post.thumbnailAlt}" />
            </div>`;
    }

    return `
        <article class="blog-post-preview">
            ${thumbnailHtml}
            <div class="blog-content">
                <h2><a href="${post.url}">${post.title}</a></h2>
                <p class="blog-date">${post.dateDisplay}</p>
                <p class="blog-summary">${post.summary}</p>
            </div>
        </article>`;
  }).join('\n');

  // Replace placeholder in template
  const finalHtml = indexTemplate.replace(/\{\{BLOG_POSTS\}\}/g, postsHtml);

  // Write output
  fs.writeFileSync(outputPath, finalHtml);
}

/**
 * Main function
 */
function main() {
  if (process.argv.length !== 5) {
    console.error('Usage: process-blog.js <blog-template.html> <index-template.html> <output-dir>');
    process.exit(1);
  }

  const blogTemplatePath = process.argv[2];
  const indexTemplatePath = process.argv[3];
  const outputDir = process.argv[4];

  // Read templates
  let blogTemplate, indexTemplate;
  try {
    blogTemplate = fs.readFileSync(blogTemplatePath, 'utf8');
    indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');
  } catch (error) {
    console.error(`Template file not found: ${error.message}`);
    process.exit(1);
  }

  // Create output directory
  const blogOutputDir = path.join(outputDir, 'blog');
  fs.ensureDirSync(blogOutputDir);

  // Process all markdown files
  const posts = [];
  const blogDir = 'src/blog';

  if (fs.existsSync(blogDir)) {
    function processDirectory(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          processDirectory(itemPath);
        } else if (item.endsWith('.md')) {
          console.log(`Processing ${itemPath}...`);
          const postInfo = processBlogFile(itemPath, blogOutputDir, blogTemplate);
          posts.push(postInfo);
        }
      }
    }

    processDirectory(blogDir);
  }

  // Generate blog index
  if (posts.length > 0) {
    const indexOutputPath = path.join(blogOutputDir, 'index.html');
    generateBlogIndex(posts, indexTemplate, indexOutputPath);
    console.log(`Generated blog index with ${posts.length} posts`);
  } else {
    console.log('No blog posts found');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  processBlogFile,
  generateBlogIndex,
  extractMetadata,
  loadBlogMetadata
};