const NetnaijaScaper = require('../scraper');
const manifest = require('../manifest.json');

// Initialize scraper
const scraper = new NetnaijaScaper();

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
    const { url } = req;
    const urlObj = new URL(url, `http://${req.headers.host}`);
    const path = urlObj.pathname;
    
    console.log('Request path:', path);
    
    // Handle manifest.json
    if (path === '/api' || path === '/api/' || path === '/api/manifest.json') {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(manifest);
      return;
    }
    
    // Handle stream requests - format: /api/stream/movie/netnaija:slug.json
    if (path.startsWith('/api/stream/')) {
      const pathParts = path.split('/');
      // Expected: ['', 'api', 'stream', 'movie', 'netnaija:slug.json']
      
      if (pathParts.length >= 5) {
        const type = pathParts[3]; // 'movie'
        let id = pathParts[4]; // 'netnaija:slug.json'
        
        // Remove .json extension if present
        if (id.endsWith('.json')) {
          id = id.slice(0, -5);
        }
        
        console.log('Stream request:', { type, id });
        
        if (type === 'movie' && id && id.startsWith('netnaija:')) {
          const slug = id.replace('netnaija:', '');
          console.log(`Processing stream request for slug: ${slug}`);
          
          try {
            const streams = await scraper.scrapeStreams(slug);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({ streams });
            return;
          } catch (error) {
            console.error('Scraping error:', error);
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({ streams: [] });
            return;
          }
        }
      }
    }
    
    // Handle root path - show add-on info
    if (path === '/api' || path === '/api/') {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Netnaija Stremio Addon</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 40px; 
                background: #1a1a1a; 
                color: #fff;
              }
              .container { max-width: 600px; margin: 0 auto; }
              .addon-url { 
                background: #333; 
                padding: 15px; 
                border-radius: 8px; 
                border: 1px solid #555;
                margin: 10px 0;
              }
              .install-btn { 
                background: #8b5cf6; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px;
                display: inline-block;
                margin: 10px 0;
              }
              .install-btn:hover { background: #7c3aed; }
              code { background: #444; padding: 2px 6px; border-radius: 3px; }
              .status { color: #10b981; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎬 Netnaija Stremio Add-on</h1>
              <p class="status">✅ Add-on is running successfully!</p>
              <p>Stream movies from Netnaija directly in Stremio.</p>
              
              <h3>📡 Add-on Manifest URL:</h3>
              <div class="addon-url">
                <code>https://${req.headers.host}/api/manifest.json</code>
              </div>
              
              <h3>🚀 Install in Stremio:</h3>
              <p>Copy the manifest URL above and add it to Stremio, or click the button below:</p>
              <p>
                <a href="stremio://https://${req.headers.host}/api/manifest.json" class="install-btn">
                  📱 Install Add-on in Stremio
                </a>
              </p>
              
              <h3>💡 Usage:</h3>
              <ul>
                <li>This add-on works with movie content only</li>
                <li>Movie IDs should be in format: <code>netnaija:movie-slug</code></li>
                <li>Example: <code>netnaija:avengers-endgame-2019</code></li>
                <li>The slug should match the URL on Netnaija</li>
              </ul>
              
              <h3>🔧 Technical Info:</h3>
              <ul>
                <li><strong>Manifest:</strong> <code>/api/manifest.json</code></li>
                <li><strong>Streams:</strong> <code>/api/stream/movie/netnaija:slug.json</code></li>
                <li><strong>Supported formats:</strong> MP4, M3U8 (HLS)</li>
                <li><strong>Response time:</strong> 2-10 seconds per request</li>
              </ul>
            </div>
          </body>
        </html>
      `);
      return;
    }
    
    // 404 for other paths
    res.status(404).json({ 
      error: 'Not found', 
      path: path,
      availableEndpoints: [
        '/api/manifest.json',
        '/api/stream/movie/netnaija:slug.json'
      ]
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}; 
