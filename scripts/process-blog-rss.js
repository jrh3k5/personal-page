const fs = require('fs-extra');

const { blogSourceDir, loadBlogMetadata } = require('./blog-metadata');
const { loadSiteConfig } = require('./site-config');
const { makeAbsoluteUrl } = require('./url');
const { load } = require('js-yaml');

// Generate root XML document for RSS/Atom feeds
function generateRootXMLDoc() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0">\n';
    xml += '  <channel>\n';

    const siteConfig = loadSiteConfig();

    xml += `    <title>Blogs by ${siteConfig.site.author}</title>\n`;
    xml += `    <link>${siteConfig.site.base_url}</link>\n`;
    xml += `    <description>Blogs by ${siteConfig.site.author}</description>\n`;

    const allMetadata = loadAllBlogMetadata(blogSourceDir);
    console.log(`Loaded metadata for ${allMetadata.length} blog posts.`);

    allMetadata.forEach((metadata) => {
        const title = metadata.title || 'Untitled Post';
        const link = makeAbsoluteUrl(siteConfig, metadata.permalink || '');
        const description = metadata.description || '';

        xml += '    <item>\n';
        xml += `      <title>${title}</title>\n`;
        xml += `      <link>${link}</link>\n`;
        xml += `      <description>${description}</description>\n`;
        xml += `      <pubDate>${metadata.publicationDate.toISOString()}</pubDate>\n`;
        xml += '    </item>\n';
    });

    xml += '  </channel>\n';
    xml += '</rss>';

    return xml;
}

/*
 * Load all blog metadata
 */
function loadAllBlogMetadata(blogDir) {
  const allMetadata = loadDirectoryBlogMetadata(blogDir);

  // Sort by most recent to oldest
  allMetadata.sort((a, b) => b.publicationDate - a.publicationDate);

  return allMetadata;
}

function loadDirectoryBlogMetadata(dir) {
  const dirItems = fs.readdirSync(dir);

  const posts = [];
  
  dirItems.forEach(dirItem => {
    if (dirItem.endsWith('.md')) {
        const filePath = `${dir}/${dirItem}`;
        const metadata = loadBlogMetadata(filePath);
        posts.push(metadata);
    } else if (fs.statSync(`${dir}/${dirItem}`).isDirectory()) {
        const subDirPosts = loadDirectoryBlogMetadata(`${dir}/${dirItem}`);
        posts.push(...subDirPosts);
    }
  })

  return posts;
}

function main() {
  if (process.argv.length !== 3) {
    console.error('Usage: process-blog-rss.js <output.xml>');
    process.exit(1);
  }

  const xmlContent = generateRootXMLDoc();

  const outputFile = process.argv[2];
  fs.writeFileSync(outputFile, xmlContent, 'utf8');
}

if (require.main === module) {
  main();
}