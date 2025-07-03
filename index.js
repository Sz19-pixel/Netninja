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

// Create addon interface
const addonInterface = builder.getInterface();

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

// For serverless deployment (Vercel)
module.exports = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Parse the URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Handle manifest.json
    if (path === '/manifest.json') {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(manifest);
      return;
    }
    
    // Handle stream requests
    if (path.startsWith('/stream/')) {
      const pathParts = path.split('/');
      const type = pathParts[2];
      const id = pathParts[3];
      
      if (type === 'movie' && id && id.startsWith('netnaija:')) {
        const slug = id.replace('netnaija:', '');
        console.log(`Stream request: ${type}/${id} -> ${slug}`);
        
        const streams = await scraper.scrapeStreams(slug);
        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({ streams });
        return;
      }
    }
    
    // Handle root path
    if (path === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Netnaija Stremio Addon</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .container { max-width: 600px; margin: 0 auto; }
              .addon-url { background: #f5f5f5; padding: 10px; border-radius: 5px; }
              .install-btn { background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎬 Netnaija Stremio Add-on</h1>
              <p>Stream movies from Netnaija directly in Stremio!</p>
              
              <h3>📡 Add-on URL:</h3>
              <div class="addon-url">
                <code>https://${req.headers.host}/manifest.json</code>
              </div>
              
              <h3>🚀 Install in Stremio:</h3>
              <p>
                <a href="stremio://https://${req.headers.host}/manifest.json" class="install-btn">
                  Install Add-on
                </a>
              </p>
              
              <h3>💡 Usage:</h3>
              <p>Use movie IDs in format: <code>netnaija:movie-slug</code></p>
              <p>Example: <code>netnaija:avengers-endgame-2019</code></p>
            </div>
          </body>
        </html>
      `);
      return;
    }
    
    // 404 for other paths
    res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
