#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load site configuration
 */
function loadSiteConfig() {
  const configPath = path.join(__dirname, '..', 'src', 'config.yml');

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return yaml.load(content) || {};
    } catch (error) {
      console.warn(`Warning: Could not load site config from ${configPath}: ${error.message}`);
      return {};
    }
  }

  return {};
}

/**
 * Load index page metadata
 */
function loadIndexMetadata(templateFile) {
  const basePath = path.parse(templateFile).dir + '/' + path.parse(templateFile).name;
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
 * Generate social media meta tags
 */
function generateSocialMetaTags(metadata, siteConfig) {
  // Helper function to convert relative URLs to absolute
  function makeAbsoluteUrl(relativeUrl) {
    if (!relativeUrl) return relativeUrl;
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    const baseUrl = siteConfig.site?.base_url || '';
    return baseUrl ? `${baseUrl}/${relativeUrl}` : relativeUrl;
  }

  const title = metadata.title || 'Personal Site';
  const description = metadata.description || '';
  const ogType = metadata.og?.type || 'website';
  const twitterCardType = metadata.twitter?.card || 'summary_large_image';
  const siteName = metadata.og?.site_name || title;
  const ogUrl = metadata.og?.url || makeAbsoluteUrl('');

  // Generate image meta tags
  const ogImage = metadata.og?.image || metadata.thumbnail?.image;
  const ogImageAlt = metadata.og?.image_alt || metadata.thumbnail?.alt;
  const twitterImage = metadata.twitter?.image || ogImage;

  let metaTags = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">

    <!-- OpenGraph metadata -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:url" content="${ogUrl}">
    <meta property="og:site_name" content="${siteName}">`;

  if (ogImage) {
    const absoluteOgImage = makeAbsoluteUrl(ogImage);
    metaTags += `
    <meta property="og:image" content="${absoluteOgImage}">`;
    if (ogImageAlt) {
      metaTags += `
    <meta property="og:image:alt" content="${ogImageAlt}">`;
    }
  }

  metaTags += `

    <!-- Twitter Card metadata -->
    <meta name="twitter:card" content="${twitterCardType}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">`;

  if (twitterImage) {
    const absoluteTwitterImage = makeAbsoluteUrl(twitterImage);
    metaTags += `
    <meta name="twitter:image" content="${absoluteTwitterImage}">`;
  }

  return metaTags;
}

/**
 * Parse presentations YAML file
 */
function parseYaml(content) {
  try {
    const data = yaml.load(content);
    return data.presentations || [];
  } catch (error) {
    console.error(`Error parsing YAML: ${error.message}`);
    return [];
  }
}

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
 * Extract metadata from markdown content
 */
function extractBlogMetadata(content, filePath = null) {
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
        .replace(/\*(.*?)\*/g, '$1');             // Remove italic

      summary = cleanLine.trim().length > 150
        ? cleanLine.trim().slice(0, 150) + '...'
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
 * Get recent blog posts
 */
function getRecentBlogPosts(limit = 5) {
  const posts = [];
  const blogDir = 'src/blog';

  if (!fs.existsSync(blogDir)) {
    return posts;
  }

  function processDirectory(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (item.endsWith('.md')) {
        const relPath = path.relative('src/blog', itemPath);

        // Extract date from path (YYYY/MM/DD format)
        const pathParts = relPath.split('/');
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

        // Read file content to extract metadata
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          const metadata = extractBlogMetadata(content, itemPath);

          // Extract thumbnail information from metadata
          const externalMeta = metadata.externalMeta || {};
          const thumbnailImage = externalMeta.thumbnail?.image || '';
          const thumbnailAlt = externalMeta.thumbnail?.alt || '';

          posts.push({
            title: metadata.title,
            summary: metadata.summary,
            url: `blog/${relPath.replace('.md', '.html')}`,
            date: dateObj.toISOString().split('T')[0],
            dateDisplay: dateObj.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            dateObj: dateObj,
            thumbnail: thumbnailImage,
            thumbnailAlt: thumbnailAlt
          });
        } catch (error) {
          console.error(`Error processing ${itemPath}: ${error.message}`);
        }
      }
    }
  }

  processDirectory(blogDir);

  // Sort by date (newest first) and limit
  posts.sort((a, b) => b.dateObj - a.dateObj);
  return posts.slice(0, limit);
}

/**
 * Generate HTML for presentations
 */
function generatePresentationHtml(presentations) {
  return presentations.map(presentation => `      <div class="presentation">
        <div class="thumbnail">
          <img src="${presentation.thumbnail}" alt="${presentation.thumbnail_alt}" />
        </div>
        <div class="description">
          <h1>${presentation.title}</h1>
          <div class="summary">
            ${presentation.summary}
          </div>
          <div class="download-link">
            <a href="${presentation.download_url}">Download</a> (${presentation.download_format})
          </div>
        </div>
      </div>`).join('\n');
}

/**
 * Generate HTML for recent blog posts
 */
function generateRecentBlogsHtml(posts) {
  if (posts.length === 0) {
    return '<p class="no-blogs">No blog posts yet.</p>';
  }

  return posts.map(post => {
    // Include thumbnail if available
    let thumbnailHtml = '';
    if (post.thumbnail) {
      thumbnailHtml = `
        <div class="blog-thumbnail">
          <img src="${post.thumbnail}" alt="${post.thumbnailAlt}" />
        </div>`;
    }

    return `      <div class="recent-blog-post">
        ${thumbnailHtml}
        <div class="blog-content">
          <h3><a href="${post.url}">${post.title}</a></h3>
          <p class="blog-date">${post.dateDisplay}</p>
          <p class="blog-summary">${post.summary}</p>
        </div>
      </div>`;
  }).join('\n');
}

/**
 * Main function
 */
function main() {
  if (process.argv.length !== 5) {
    console.error('Usage: generate-main-page.js <presentations.yaml> <template.html> <output.html>');
    process.exit(1);
  }

  const yamlFile = process.argv[2];
  const templateFile = process.argv[3];
  const outputFile = process.argv[4];

  // Read YAML data
  let yamlContent;
  try {
    yamlContent = fs.readFileSync(yamlFile, 'utf8');
  } catch (error) {
    console.error(`Error: YAML file '${yamlFile}' not found`);
    process.exit(1);
  }

  // Read template
  let template;
  try {
    template = fs.readFileSync(templateFile, 'utf8');
  } catch (error) {
    console.error(`Error: Template file '${templateFile}' not found`);
    process.exit(1);
  }

  // Load site configuration and metadata
  const siteConfig = loadSiteConfig();
  const indexMetadata = loadIndexMetadata(templateFile);

  // Parse YAML and generate presentations HTML
  const presentations = parseYaml(yamlContent);
  const presentationsHtml = generatePresentationHtml(presentations);

  // Get recent blog posts and generate HTML
  const recentPosts = getRecentBlogPosts(5);
  const recentBlogsHtml = generateRecentBlogsHtml(recentPosts);

  // Generate social media meta tags
  const socialMetaTags = generateSocialMetaTags(indexMetadata, siteConfig);
  const pageTitle = indexMetadata.title || 'Personal Site';

  // Replace placeholders in template
  let outputHtml = template
    .replace(/\{\{PRESENTATIONS\}\}/g, presentationsHtml)
    .replace(/\{\{RECENT_BLOGS\}\}/g, recentBlogsHtml)
    .replace(/\{\{SOCIAL_META_TAGS\}\}/g, socialMetaTags)
    .replace(/\{\{PAGE_TITLE\}\}/g, pageTitle);

  // Write output
  try {
    fs.writeFileSync(outputFile, outputHtml);
    console.log(`Generated ${outputFile} successfully`);
  } catch (error) {
    console.error(`Error writing output file: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generatePresentationHtml,
  generateRecentBlogsHtml,
  getRecentBlogPosts,
  extractBlogMetadata,
  loadBlogMetadata
};