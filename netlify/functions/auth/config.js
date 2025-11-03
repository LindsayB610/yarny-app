// WebAuthn configuration
// For production, set these via Netlify environment variables
module.exports = {
  RP_ID: process.env.RP_ID || 'yarny.lindsaybrunner.com',
  RP_NAME: process.env.RP_NAME || 'Yarny - Writing Tool',
  ORIGIN: process.env.ORIGIN || 'https://yarny.lindsaybrunner.com',
};

