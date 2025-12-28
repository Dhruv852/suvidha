
# 🚀 Deployment Guide: Suvidha AI

This guide covers deploying the Backend to **Render** and the Frontend to **Vercel** separately.

---

## ✅ Prerequisites

1.  **Git Repository**: Ensure your code is pushed to GitHub.
    ```bash
    git add .
    git commit -m "Final deployment check"
    git push origin main
    ```
2.  **Accounts**: You need accounts on [Render.com](https://render.com) and [Vercel.com](https://vercel.com).
3.  **API Key**: Have your `GEMINI_API_KEY` ready.

---

##  Backend Deployment (Render)

1.  **Create New Web Service**:
    *   Go to [dashboard.render.com](https://dashboard.render.com).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository (`suvidha`).

2.  **Configuration Settings**:
    *   **Name**: `suvidha-backend` (or any name)
    *   **Root Directory**: `backend` (⚠️ Important: Do not leave blank)
    *   **Runtime**: `Python 3`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --workers 2`
    *   **Plan**: Free (or Starter)

3.  **Environment Variables**:
    *   Scroll down to "Environment Variables".
    *   Add Key: `GEMINI_API_KEY`
    *   Add Value: `your_actual_api_key_here`
    *   Add Key: `PYTHON_VERSION` (Optional, good practice)
    *   Add Value: `3.11.8`

4.  **Deploy**:
    *   Click **Create Web Service**.
    *   Wait for the build to finish.
    *   Once live, copy the URL (e.g., `https://suvidha-backend.onrender.com`).

---

## Frontend Deployment (Vercel)

1.  **Import Project**:
    *   Go to [vercel.com/new](https://vercel.com/new).
    *   Import the same GitHub repository (`suvidha`).

2.  **Project Configuration**:
    *   **Framework Preset**: Next.js (should detect automatically).
    *   **Root Directory**: Click **Edit** and select `frontend`.

3.  **Environment Variables**:
    *   Expand the "Environment Variables" section.
    *   Add Key: `NEXT_PUBLIC_API_URL`
    *   Add Value: `https://suvidha-backend.onrender.com` (Paste the Render URL from above).
    *   *Note: Do NOT add a trailing slash `/` at the end.*

4.  **Deploy**:
    *   Click **Deploy**.
    *   Wait for the build.
    *   Your site will be live at `https://suvidha.vercel.app` (or similar).

---

## 🔍 Verification

1.  Open your **Vercel URL**.
2.  Type a message (e.g., "Tell me about GFR").
3.  **Check**:
    *   The loading state should appear ("Thinking...").
    *   If the backend is "sleeping" (free tier checks), you might see the "Reference System is initializing" message first. Wait 30s and try again.
    *   You should receive a response with citations.
