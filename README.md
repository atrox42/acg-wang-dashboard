# Instagram Relationship Cleanup Dashboard

Full-stack dashboard for Instagram account relationship cleanup and account discovery.

## Stack

- Frontend: Next.js 14
- Backend: FastAPI
- Database: Supabase Postgres

## Features

### Relationship Cleanup

- Import follower/following snapshots from CSV
- Store Instagram posts and comments
- Receive Instagram comments webhook events
- Compute account interaction score using:
  - comments in last 30 days
  - repeated comments
  - recency of interaction
  - inactivity penalty
- Group accounts into `Keep`, `Review`, and `Unfollow candidates`
- Filter by 7/30/90 day windows
- Export unfollow candidates to CSV

### Recommended Accounts

- Accept seed accounts and hashtags
- Store discovered accounts
- Rank by:
  - follower count under 5000
  - posting recency
  - posting frequency
  - engagement proxy
  - category similarity
- Show daily top 50 recommendations
- Save, hide, and bookmark actions

### Platform

- Korean dashboard labels in the UI
- Mobile responsive admin layout
- Mock data mode for local testing
- Daily scheduled recalculation job
- Two-account login/logout gate for dashboard access

## Project Structure

```text
frontend/   Next.js application
backend/    FastAPI application
supabase/   SQL migrations
samples/    Example CSV files
```

## Environment Setup

Use [`.env.example`](C:\Users\pcuser\Desktop\ACG WANG\.env.example) and [`backend/.env.example`](C:\Users\pcuser\Desktop\ACG WANG\backend\.env.example) as templates.

Important values:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`
- `NEXT_PUBLIC_MOCK_DATA_MODE=true`
- `APP_LOGIN_USERNAME_YOU=admin`
- `APP_LOGIN_PASSWORD_YOU=admin1234`
- `APP_DISPLAY_NAME_YOU=규석`
- `APP_INSTAGRAM_HANDLE_YOU=@admin`
- `APP_LOGIN_USERNAME_WIFE=admin2`
- `APP_LOGIN_PASSWORD_WIFE=admin1234`
- `APP_DISPLAY_NAME_WIFE=다혜`
- `APP_INSTAGRAM_HANDLE_WIFE=@admin2`
- `SESSION_SECRET=change-this-secret`
- `SUPABASE_DB_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres`
- `INSTAGRAM_VERIFY_TOKEN=...`
- `INSTAGRAM_APP_SECRET=...`
- `MOCK_DATA_MODE=true`

## Local Development

## Recommended Way To Run

If you want the fastest local startup, use Docker Compose.

### Mock-data mode

```powershell
cd "C:\Users\pcuser\Desktop\ACG WANG"
docker compose up --build
```

Or on Windows:

```powershell
.\run-mock.ps1
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/api/health`
- Login page: `http://localhost:3000/login`

This path uses:

- `NEXT_PUBLIC_MOCK_DATA_MODE=true`
- `MOCK_DATA_MODE=true`
- `APP_LOGIN_USERNAME_YOU` / `APP_LOGIN_PASSWORD_YOU`
- `APP_LOGIN_USERNAME_WIFE` / `APP_LOGIN_PASSWORD_WIFE`

The UI will render mock payloads even if Instagram and Supabase are not wired up yet.

### Live-data mode

```powershell
cd "C:\Users\pcuser\Desktop\ACG WANG"
.\run-live.ps1
```

In live mode you should replace placeholder secrets in env files before running.

## Manual Local Development

### 1. Start Supabase

```bash
supabase start
supabase db reset
```

Supabase is only required for the existing manual live database-backed path.
The Docker Compose setup uses local PostgreSQL and auto-runs the SQL files in `supabase/migrations/`.

Migrations:

- [`supabase/migrations/202603230001_init_dashboard.sql`](C:\Users\pcuser\Desktop\ACG WANG\supabase\migrations\202603230001_init_dashboard.sql)
- [`supabase/migrations/202603230002_views_and_policies.sql`](C:\Users\pcuser\Desktop\ACG WANG\supabase\migrations\202603230002_views_and_policies.sql)

### 2. Run the backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For mock-data mode, keep `MOCK_DATA_MODE=true` in `backend/.env`.

Main endpoints:

- `GET /api/dashboard?days=30`
- `POST /api/cleanup/import-snapshot?snapshot_type=followers`
- `GET /api/cleanup/export/unfollow-candidates?days=30`
- `POST /api/recommendations/seeds`
- `GET /api/recommendations/daily-top`
- `POST /api/recommendations/actions`
- `GET /api/webhooks/instagram/comments`
- `POST /api/webhooks/instagram/comments`
- `POST /api/jobs/recalculate`

### 3. Run the frontend

```bash
cd frontend
npm install
copy ..\.env.example .env.local
npm run dev
```

For mock-data mode, keep `NEXT_PUBLIC_MOCK_DATA_MODE=true` in `frontend/.env.local`.

## Docker Services

- `frontend`: Next.js dev server on port `3000`
- `backend`: FastAPI server on port `8000`
- `db`: PostgreSQL on port `5432`

Main runtime files:

- [`docker-compose.yml`](C:\Users\pcuser\Desktop\ACG WANG\docker-compose.yml)
- [`frontend/Dockerfile`](C:\Users\pcuser\Desktop\ACG WANG\frontend\Dockerfile)
- [`backend/Dockerfile`](C:\Users\pcuser\Desktop\ACG WANG\backend\Dockerfile)
- [`run-mock.ps1`](C:\Users\pcuser\Desktop\ACG WANG\run-mock.ps1)
- [`run-live.ps1`](C:\Users\pcuser\Desktop\ACG WANG\run-live.ps1)

Open `http://localhost:3000`.

## Real URL Deployment

Recommended path:

- Frontend: Vercel
- Backend: Render

Backend deployment:

- [`render.yaml`](C:\Users\pcuser\Desktop\ACG WANG\render.yaml) can be used as a Render Blueprint
- backend health check: `/api/health`

Frontend environment variables for Vercel:

- `NEXT_PUBLIC_API_BASE_URL=https://your-render-backend-url`
- `NEXT_PUBLIC_MOCK_DATA_MODE=true`
- `ENABLE_LEGACY_LOGIN=false`
- `INSTAGRAM_CLIENT_ID=your-instagram-app-id`
- `INSTAGRAM_CLIENT_SECRET=your-instagram-app-secret`
- `INSTAGRAM_REDIRECT_URI=https://your-vercel-domain/api/auth/meta/callback`
- `INSTAGRAM_LOGIN_URL=https://www.instagram.com/oauth/authorize?...`
- `SESSION_SECRET=replace-with-a-strong-secret`

After deployment, update the Meta app OAuth redirect URI to the same callback URL used in `INSTAGRAM_REDIRECT_URI`.

## Scoring Logic

Relationship scores are calculated in [`backend/app/services/scoring.py`](C:\Users\pcuser\Desktop\ACG WANG\backend\app\services\scoring.py):

```text
interaction_score =
  recent_comment_score
  + repeated_comment_score
  + recency_score
  - inactivity_penalty
```

Thresholds:

- `75+`: Keep
- `40-74`: Review
- `0-39`: Unfollow candidates

Recommendation scores combine follower-band, posting recency, posting frequency, engagement proxy, and category similarity.

## Mock Data Mode

For local UI testing:

- Frontend: `NEXT_PUBLIC_MOCK_DATA_MODE=true`
- Backend: `MOCK_DATA_MODE=true`

Mock sources:

- [`frontend/lib/mock-data.ts`](C:\Users\pcuser\Desktop\ACG WANG\frontend\lib\mock-data.ts)
- [`backend/app/services/mock_store.py`](C:\Users\pcuser\Desktop\ACG WANG\backend\app\services\mock_store.py)

## Sample CSV Files

- [`samples/followers_snapshot.csv`](C:\Users\pcuser\Desktop\ACG WANG\samples\followers_snapshot.csv)
- [`samples/following_snapshot.csv`](C:\Users\pcuser\Desktop\ACG WANG\samples\following_snapshot.csv)

Required columns:

```text
username,full_name,follower_count,following_count,category
```
