// Helper function to convert relative URLs to absolute
function makeAbsoluteUrl(siteConfig, relativeUrl) {
  if (!relativeUrl) return relativeUrl;
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl;
  }
  const baseUrl = siteConfig.site?.base_url || '';
  return baseUrl ? `${baseUrl}/${relativeUrl}` : relativeUrl;
}

module.exports = { makeAbsoluteUrl };