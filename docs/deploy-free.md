# 100% Free Cloud Deployment Guide ($0.00 / month forever)

This guide configures a 100% free development/staging deployment for DebtControl using free-tier cloud providers.

---

## Free Architecture Stack

```
+-----------------------------------------------------------------------------------+
|                              100% FREE CLOUD SETUP                                |
|                                                                                   |
|  [ React Frontend ]  ---> Hosted on Vercel or Render Static Sites ($0/mo)       |
|                                                                                   |
|  [ Go API Backend ]  ---> Hosted on Render Free Web Service ($0/mo)                |
|                                                                                   |
|  [ PostgreSQL DB ]  ---> Hosted on Neon.tech or Supabase ($0/mo)                   |
|                                                                                   |
|  [ Redis Cache ]     ---> Hosted on Upstash Redis ($0/mo)                         |
+-----------------------------------------------------------------------------------+
```

---

## Step 1: Create Free Database & Redis (5 mins)

### A. Free PostgreSQL on Neon.tech ($0/mo)
1. Sign up for free at [Neon.tech](https://neon.tech/).
2. Create project `debtcontrol-dev`.
3. Copy your Connection String (`postgres://user:pass@ep-xyz.neon.tech/debtcontrol?sslmode=require`).

### B. Free Redis on Upstash ($0/mo)
1. Sign up for free at [Upstash.com](https://upstash.com/).
2. Create Redis Database `debtcontrol-redis`.
3. Copy host (`xyz.upstash.io`), port (`6379`), and password.

---

## Step 2: Deploy Go API on Render Free Web Service ($0/mo)

1. Sign up for free at [Render.com](https://render.com/).
2. Click **New** -> **Web Service**.
3. Connect GitHub repository `GuilleJimenez0812/DebtControl`.
4. Settings:
   * **Root Directory**: `backend`
   * **Runtime**: `Docker`
   * **Instance Type**: `Free` ($0/mo)
5. Environment Variables:
   * `POSTGRES_HOST`: `ep-xyz.neon.tech`
   * `POSTGRES_USER`: `neon_user`
   * `POSTGRES_PASSWORD`: `neon_password`
   * `POSTGRES_DB`: `debtcontrol`
   * `POSTGRES_PORT`: `5432`
   * `REDIS_HOST`: `xyz.upstash.io`
   * `REDIS_PORT`: `6379`
   * `JWT_SECRET`: `super-secret-debtcontrol-free-key-2026`
6. Click **Create Web Service**. Your Go API URL will be: `https://debtcontrol-api.onrender.com`.

---

## Step 3: Deploy React Frontend on Vercel / Render ($0/mo)

### Option A: Vercel (Fastest React Free Hosting)
1. Sign up for free at [Vercel.com](https://vercel.com/).
2. Import project `GuilleJimenez0812/DebtControl`.
3. Settings:
   * **Root Directory**: `frontend`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Click **Deploy**. Your React Frontend URL will be live at `https://debtcontrol.vercel.app`!
