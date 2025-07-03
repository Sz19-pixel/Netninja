const { addonBuilder } = require('stremio-addon-sdk');
const NetnaijaScaper = require('./scraper');

// Load manifest
const manifest = require('./manifest.json');

// Create addon
const builder = new addonBuilder(manifest);

// Initialize scraper
const scraper = new NetnaijaScaper();

// Define stream handler
builder.defineStreamHandler(async (args) => {
  console.log('Stream request received:', args);
  
  // Validate request
  if (args.type !== 'movie') {
    console.log('Invalid type:', args.type);
    return { streams: [] };
  }

  if (!args.id || !args.id.startsWith('netnaija:')) {
    console.log('Invalid ID format:', args.id);
    return { streams: [] };
  }

  // Extract slug from ID
  const slug = args.id.replace('netnaija:', '');
  console.log('Extracted slug:', slug);

  if (!slug) {
    console.log('Empty slug');
    return { streams: [] };
  }

  try {
    // Scrape streams
    const streams = await scraper.scrapeStreams(slug);
    
    console.log(`Returning ${streams.length} streams for ${slug}`);
    console.log('Streams:', streams);
    
    return { streams };
    
  } catch (error) {
    console.error('Error in stream handler:', error);
    return { streams: [] };
  }
});

// Create and export addon interface
const addonInterface = builder.getInterface();

// For serverless deployment (Vercel)
module.exports = (req, res) => {
  return addonInterface(req, res);
};

// For local development
if (require.main === module) {
  const { serveHTTP } = require('stremio-addon-sdk');
  
  serveHTTP(addonInterface, {
    port: process.env.PORT || 3000,
    cache: 3600 // Cache responses for 1 hour
  }).then(() => {
    console.log('🚀 Netnaija Stremio Addon running on port', process.env.PORT || 3000);
    console.log('📡 Addon URL: http://localhost:' + (process.env.PORT || 3000) + '/manifest.json');
    console.log('🔗 Install URL: stremio://localhost:' + (process.env.PORT || 3000) + '/manifest.json');
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
