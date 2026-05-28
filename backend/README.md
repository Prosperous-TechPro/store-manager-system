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
- `HUBTEL_API_URL` - Hubtel send-message endpoint
- `HUBTEL_API_KEY` or `HUBTEL_BASIC_AUTH` - credentials
- `HUBTEL_SENDER` - optional sender name

Notes:
- Secure JWT_SECRET in production
- Use connection pooling for DB
- Add validation and rate-limiting
