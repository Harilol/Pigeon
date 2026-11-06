# Pigeon

Pigeon lets you explore PostgreSQL data with natural-language questions. Bring your own database and AI provider key; Pigeon sends a read-only query and shows the SQL and results.

The repository contains a React/Vite frontend at the root and a Django API in [`backend/`](./backend/).

![Pigeon landing page](./docs/screenshot.png)

## Features

- Connect to PostgreSQL and inspect its public-table schema.
- Ask questions using OpenAI, OpenRouter, Google Gemini, or Anthropic.
- Review the query and results returned with each response.
- Run locally or deploy the frontend and API as separate services.
- No shared/server-owned AI provider key: each user supplies their own.

## Local development

Requirements: Node.js 22.12+ and Python 3.12+.

### 1. Install dependencies

From the repository root:

```bash
npm ci
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m pip install -r backend/requirements.txt
```

### 2. Configure the API

```bash
cp backend/.env.example backend/.env
```

Set `SECRET_KEY` in `backend/.env` to a new random value. For example:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

The local example enables private database hosts so localhost and development databases work. Do not copy that setting into a public production deployment.

### 3. Configure and run the frontend

In another terminal, from the repository root:

```bash
cp .env.example .env
npm run dev
```

`VITE_API_BASE_URL` defaults to the local API at `http://127.0.0.1:8000`.

### 4. Start the API

From the repository root:

```bash
source .venv/bin/activate  # If not already active
cd backend
python manage.py migrate
python manage.py runserver
```

Open the frontend URL printed by Vite (usually `http://localhost:5173`).

## Tests and checks

From the repository root:

```bash
npm run lint
npm run build
cd backend
python manage.py test
```

## Production deployment

Deploy the frontend and API separately:

1. **Frontend:** use the repository root as the build directory, run `npm ci` and `npm run build`, and publish `dist/` as a static site. Configure SPA fallback so routes such as `/app` serve `index.html`. Set `VITE_API_BASE_URL` to the public HTTPS origin of the API.
2. **API:** set the service root directory to `backend/`, build with `./build.sh`, run migrations as a release step with `python manage.py migrate`, then start with:

   ```bash
   gunicorn config.wsgi:application --workers 2 --timeout 75 --access-logfile - --error-logfile -
   ```

Set these API environment variables in the hosting provider:

| Variable | Required | Purpose |
|---|---:|---|
| `DEBUG` | Yes | Set to `False`. |
| `SECRET_KEY` | Yes | Fresh, random Django secret (at least 50 characters). |
| `ALLOWED_HOSTS` | Yes | Comma-separated API hostnames, without schemes. |
| `CORS_ALLOWED_ORIGINS` | Yes | Exact frontend HTTPS origin(s), comma-separated. |
| `DATABASE_URL` | Yes | Persistent database for Django's own internal state. |
| `REDIS_URL` | Yes | Redis for shared anonymous-request throttling. |
| `TRUSTED_PROXY_COUNT` | Yes | Trusted proxy count for deriving client IPs; configure to match the host. |
| `DATABASE_SSLMODE` | No | Defaults to `require` in production. |
| `ALLOW_PRIVATE_DATABASE_HOSTS` | No | Defaults to `False`; keep disabled for a public service. |
| `CONNECT_REQUESTS_PER_MINUTE` | No | Defaults to 10 requests per IP. |
| `ASK_REQUESTS_PER_MINUTE` | No | Defaults to 6 requests per IP. |

Production startup fails when required secrets or services are not configured. If Redis is unavailable, the API fails closed instead of silently turning off rate limits.

## Security and privacy

- Users must provide an AI provider API key for each chat request. The API does not fall back to a server-owned key.
- The backend only accepts configured AI providers; clients cannot supply an arbitrary provider URL.
- Database hosts are resolved and pinned to a checked IP. Public deployments reject local and private network destinations.
- Schema inspection and query execution use read-only PostgreSQL transactions. Queries are parsed as one `SELECT`; nested writes and known dangerous PostgreSQL functions are rejected.
- Database connections, statement execution, concurrent work per IP, request rates, schema size, and result size are bounded.
- The API does not persist submitted database or AI credentials. They are sent to Pigeon to service requests; the selected AI provider receives the question, schema, and query results. The browser may save settings in local storage.
- Use a dedicated PostgreSQL user with only the minimum read privileges required. A read-only transaction is not a substitute for least-privilege database credentials; some user-defined functions can have side effects.

Anonymous rate limits protect the hosted service and do not limit the user's AI provider credits. Per-IP limits are a baseline; public services should also use the hosting provider's edge and DDoS protections.

## Repository layout

```text
.
├── backend/       # Django API and production configuration
├── public/        # Frontend static assets
├── src/           # React application
├── package.json
└── README.md
```

## License

MIT. See [`LICENSE`](./LICENSE).
