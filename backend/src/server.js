const app = require('./app');
const db = require('./models/db');
const port = process.env.PORT || 4000;

db.initSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema', err);
    process.exit(1);
  });
