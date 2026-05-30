Backend: Node + Express

Install:
1. cd backend
2. npm install
3. copy .env.example to .env and set DATABASE_URL, JWT_SECRET
4. Run DB migrations: psql -d <db> -f ../database/schema.sql
5. npm run dev

API endpoints (starter):
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/verify-phone  { phone, code } -> verify phone and mark user verified
- GET /api/products
- POST /api/products
- POST /api/sales
- GET /api/reports/expiry
- GET /api/reports/missing

SMS verification (Hubtel)
- POST /api/sms/send  { phone, purpose? }  -> generate and send code
- POST /api/sms/verify { phone, code } -> verify last sent code

Configure in `.env`:
- `HUBTEL_API_URL` - Hubtel send-message endpoint (for local query-auth testing, `https://smsc.hubtel.com/v1/messages/send` works with the client-id/client-secret fallback)
- `HUBTEL_API_KEY` - Hubtel API key used for Bearer auth
- `HUBTEL_SMS_CLIENT_ID` and `HUBTEL_SMS_CLIENT_SECRET` - local fallback for Hubtel query auth when testing without an API key
- `HUBTEL_SENDER` - optional sender name

Prefer the API-key flow in production. The app now requires `HUBTEL_API_KEY` in production, but local development still supports the client-id/client-secret fallback so the SMS flow can be tested end to end.

Notes:
- Secure JWT_SECRET in production
- Use connection pooling for DB
- Add validation and rate-limiting

Render deployment:
- Deploy the backend as a Render Web Service with `rootDir: backend`.
- Set `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN` in Render environment variables.
- Use `npm start` as the start command.
- Set `CORS_ORIGIN` to `https://store-manager-systemfrontend.vercel.app` for production, and add any extra preview URLs you use.

Env rotation and safe secret handling
-----------------------------------

- Never commit real secret values (for example `DATABASE_URL`, `JWT_SECRET`, or `HUBTEL_API_KEY`) to the repository. Keep `.env` listed in `.gitignore`.
- To rotate secrets safely:
	1. Generate a new secret in your hosting provider (Render, Vercel, GitHub Actions, etc.) or your secret manager.
	2. Update the runtime environment variables in the deployment platform (do not edit `.env` in the repo with real values).
	3. Update `backend/.env.example` with placeholder values and a short note that secrets must be set in the environment.
	4. Create a PR that documents the rotation (which variables were rotated and when) but never contains secret values.

Recommended: use GitHub Actions or your cloud provider's secret store (Render environment variables, Vercel Environment, or GitHub Secrets) to inject secrets at deploy time.

If you want, I can generate a safe rotated `.env.example` and create a branch/PR with documentation so ops can update secrets via the hosting UI without ever exposing values in Git history.
