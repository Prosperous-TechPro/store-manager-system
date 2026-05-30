const { loadEnv } = require('./loadEnv');
const loadedEnvPaths = loadEnv();
const app = require('./app');
const db = require('./models/db');
const { getSmsDiagnostics } = require('./controllers/smsController');
const port = process.env.PORT || 4000;

const warnIfProdSmsMisconfigured = () => {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.HUBTEL_API_KEY) return;

  console.error('================================================================');
  console.error('SMS CONFIG WARNING: HUBTEL_API_KEY is missing in production.');
  console.error('SMS verification will fail until a valid API key is configured.');
  console.error('Local client-id/client-secret fallback is disabled in production.');
  console.error('================================================================');
};

db.initSchema()
  .then(() => {
    if (loadedEnvPaths.length) {
      console.log('Loaded env files:', loadedEnvPaths.join(', '));
    }
    warnIfProdSmsMisconfigured();
    const diagnostics = getSmsDiagnostics();
    console.log('SMS diagnostics:', JSON.stringify(diagnostics));
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema', err);
    process.exit(1);
  });
