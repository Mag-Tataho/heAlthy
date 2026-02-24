# heAlthy — AI-Powered Diet Planner

A full-stack MERN app with Groq AI for personalized meal planning, food tracking, and social sharing.

## Tech Stack
- **Backend:** Node.js, Express, MongoDB, Mongoose, JWT, Groq SDK
- **Frontend:** React 18, Vite, Tailwind CSS, React Router
- **AI:** Groq (free — llama-3.3-70b-versatile + llama-3.1-8b-instant)
- **Food Data:** Open Food Facts API (3M+ products)

## Setup

### 1. Get a free Groq API key
Sign up at https://console.groq.com → API Keys → Create API Key

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your values
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

## .env values needed
| Key | Value |
|-----|-------|
| PORT | 5000 |
| MONGODB_URI | mongodb://localhost:27017/diet-planner |
| JWT_SECRET | any long random string |
| JWT_EXPIRES_IN | 7d |
| GROQ_API_KEY | gsk_... from console.groq.com |
| FRONTEND_URL | http://localhost:3000 |

## Features
- 🥗 AI meal plan generation (free 1-day, premium 7-day)
- 🍽️ Custom meals with full nutrition info
- 👥 Friends system with feed, likes, comments & replies
- 💬 Private messages and group chat
- 🔍 Food search (Open Food Facts + AI fallback)
- 📈 Progress tracking with charts
- 🌙 Dark mode
- 💰 Budget-aware meal planning (PHP / USD)
