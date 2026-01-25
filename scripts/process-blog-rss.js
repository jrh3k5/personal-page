const fs = require('fs-extra');
const path = require('path');

const { blogSourceDir, loadBlogMetadata } = require('./blog-metadata');
const { loadSiteConfig } = require('./site-config');
const { makeAbsoluteUrl } = require('./url');
const { generateRelativeBlogPostUrl } = require('./process-blog');

const maxSummaryLength = 200;

// Generate root XML document for RSS/Atom feeds
function generateRootXMLDoc() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0">\n';
    xml += '  <channel>\n';

    const siteConfig = loadSiteConfig();

    xml += `    <title>Blogs by ${siteConfig.site.author}</title>\n`;
    xml += `    <link>${siteConfig.site.base_url}</link>\n`;
    xml += `    <description>Blogs by ${siteConfig.site.author}</description>\n`;

    const allPosts = loadDirectoryBlogPosts(blogSourceDir);
    console.log(`Loaded metadata for ${allPosts.length} blog posts.`);

    // Sort the posts by publication date, newest first
    allPosts.sort((a, b) => b.metadata.publicationDate - a.metadata.publicationDate);

    allPosts.forEach((post) => {
        const relativeUrl = `blog/${generateRelativeBlogPostUrl(post.filePath)}`;
        const link = makeAbsoluteUrl(siteConfig, relativeUrl);
        let description = post.metadata.summary.trim();
        if (description.length > maxSummaryLength) {
            description = description.slice(0, maxSummaryLength) + '...';
        }

        xml += '    <item>\n';
        xml += `      <title>${post.metadata.title}</title>\n`;
        xml += `      <link>${link}</link>\n`;
        xml += `      <description>${description}</description>\n`;
        xml += `      <pubDate>${post.metadata.publicationDate.toUTCString()}</pubDate>\n`;
        xml += '    </item>\n';
    });

    xml += '  </channel>\n';
    xml += '</rss>';

    return xml;
}

function loadDirectoryBlogPosts(dir) {
  const dirItems = fs.readdirSync(dir);

  const posts = [];
  
  dirItems.forEach(dirItem => {
    if (dirItem.endsWith('.md')) {
        const filePath = path.join(dir, dirItem);
        const metadata = loadBlogMetadata(filePath);
        posts.push({
            filePath: filePath,
            metadata: metadata,
        });
    } else {
        const recursePath = path.join(dir, dirItem);
        if (fs.statSync(recursePath).isDirectory()) {
            const subDirPosts = loadDirectoryBlogPosts(recursePath);
            posts.push(...subDirPosts);
        }
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