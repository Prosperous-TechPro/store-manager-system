Store Manager System — scaffold

Structure:
- backend/: Node + Express API
- database/: SQL schema and seeds
- frontend/: minimal static UI (starter)

Quick start (backend):
1. cd backend
2. npm install
3. copy .env.example to .env and set DATABASE_URL and JWT_SECRET
4. npm run dev

Database:
- Uses PostgreSQL. Run the SQL in database/schema.sql to create tables.

Minimum Viable Product:
- Auth (roles)
- Products CRUD
- Sales recording (sale + sale_items)
- Stock movements
- Missing and expiry tracking

Next steps:
- Implement frontend forms and charts
- Add tests and CI
- Harden auth and input validation

Production checklist:
- Copy `.env.example` to `.env` and set secure values (never commit `.env`).
- Use a managed Postgres (Neon, RDS, etc.) and run `database/schema.sql` once; prefer migrations.
- Build frontend with `cd frontend && npm run build` and serve the `dist/` directory via CDN or static host.
- Start backend with `NODE_ENV=production node src/server.js` or a process manager (PM2/systemd/container).
- Ensure `CORS_ORIGIN` and `API_BASE_URL` are set to production domains.
- Rotate and secure `JWT_SECRET` and any third-party API credentials.
