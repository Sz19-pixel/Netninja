const axios = require('axios');
const cheerio = require('cheerio');

class NetnaijaScaper {
  constructor() {
    this.baseUrl = 'https://netnaija.xyz';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async scrapeStreams(slug) {
    try {
      console.log(`Scraping streams for slug: ${slug}`);
      const downloadUrl = `${this.baseUrl}/download/${slug}`;
      
      // First request to get the main page
      const response = await axios.get(downloadUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const streams = [];

      // Method 1: Look for direct video/source tags
      const videoElements = $('video, source');
      videoElements.each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && this.isValidVideoUrl(src)) {
          streams.push({
            title: `Stream ${streams.length + 1} - ${this.getQualityFromUrl(src)}`,
            url: this.resolveUrl(src),
            isFree: true
          });
        }
      });

      // Method 2: Look for iframe sources
      const iframes = $('iframe');
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        const src = $(iframe).attr('src');
        if (src) {
          try {
            const iframeStreams = await this.scrapeIframe(src);
            streams.push(...iframeStreams);
          } catch (error) {
            console.log(`Failed to scrape iframe: ${src}`, error.message);
          }
        }
      }

      // Method 3: Look for embedded video URLs in script tags
      const scripts = $('script');
      scripts.each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent) {
          const videoUrls = this.extractVideoUrlsFromScript(scriptContent);
          videoUrls.forEach(url => {
            if (!streams.find(s => s.url === url)) {
              streams.push({
                title: `Stream ${streams.length + 1} - ${this.getQualityFromUrl(url)}`,
                url: this.resolveUrl(url),
                isFree: true
              });
            }
          });
        }
      });

      // Method 4: Look for download links
      const downloadLinks = $('a[href*=".mp4"], a[href*=".m3u8"], a[download]');
      downloadLinks.each((i, elem) => {
        const href = $(elem).attr('href');
        if (href && this.isValidVideoUrl(href)) {
          const title = $(elem).text().trim() || `Download ${streams.length + 1}`;
          if (!streams.find(s => s.url === this.resolveUrl(href))) {
            streams.push({
              title: title,
              url: this.resolveUrl(href),
              isFree: true
            });
          }
        }
      });

      console.log(`Found ${streams.length} streams for ${slug}`);
      return streams;

    } catch (error) {
      console.error(`Error scraping ${slug}:`, error.message);
      return [];
    }
  }

  async scrapeIframe(iframeSrc) {
    try {
      const resolvedUrl = this.resolveUrl(iframeSrc);
      console.log(`Scraping iframe: ${resolvedUrl}`);
      
      const response = await axios.get(resolvedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Referer': this.baseUrl
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      const streams = [];

      // Look for video sources in iframe
      const videoElements = $('video, source');
      videoElements.each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && this.isValidVideoUrl(src)) {
          streams.push({
            title: `Iframe Stream ${streams.length + 1}`,
            url: this.resolveUrl(src, resolvedUrl),
            isFree: true
          });
        }
      });

      // Look for video URLs in iframe scripts
      const scripts = $('script');
      scripts.each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent) {
          const videoUrls = this.extractVideoUrlsFromScript(scriptContent);
          videoUrls.forEach(url => {
            streams.push({
              title: `Iframe Stream ${streams.length + 1}`,
              url: this.resolveUrl(url, resolvedUrl),
              isFree: true
            });
          });
        }
      });

      return streams;
    } catch (error) {
      console.log(`Failed to scrape iframe: ${iframeSrc}`, error.message);
      return [];
    }
  }

  extractVideoUrlsFromScript(scriptContent) {
    const urls = [];
    
    // Common patterns for video URLs in JavaScript
    const patterns = [
      /["']([^"']*\.m3u8[^"']*)["']/g,
      /["']([^"']*\.mp4[^"']*)["']/g,
      /src\s*:\s*["']([^"']+\.(?:mp4|m3u8))[^"']*["']/g,
      /file\s*:\s*["']([^"']+\.(?:mp4|m3u8))[^"']*["']/g,
      /url\s*:\s*["']([^"']+\.(?:mp4|m3u8))[^"']*["']/g,
      /source\s*:\s*["']([^"']+\.(?:mp4|m3u8))[^"']*["']/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(scriptContent)) !== null) {
        const url = match[1];
        if (this.isValidVideoUrl(url)) {
          urls.push(url);
        }
      }
    });

    return [...new Set(urls)]; // Remove duplicates
  }

  isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const validExtensions = ['.mp4', '.m3u8', '.mkv', '.avi', '.mov', '.webm'];
    const lowerUrl = url.toLowerCase();
    
    return validExtensions.some(ext => lowerUrl.includes(ext)) ||
           lowerUrl.includes('stream') ||
           lowerUrl.includes('video');
  }

  getQualityFromUrl(url) {
    const qualities = ['4K', '1080p', '720p', '480p', '360p', 'HD', 'SD'];
    const upperUrl = url.toUpperCase();
    
    for (const quality of qualities) {
      if (upperUrl.includes(quality)) {
        return quality;
      }
    }
    
    if (url.includes('.m3u8')) return 'HLS';
    if (url.includes('.mp4')) return 'MP4';
    
    return 'Unknown';
  }

  resolveUrl(url, baseUrl = this.baseUrl) {
    if (!url) return '';
    
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Protocol-relative URL
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    // Relative URL
    if (url.startsWith('/')) {
      const domain = new URL(baseUrl).origin;
      return domain + url;
    }
    
    // Relative path
    return new URL(url, baseUrl).href;
  }
}

module.exports = NetnaijaScaper;
