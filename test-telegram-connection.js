// Quick diagnostic script to test Telegram API connectivity
const axios = require('axios');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env file');
  process.exit(1);
}

console.log('🔄 Testing Telegram API connection...\n');

const testUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`;

axios.get(testUrl, { timeout: 10000 })
  .then(response => {
    console.log('✅ Connection successful!');
    console.log('Bot info:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Your bot token is valid and Telegram API is accessible.');
    console.log('If the bot still times out, the issue may be with the Telegraf library or polling mechanism.');
  })
  .catch(error => {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('❌ Connection timeout - Telegram API is not reachable');
      console.error('Possible causes:');
      console.error('  - Network connectivity issue');
      console.error('  - Firewall/proxy blocking api.telegram.org');
      console.error('  - DNS resolution problem');
    } else if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.statusText);
      if (error.response.status === 401) {
        console.error('Invalid bot token!');
      }
      console.error('Response:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  });

