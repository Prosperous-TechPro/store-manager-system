Frontend (Vite + React)

Install & run

```bash
cd frontend
npm install
npm run dev
```

Notes
- Dev server proxies `/api` to `http://localhost:4000` (see `vite.config.js`).
- Set `VITE_API_URL` for production, or `VITE_API_BASE` / `VITE_BACKEND_URL` if that is what your host provides.
- The API base should point to the backend host, not the frontend Vercel URL.
