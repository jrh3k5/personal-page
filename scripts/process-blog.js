#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { marked } = require('marked');

const { blogSourceDir, loadBlogMetadata } = require('./blog-metadata');
const { loadSiteConfig } = require('./site-config');
const { makeAbsoluteUrl } = require('./url');

/**
 * Generates blog post URL from file path, relative to the blog/ directory of the site.
 */
function generateRelativeBlogPostUrl(blogFilePath) {
  const relPath = path.relative(blogSourceDir, blogFilePath);
  return relPath.replace('.md', '.html');
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
function extractMetadata(content, filePath) {
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
  const externalMeta = loadBlogMetadata(filePath);

  return {
    summary: summary || 'No summary available.',
    externalMeta
  };
}

/**
 * Process a single blog markdown file
 */
function processBlogFile(filePath, outputDir, blogTemplate) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Load site configuration
  const siteConfig = loadSiteConfig();

  // Extract metadata
  const metadata = extractMetadata(content, filePath);

  // Generate table of contents from markdown
  const tocHtml = generateTableOfContents(content);

  // Convert to HTML using marked
  const htmlContent = marked(content);

  // Add anchor IDs to headers
  const finalHtmlContent = addHeaderAnchors(htmlContent);

  // Generate output path
  const relativeUrl = generateRelativeBlogPostUrl(filePath);
  const outputPath = path.join(outputDir, relativeUrl);

  // Create output directory
  fs.ensureDirSync(path.dirname(outputPath));

  // Calculate relative path depth for CSS and navigation
  const pathDepth = relativeUrl.split('/').length - 1;
  const cssPath = '../'.repeat(pathDepth + 1) + 'styles.css';
  const homePath = '../'.repeat(pathDepth + 1) + 'index.html';
  const blogIndexPath = pathDepth > 0 ? '../'.repeat(pathDepth) + 'index.html' : 'index.html';

  // Extract external metadata
  const externalMeta = metadata.externalMeta;

  // Generate OpenGraph metadata (default to 'article' type)
  const ogType = externalMeta.og?.type || 'article';
  let ogImageMeta = '';

  // Use OpenGraph image, or fall back to thumbnail image
  const ogImage = externalMeta.og?.image || externalMeta.thumbnail?.image;
  const ogImageAlt = externalMeta.og?.image_alt || externalMeta.thumbnail?.alt;

  if (ogImage) {
    const absoluteOgImage = makeAbsoluteUrl(siteConfig, ogImage);
    ogImageMeta = `\n    <meta property="og:image" content="${absoluteOgImage}">`;
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
    const absoluteTwitterImage = makeAbsoluteUrl(twitterImage);
    twitterImageMeta = `\n    <meta name="twitter:image" content="${absoluteTwitterImage}">`;
  }

  // Generate SEO keywords metadata
  let keywordsMeta = '';
  const keywords = externalMeta.seo?.keywords;
  if (keywords && Array.isArray(keywords) && keywords.length > 0) {
    keywordsMeta = `\n    <meta name="keywords" content="${keywords.join(', ')}">`;
  }

  // Generate HTML from template
  let finalHtml = blogTemplate
    .replace(/\{\{TITLE\}\}/g, metadata.externalMeta.title)
    .replace(/\{\{TABLE_OF_CONTENTS\}\}/g, tocHtml)
    .replace(/\{\{CONTENT\}\}/g, finalHtmlContent)
    .replace(/\{\{CSS_PATH\}\}/g, cssPath)
    .replace(/\{\{HOME_PATH\}\}/g, homePath)
    .replace(/\{\{BLOG_INDEX_PATH\}\}/g, blogIndexPath)
    .replace(/\{\{SUMMARY\}\}/g, metadata.summary)
    .replace(/\{\{PUBLISHED_DATE\}\}/g, metadata.externalMeta.publicationDate.toDateString())
    .replace(/\{\{BLOG_URL\}\}/g, relativeUrl)
    .replace(/\{\{OG_TYPE\}\}/g, ogType)
    .replace(/\{\{OG_IMAGE_META\}\}/g, ogImageMeta)
    .replace(/\{\{TWITTER_CARD_TYPE\}\}/g, twitterCardType)
    .replace(/\{\{TWITTER_IMAGE_META\}\}/g, twitterImageMeta)
    .replace(/\{\{KEYWORDS_META\}\}/g, keywordsMeta);

  // Write output
  fs.writeFileSync(outputPath, finalHtml);

  // Extract thumbnail information from metadata
  const thumbnailImage = externalMeta.thumbnail?.image || '';
  const thumbnailAlt = externalMeta.thumbnail?.alt || '';

  return {
    title: metadata.externalMeta.title,
    summary: metadata.summary,
    url: relativeUrl,
    date: metadata.externalMeta.publicationDate.toISOString().split('T')[0],
    dateDisplay: metadata.externalMeta.publicationDate.toLocaleDateString('en-US', {
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
                <img src="../${post.thumbnail}" alt="${post.thumbnailAlt}" />
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

  if (fs.existsSync(blogSourceDir)) {
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

    processDirectory(blogSourceDir);
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

module.exports = { generateRelativeBlogPostUrl };