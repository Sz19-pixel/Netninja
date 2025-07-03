const NetnaijaScaper = require('./scraper');

async function testScraper() {
  const scraper = new NetnaijaScaper();
  
  // Test with example slug
  const testSlug = 'avengers-endgame-2019';
  
  console.log('🧪 Testing Netnaija Scraper');
  console.log('📁 Test slug:', testSlug);
  console.log('🔗 Test URL: https://netnaija.xyz/download/' + testSlug);
  console.log('⏳ Scraping...\n');
  
  try {
    const streams = await scraper.scrapeStreams(testSlug);
    
    console.log('✅ Scraping completed!');
    console.log('📊 Results:');
    console.log(`   Found ${streams.length} stream(s)\n`);
    
    if (streams.length > 0) {
      console.log('🎬 Stream Details:');
      streams.forEach((stream, index) => {
        console.log(`   ${index + 1}. ${stream.title}`);
        console.log(`      URL: ${stream.url}`);
        console.log(`      Free: ${stream.isFree}`);
        console.log('');
      });
    } else {
      console.log('❌ No streams found. This could mean:');
      console.log('   • The slug doesn\'t exist on Netnaija');
      console.log('   • The page structure has changed');
      console.log('   • The video is not available');
      console.log('   • Network/access issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test the stream handler format
async function testStreamHandler() {
  console.log('\n🎯 Testing Stream Handler Format');
  
  const { addonBuilder } = require('stremio-addon-sdk');
  const manifest = require('./manifest.json');
  const builder = new addonBuilder(manifest);
  
  // Simulate stream request
  const mockArgs = {
    type: 'movie',
    id: 'netnaija:avengers-endgame-2019'
  };
  
  console.log('📝 Mock request:', mockArgs);
  
  const scraper = new NetnaijaScaper();
  const slug = mockArgs.id.replace('netnaija:', '');
  
  try {
    const streams = await scraper.scrapeStreams(slug);
    const result = { streams };
    
    console.log('✅ Handler would return:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Handler test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testScraper();
  await testStreamHandler();
  
  console.log('\n🏁 Testing completed!');
  console.log('💡 To test with Stremio:');
  console.log('   1. Run: npm start');
  console.log('   2. Add to Stremio: stremio://localhost:3000/manifest.json');
  console.log('   3. Search for movies with netnaija: prefix');
}

runTests().catch(console.error); 
