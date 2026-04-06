# Real URL Deployment

## Recommended setup

- Frontend: Vercel
- Backend: Render
- Database: Render PostgreSQL

## 1. Push this project to GitHub

- Create a new GitHub repository
- Upload the entire project root

## 2. Deploy backend on Render

- Create a new Blueprint in Render using [`render.yaml`](C:\Users\pcuser\Desktop\ACG WANG\render.yaml)
- Render will create:
  - `acg-wang-backend`
  - `acg-wang-db`

Set these backend env vars in Render if prompted:

- `SUPABASE_SERVICE_ROLE_KEY=dummy-for-now`
- `INSTAGRAM_APP_SECRET=your-meta-app-secret`
- `INSTAGRAM_VERIFY_TOKEN=your-meta-verify-token`

After deploy, note the backend URL:

- Example: `https://acg-wang-backend.onrender.com`

## 3. Deploy frontend on Vercel

- Import the same GitHub repo in Vercel
- Set the Root Directory to `frontend`

Add these env vars in Vercel:

- `NEXT_PUBLIC_API_BASE_URL=https://your-render-backend-url`
- `NEXT_PUBLIC_MOCK_DATA_MODE=true`
- `ENABLE_LEGACY_LOGIN=false`
- `INSTAGRAM_CLIENT_ID=1511167023704667`
- `INSTAGRAM_CLIENT_SECRET=your-instagram-app-secret`
- `INSTAGRAM_REDIRECT_URI=https://your-vercel-domain/api/auth/meta/callback`
- `INSTAGRAM_LOGIN_URL=https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=1511167023704667&redirect_uri=https://your-vercel-domain/api/auth/meta/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`
- `SESSION_SECRET=replace-with-a-long-random-secret`
- `APP_DISPLAY_NAME_YOU=규석`
- `APP_DISPLAY_NAME_WIFE=다혜`

After deploy, note the frontend URL:

- Example: `https://acg-wang.vercel.app`

## 4. Update Meta app URLs

In Meta app settings, update:

- OAuth redirect URI:
  - `https://your-vercel-domain/api/auth/meta/callback`
- Privacy policy URL:
  - `https://your-vercel-domain/privacy-policy.html`
- Terms of service URL:
  - `https://your-vercel-domain/terms.html`
- Data deletion URL:
  - `https://your-vercel-domain/data-deletion.html`

## 5. Test login

- Open `https://your-vercel-domain/login`
- Click the dashboard start button
- Complete Instagram login and consent
