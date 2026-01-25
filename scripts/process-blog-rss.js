const fs = require('fs-extra');

const { blogSourceDir, loadBlogMetadata } = require('./blog-metadata');
const { loadSiteConfig } = require('./site-config');
const { makeAbsoluteUrl } = require('./url');

function loadAllBlogMetadata(blogDir) {
  const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
  const allMetadata = [];

  blogFiles.forEach(file => {
    const filePath = `${blogDir}/${file}`;
    const metadata = loadBlogMetadata(filePath);
    allMetadata.push(metadata);
  });

  return allMetadata;
}

// Generate root XML document for RSS/Atom feeds
function generateRootXMLDoc() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0">\n';
    xml += '  <channel>\n';

    const allMetadata = loadAllBlogMetadata(blogSourceDir);

    xml += '  </channel>\n';
    xml += '</rss>';

    return xml;
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