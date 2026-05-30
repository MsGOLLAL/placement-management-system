# Deployment Guide

This app needs **Node.js + Express** and a **network-reachable Oracle database**.  
**Vercel alone will not work** — it cannot run your Express server or connect to Oracle on your PC (that causes `404: NOT_FOUND`).

---

## Option 1: Render.com (recommended live URL)

Hosts frontend + backend together on one URL.

### Step 1 — Oracle database in the cloud

Your **local Oracle 11g XE** (`localhost:1521/xe`) is only on your computer. Render cannot reach it.

Use one of:

| Option | Notes |
|--------|--------|
| **Oracle Cloud Autonomous Database (Free Tier)** | Best for real deployment. [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/) |
| **Keep DB local + Option 2 (ngrok)** | Quick demo only |

For **Autonomous DB**:

1. Create an **Always Free** Autonomous Database in Oracle Cloud.
2. Run your table scripts / import schema (same tables as local).
3. Copy the **connection string** from the DB console (Wallet or TLS string).
4. In Render environment variables set:

```env
ORACLE_USER=your_db_user
ORACLE_PASSWORD=your_db_password
ORACLE_CONNECT_STRING=(your autonomous connection string from OCI)
ORACLE_USE_THIN=true
NODE_ENV=production
DEFAULT_OFFICER_PASSWORD=admin123
DEFAULT_STUDENT_PASSWORD=student123
```

Do **not** set `ORACLE_CLIENT_LIB_DIR` on Render (Linux uses Thin mode).

### Step 2 — Deploy on Render

1. Push code to GitHub: [MsGOLLAL/placement-management-system](https://github.com/MsGOLLAL/placement-management-system)
2. Go to [render.com](https://render.com) → **Sign Up** (use GitHub).
3. **New +** → **Web Service** → connect your repo.
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
5. Add all environment variables from Step 1.
6. Click **Create Web Service**.

Your live URL will look like:

`https://placement-management-system.onrender.com`

Open that URL — login page should load. API calls go to the same host (`/api/...`).

### Step 3 — Free tier note

Render free services **sleep after inactivity** (~50s cold start on first visit).

---

## Option 2: Quick public demo (local DB + ngrok)

Use your **existing Oracle 11g** on PC; expose only the Node server.

```powershell
cd D:\dbmsminiproject\placement-management-system
npm start
```

In another terminal:

```powershell
ngrok http 3000
```

Share the `https://xxxx.ngrok.io` URL for viva/demo.  
Oracle stays local; ngrok tunnels HTTP only.

Install ngrok: https://ngrok.com/download

---

## Option 3: Local only (no deploy)

```powershell
npm install
npm start
```

Open: **http://localhost:3000**

`.env` for local Oracle 11g:

```env
ORACLE_USER=gollal
ORACLE_PASSWORD=your_password
ORACLE_CONNECT_STRING=localhost:1521/xe
ORACLE_CLIENT_LIB_DIR=C:\oraclexe\app\oracle\product\11.2.0\server\bin
PORT=3000
```

Do **not** set `ORACLE_USE_THIN=true` for local 11g.

---

## Why Vercel showed 404

| What you deployed | Result |
|-------------------|--------|
| GitHub repo on Vercel as static site | No `server.js`, no `/api`, no Oracle → **404** |
| This project on **Render** as Web Service | Express runs → **works** |

---

## Checklist after deploy

- [ ] `https://your-app.onrender.com/api/health` returns `{"status":"ok"}`
- [ ] Login page loads at root URL
- [ ] Officer login works (email from `PLACEMENT_OFFICER` + `admin123`)
- [ ] Dashboard loads stats (proves Oracle connection)

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `404 NOT_FOUND` on Vercel | Use Render (Option 1), not Vercel |
| `NJS-138` / Thin mode | On Render set `ORACLE_USE_THIN=true` |
| `NJS-518` service not found | Wrong `ORACLE_CONNECT_STRING`; local `xe` does not work on cloud |
| `ORA-01017` | Wrong `ORACLE_USER` / `ORACLE_PASSWORD` in Render env |
| App sleeps / slow first load | Normal on Render free tier |
