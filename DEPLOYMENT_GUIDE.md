# 🚀 StudySquad Public Server Deployment & Hosting Guide

This guide provides step-by-step instructions to host **StudySquad** on a public server so real users across the globe can register, form study squads, chat in real-time, synchronize Pomodoro sessions, and join live **Google Meet** or **Zoom** video calls.

---

## 📋 Architecture Overview

* **Frontend**: React 19 + Vite + Tailwind CSS + Socket.io-client.
* **Backend**: Node.js + Express + Socket.io + Prisma ORM.
* **Database**: SQLite (Local development) or PostgreSQL (Production cloud hosting via Supabase/Neon/Railway).

---

## 🌐 Option 1: Unified 1-Click Deployment on Render (Easiest)

In this setup, your Render Web Service builds both the frontend and runs the backend together on the same domain.

### Step 1: Push your code to GitHub
```bash
git init
git add .
git commit -m "feat: production ready studysquad"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/studysquad.git
git push -u origin main
```

### Step 2: Create a Free PostgreSQL Database (Supabase or Render)
1. Go to [Supabase](https://supabase.com) (or Neon.tech) and create a free project.
2. In Project Settings -> Database, copy your **Connection String (URI)** (e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`).
3. In `backend/prisma/schema.prisma`, update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### Step 3: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New + -> Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   * **Name**: `studysquad-live`
   * **Root Directory**: `backend` (or leave empty if using root commands)
   * **Build Command**:
     ```bash
     npm install && npm run build && cd backend && npm install && npm run prisma:push
     ```
   * **Start Command**:
     ```bash
     node server.js
     ```
4. Add **Environment Variables** in Render:
   * `NODE_ENV`: `production`
   * `DATABASE_URL`: `your_postgresql_connection_string`
   * `JWT_SECRET`: `your_super_strong_random_secret_string`
   * `CLIENT_URL`: `*`
   * `GEMINI_API_KEY`: *(optional, for AI study goals & matching)*
   * `GOOGLE_CLIENT_ID`: *(optional, for Google Sign-In)*
5. Click **Create Web Service**. Render will deploy your application and give you a live URL like `https://studysquad-live.onrender.com`!

---

## ⚡ Option 2: Split Deployment (Vercel Frontend + Render Backend)

### Backend (Render or Railway):
1. **Root Directory**: `backend`
2. **Build Command**:
   ```bash
   npm install && npx prisma generate && npx prisma db push
   ```
3. **Start Command**:
   ```bash
   node server.js
   ```
4. **Environment Variables**:
   * `NODE_ENV`: `production`
   * `DATABASE_URL`: `postgresql://...`
   * `JWT_SECRET`: `your_jwt_secret`
   * `CLIENT_URL`: `https://your-frontend.vercel.app`

### Frontend (Vercel):
1. Import repository in [Vercel](https://vercel.com).
2. Framework Preset: **Vite**.
3. **Environment Variables**:
   * `VITE_API_URL`: `https://your-backend.onrender.com/api`
   * `VITE_SOCKET_URL`: `https://your-backend.onrender.com`
   * `VITE_GOOGLE_CLIENT_ID`: `your-google-oauth-client-id`
4. Click **Deploy**.

---

## 🎥 How Google Meet & Zoom Works for Real People

1. **Host creates a Squad**:
   * Selects **Google Meet**, **Zoom**, or **Discord**.
   * Can click **"Instant Google Meet (meet.new)"** to generate a live meeting link in seconds and paste it into the form.
2. **Real Users Join**:
   * Anyone who joins can click **"Launch Google Meet"** or **"Launch Zoom"** inside the squad room.
   * The meeting opens directly in their browser or Zoom app.
   * Host can click **"Edit Link"** at any time to post a new meeting link for the next study session.
   * Squad members can click **"Copy"** to share the invite link with their study group.

---

## 🔒 Security & Best Practices Checklist

- [x] Hardcoded `localhost:3001` eliminated with dynamic `VITE_API_URL` & `VITE_SOCKET_URL`.
- [x] CORS configured with `CLIENT_URL` support.
- [x] Database schema stores `meetingUrl` and supports PostgreSQL for persistent data.
- [x] Passwords hashed securely using `bcryptjs` with salt rounds.
- [x] JWT tokens securely verified on protected routes.
