
# 🚀 Deployment Guide: Hugging Face Spaces (Backend)

We are moving the backend to **Hugging Face Spaces** because it offers **16GB RAM** for free, which is perfect for our AI/RAG system (unlike Render's 512MB which caused crashes).

---

## 1. Create the Space
1.  Go to [huggingface.co/new-space](https://huggingface.co/new-space).
2.  **Space Name**: `suvidha-backend` (or similar).
3.  **License**: `MIT`.
4.  **Current Space SDK**: Select **Docker** (Very Important!).
5.  **Space Hardware**: Select **Free** (CPU basic · 2 vCPU · 16GB RAM).
6.  Click **Create Space**.

---

## 2. Upload Your Code
You can upload files directly via the browser or use git. We will use the browser/drag-and-drop for simplicity, or git if you prefer.

### Option A: Via Browser (Fastest for testing)
1.  In your new Space, click on the **Files** tab.
2.  Click **+ Add file** -> **Upload files**.
3.  Drag and drop these files/folders from your project:
    *   `src/Dockerfile` (The one we just created in root)
    *   `backend/` (The entire backend folder)
4.  **Important**: Because our `Dockerfile` refers to `backend/requirements.txt`, make sure the folder structure is preserved. 
    *   *Wait!* Hugging Face flat uploading might mess up directories.
    *   **Better Path**: Let's push our repo to Hugging Face!

### Option B: Push via Git (Recommended)
1.  Hugging Face gives you a git command, e.g., `git clone https://huggingface.co/spaces/Dhruv852/suvidha-backend`.
2.  Run that in your terminal (outside your current project logic or in a temp folder).
3.  Copy all your backend files into it.
4.  Push it back.

---

## 3. Configure Variables
1.  In your Space, go to **Settings**.
2.  Scroll to **Variables and secrets**.
3.  Click **New Secret** (Secrets are hidden, Variables are public).
    *   Name: `GEMINI_API_KEY`
    *   Value: `your-api-key-here`

---

## 4. Get the URL
1.  Once the "Building" status turns to "Running" (Green).
2.  Click the **Embed this space** button (top right ≡ menu) -> **Direct URL**.
    *   It will look like: `https://dhruv852-suvidha-backend.hf.space`
3.  Copy this URL.

## 5. Update Frontend
1.  Go to **Vercel**.
2.  Update the `NEXT_PUBLIC_API_URL` environment variable to this new Hugging Face URL.
3.  **Redeploy** Vercel.

---

## ⚠️ Important Note on Directory Structure
Hugging Face Docker spaces expect the `Dockerfile` at the root. Our `Dockerfile` copies `backend/` into the container.
Also ensure you create a `.dockerignore` to avoid uploading junk.
