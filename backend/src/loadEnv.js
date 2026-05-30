const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const loadEnv = () => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '..', '.env'),
  ];

  const loaded = [];
  for (const filePath of [...new Set(candidates)]) {
    if (!fs.existsSync(filePath)) continue;
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    Object.entries(parsed).forEach(([key, value]) => {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
      }
    });
    if (Object.keys(parsed).length > 0) {
      loaded.push(filePath);
    }
  }

  return loaded;
};

module.exports = { loadEnv };
