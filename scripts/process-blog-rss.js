const fs = require('fs-extra');

const { loadBlogMetadata } = require('./blog-metadata');
const { loadSiteConfig } = require('./site-config');
const { makeAbsoluteUrl } = require('./url');

// Generate root XML document for RSS/Atom feeds
function generateRootXMLDoc() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0">\n';
    xml += '  <channel>\n';
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