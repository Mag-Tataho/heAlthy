# 🌿 heAlthy — AI-Powered Diet Planner

A full-stack MERN app with AI-generated meal plans, food search, social feed, progress tracking, and more.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + MongoDB
- **AI:** Groq API (llama-3.3-70b / llama-3.1-8b-instant)

---

## Local Development

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/heAlthy.git
cd heAlthy
```

### 2. Backend setup
```bash
cd backend
cp .env.backend.example .env       # then fill in your values
npm install
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env       # set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Open http://localhost:3000

### Demo accounts (auto-created on first server start)
- **Free:** free@test.com / password123
- **Premium:** premium@test.com / password123

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`) |
| `GROQ_API_KEY` | From https://console.groq.com |
| `FRONTEND_URL` | Frontend URL for CORS |
| `CLIENT_URL` | Frontend URL used by PayMongo redirect links |
| `PAYMONGO_SECRET_KEY` | Secret key for the PayMongo QRPH premium checkout |
| `PAYMONGO_PUBLIC_KEY` | Public key if you need it for client-side PayMongo flows |
| `PAYMONGO_PREMIUM_PRICE_PHP` | Premium checkout amount in PHP (default `199`) |
| `PAYMONGO_WEBHOOK_SECRET` | Webhook secret used to verify PayMongo events |
| `ADMIN_SECRET` | Secret header value required by the admin upgrade route |
| `PASSWORD_RESET_EXPIRES_MINUTES` | Reset link validity in minutes (default `30`) |
| `EMAIL_ID` | Sender email account used for reset emails |
| `EMAIL_PASSWORD` | Email app password |
| `MAIL_FROM` | Sender value for password reset emails |

Optional SMTP overrides (advanced): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

Use [frontend/.env.example](frontend/.env.example) as the local template for frontend env values.

---

## Deployment (GitHub + Vercel + MongoDB Atlas)

This repo is set up for two Vercel projects from one GitHub repo:
- Frontend project root: [frontend](frontend)
- Backend project root: [backend](backend)

### 1. Push latest code to GitHub
Run these commands from the repository root:

git add .
git commit -m "Prepare Vercel deployment"
git push origin main

If your branch name is not main, replace it with your branch.

### 2. Create MongoDB Atlas database
1. Create or sign in to MongoDB Atlas.
2. Create a cluster (M0 free tier is fine for testing).
3. Create a database user with password.
4. Add Network Access:
	- For quick setup: allow 0.0.0.0/0
	- For stricter setup: allow only Vercel egress ranges
5. Get your connection string (Drivers > Node.js), for example:
	mongodb+srv://USER:PASSWORD@cluster-name.xxxxx.mongodb.net/healthy?retryWrites=true&w=majority

### 3. Deploy backend to Vercel
1. In Vercel dashboard, click New Project.
2. Import your GitHub repository.
3. Set Root Directory to [backend](backend).
4. Framework Preset: Other.
5. Add environment variables in Vercel Project Settings > Environment Variables:
	- MONGODB_URI = your Atlas connection string
	- JWT_SECRET = long random secret
	- JWT_EXPIRES_IN = 7d
	- CLIENT_URL = your frontend Vercel URL
	- FRONTEND_URL = your frontend Vercel URL
	- CORS_ORIGINS = your frontend URL (or comma-separated list including preview URLs)
	- GROQ_API_KEY
	- PAYMONGO_SECRET_KEY
	- PAYMONGO_PUBLIC_KEY (optional)
	- PAYMONGO_PREMIUM_PRICE_PHP = 199
	- PAYMONGO_WEBHOOK_SECRET
	- ADMIN_SECRET
	- PASSWORD_RESET_EXPIRES_MINUTES = 30
	- SIGNUP_OTP_EXPIRES_MINUTES = 10
	- MAX_AVATAR_DATA_URL_LENGTH = 2500000
	- EMAIL_ID
	- EMAIL_PASSWORD
	- MAIL_FROM
6. Deploy.
7. Open backend health check:
	- https://YOUR-BACKEND-PROJECT.vercel.app/api/health

### 4. Deploy frontend to Vercel
1. In Vercel dashboard, click New Project.
2. Import the same GitHub repository again.
3. Set Root Directory to [frontend](frontend).
4. Keep build defaults for Vite:
	- Build Command: npm run build
	- Output Directory: dist
5. Add environment variable:
	- VITE_API_URL = https://YOUR-BACKEND-PROJECT.vercel.app
6. Deploy.

### 5. Re-check backend CORS after frontend deploy
Update backend env variables if needed:
- CLIENT_URL = exact frontend domain
- FRONTEND_URL = exact frontend domain
- CORS_ORIGINS = exact frontend domain (and optional preview domains)

Then redeploy backend from Vercel Deployments tab.

### 6. Configure PayMongo webhook
1. In PayMongo dashboard (Test Mode first), set webhook URL to:
	- https://YOUR-BACKEND-PROJECT.vercel.app/api/payments/webhook
2. Subscribe to events:
	- source.chargeable
	- payment.paid
3. Copy webhook secret from PayMongo and set PAYMONGO_WEBHOOK_SECRET in backend Vercel env.
4. Redeploy backend once after setting the secret.

### 7. End-to-end verification checklist
1. Frontend can register and login.
2. Profile page loads and saves.
3. Backend health endpoint returns ok.
4. Premium checkout creates PayMongo session.
5. Payment success returns to frontend payment success page.
6. User becomes premium after webhook/confirmation.

### 8. Useful local verification command
Run from repository root to validate local PayMongo flow:

powershell -ExecutionPolicy Bypass -File .\scripts\test-paymongo-local.ps1 -WebhookMode PaymentPaid

---

## Features
- 🥗 AI-generated meal plans (Free: 1-day, Premium: 7-day personalized)
- 💬 AI Nutrition Coach chat (Premium)
- 🔍 Food search with full nutrition info
- 🍽️ Custom meals with ingredient tracking
- 👥 Friends feed with expandable meal plan sharing
- 📊 Progress tracking with charts
- 🌙 Dark mode
- 📱 Mobile responsive
