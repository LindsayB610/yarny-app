// Auth configuration from environment variables
const RP_ID = process.env.RP_ID || 'yarny.lindsaybrunner.com';
const RP_NAME = process.env.RP_NAME || 'Yarny';
const ORIGIN = process.env.ORIGIN || 'https://yarny.lindsaybrunner.com';
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || 'lindsayb82@gmail.com';

module.exports = {
  RP_ID,
  RP_NAME,
  ORIGIN,
  ALLOWED_EMAIL
};

