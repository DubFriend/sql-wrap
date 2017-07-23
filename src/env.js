// @flow
const dotenv = require('dotenv');

if (process.env.DEPLOYMENT === 'test') {
  dotenv.config();
}

module.exports = (key: string): string => {
  if (process.env[key]) {
    return process.env[key];
  }
  throw new Error(`Missing configuration for key: ${key}`);
};
