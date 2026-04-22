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

## Deployment
Deploy the frontend to Vercel and keep the backend on a separate Node host.

### Frontend on Vercel
1. Set the Vercel project root to `frontend/`.
2. Use `npm run build` as the build command.
3. Set `VITE_API_URL` in Vercel to your deployed backend API URL.
4. Keep [frontend/vercel.json](frontend/vercel.json) so React Router routes resolve correctly on refresh.

### Backend hosting
1. Deploy the Express backend to a Node host such as Render, Railway, Fly.io, or a VPS.
2. Set `CLIENT_URL` to your Vercel frontend URL.
3. Set `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and `ADMIN_SECRET` in the backend environment.

### PayMongo webhook
1. Point the PayMongo webhook to `https://YOUR-BACKEND-DOMAIN/api/payments/webhook`.
2. Keep the webhook in Test Mode until you are ready for production.
3. Use the local test script to verify the full payment flow before shipping.

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
