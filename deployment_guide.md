# SolDocs: Full Deployment Guide

> **Stack:** React (Render) + Node.js + Gotenberg (Oracle Cloud Free VM) + Supabase

---

## 📋 Pre-flight Checklist

Before starting, make sure you have accounts on:
- [ ] [GitHub](https://github.com) — free
- [ ] [Render](https://render.com) — free tier
- [ ] [Oracle Cloud](https://cloud.oracle.com) — Always Free tier (requires credit card for verification, won't charge)

---

## PHASE 1 — Push Code to GitHub

### Step 1.1 — Create `.env.example` files (do NOT commit real `.env`)

Your `.gitignore` already ignores `.env` files ✅. Create placeholder files instead:

**`backend/.env.example`** (create this file):
```
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.onrender.com
GOTENBERG_URL=http://localhost:3005
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

**`frontend/.env.example`** (create this file):
```
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 1.2 — Initialize Git and push to GitHub

Open **PowerShell** inside `C:\Users\abhis\OneDrive\Desktop\SolDocs` and run these commands **one by one**:

```powershell
# 1. Initialize git (if not already done)
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial commit: SolDocs WCR Generator"

# 4. Create a new repo on GitHub first at https://github.com/new
#    Name it: soldocs  (or whatever you prefer)
#    Set it to PRIVATE or PUBLIC
#    Do NOT initialize with README (you already have one)

# 5. Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/soldocs.git

# 6. Push
git branch -M main
git push -u origin main
```

> [!NOTE]
> Go to https://github.com/new first and create the repo before running step 5.

---

## PHASE 2 — Deploy Frontend on Render (Static Site)

### Step 2.1 — Update frontend env for production

Before deploying, the frontend `REACT_APP_API_URL` must point to your Oracle Cloud backend URL. You'll set this as an **environment variable on Render** (not in the file).

### Step 2.2 — Deploy on Render

1. Go to [https://render.com](https://render.com) → **Sign up / Log in**
2. Click **"New +"** → **"Static Site"**
3. Connect your **GitHub account** and select the `soldocs` repo
4. Configure these settings:

| Setting | Value |
|---|---|
| **Name** | `soldocs-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `build` |

5. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `REACT_APP_API_URL` | *(leave blank for now, fill after Oracle deploy)* |
| `REACT_APP_SUPABASE_URL` | `https://bnybmwjzgkhkjjramglt.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | *(paste your full anon key)* |

6. Click **"Create Static Site"** — Render will build and give you a URL like:
   `https://soldocs-frontend.onrender.com`

> [!IMPORTANT]
> **Save this URL** — you'll need it for CORS configuration on the backend.

---

## PHASE 3 — Deploy Backend + Gotenberg on Oracle Cloud Free VM

### Step 3.1 — Create Oracle Cloud Account

1. Go to [https://cloud.oracle.com](https://cloud.oracle.com) → **"Start for free"**
2. Complete signup (need credit card, but you won't be charged for Always Free resources)
3. Choose **Home Region** — pick the one closest to you (e.g., India: `ap-mumbai-1`)

### Step 3.2 — Create a Free VM Instance

1. In the Oracle Cloud Console, go to **Compute → Instances → Create Instance**

2. Configure:

| Setting | Value |
|---|---|
| **Name** | `soldocs-backend` |
| **Image** | Ubuntu 22.04 (Canonical) |
| **Shape** | `VM.Standard.A1.Flex` (Always Free ARM) |
| **OCPUs** | 2 (free allows up to 4 total) |
| **Memory** | 12 GB (free allows up to 24 GB total) |
| **Network** | Default VCN, create new, allow public IP |

3. **SSH Keys**: Download the private key (`.key` file) — you need this to connect

4. Click **Create** — VM will be ready in 2-3 minutes

5. Note the **Public IP address** of your VM (e.g., `140.238.x.x`)

### Step 3.3 — Configure Firewall (Open Ports)

**In Oracle Cloud Console:**
1. Go to **Networking → Virtual Cloud Networks → [your VCN] → Security Lists**
2. Click on the Default Security List
3. Add **Ingress Rules**:

| Protocol | Source CIDR | Port | Description |
|---|---|---|---|
| TCP | 0.0.0.0/0 | 5000 | Backend API |
| TCP | 0.0.0.0/0 | 22 | SSH (already there) |

> [!NOTE]
> Port 3005 for Gotenberg does NOT need to be publicly exposed — it's only accessed internally by the backend.

### Step 3.4 — SSH into VM and Setup

Open PowerShell on your Windows machine:

```powershell
# Connect to VM (replace path and IP)
ssh -i C:\Users\abhis\Downloads\your-key.key ubuntu@YOUR_VM_PUBLIC_IP
```

Once connected to the VM, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version
```

### Step 3.5 — Open Ubuntu Firewall Ports

```bash
# Open port 5000 (backend)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5000 -j ACCEPT
sudo netfilter-persistent save

# Or using UFW (simpler)
sudo ufw allow 5000/tcp
sudo ufw reload
```

### Step 3.6 — Clone Your Repo on the VM

```bash
# Install git
sudo apt install git -y

# Clone your repo (use HTTPS, enter GitHub credentials or use token)
git clone https://github.com/YOUR_USERNAME/soldocs.git

# Navigate to the project
cd soldocs
```

### Step 3.7 — Create Production `.env` on the VM

```bash
# Create backend .env
nano backend/.env
```

Paste this content (press `Ctrl+X`, then `Y`, then `Enter` to save):

```
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://soldocs-frontend.onrender.com
GOTENBERG_URL=http://gotenberg:3000
SUPABASE_URL=https://bnybmwjzgkhkjjramglt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueWJtd2p6Z2toa2pqcmFtZ2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzI0NzcsImV4cCI6MjA5MDgwODQ3N30.Y_pBodIMbcm1gcMkrJzcg2M0mTABtprKgRsGHmtT0PM
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

> [!IMPORTANT]
> Replace `CORS_ORIGIN` with your actual Render frontend URL.
> Get `SUPABASE_SERVICE_KEY` from Supabase Dashboard → Settings → API → service_role key.

### Step 3.8 — Start the Backend with Docker Compose

```bash
# From ~/soldocs directory
docker compose up -d

# Check running containers
docker ps

# View backend logs
docker compose logs backend -f

# View gotenberg logs
docker compose logs gotenberg -f
```

You should see two containers running:
- `soldocs-backend-1` on port 5000
- `soldocs-gotenberg-1` on port 3005 (internal only)

### Step 3.9 — Test the Backend

From your **Windows machine** (not VM):

```
Open browser and visit: http://YOUR_VM_PUBLIC_IP:5000/health
```

You should see: `{"status":"Server is running","timestamp":"..."}`

---

## PHASE 4 — Connect Frontend to Backend

### Step 4.1 — Update Render Environment Variable

1. Go to [Render Dashboard](https://dashboard.render.com) → `soldocs-frontend`
2. Click **"Environment"** tab
3. Update `REACT_APP_API_URL` to: `http://YOUR_VM_PUBLIC_IP:5000`
4. Click **"Save Changes"**
5. Render will automatically **redeploy** the frontend

> [!TIP]
> If you set up a domain name for your Oracle VM later, update this to `https://yourdomain.com`

---

## PHASE 5 — Auto-Start on VM Reboot

### Step 5.1 — Create a systemd service (optional but recommended)

```bash
sudo nano /etc/systemd/system/soldocs.service
```

Paste:

```ini
[Unit]
Description=SolDocs Backend + Gotenberg
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/soldocs
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable soldocs
sudo systemctl start soldocs
```

---

## PHASE 6 — Keeping Code Updated

When you make changes locally:

```powershell
# On your Windows machine - push changes
git add .
git commit -m "Your change description"
git push origin main
```

```bash
# On Oracle VM - pull and restart
cd ~/soldocs
git pull origin main
docker compose down
docker compose up -d --build
```

> [!TIP]
> You can automate this with a GitHub webhook + a simple script on the VM for CI/CD.

---

## 🔍 Troubleshooting

| Problem | Solution |
|---|---|
| Can't connect to port 5000 | Check Oracle Security List AND `sudo ufw status` |
| CORS error in browser | Update `CORS_ORIGIN` in backend `.env`, restart containers |
| Gotenberg PDF fails | Run `docker compose logs gotenberg` to check errors |
| Frontend build fails on Render | Check build logs, ensure `react-scripts` is in dependencies |
| Git push asks for password | Use a [GitHub Personal Access Token](https://github.com/settings/tokens) instead of password |

---

## 📌 Final URLs Summary

| Service | URL |
|---|---|
| Frontend | `https://soldocs-frontend.onrender.com` |
| Backend API | `http://YOUR_VM_PUBLIC_IP:5000` |
| Backend Health | `http://YOUR_VM_PUBLIC_IP:5000/health` |
| Gotenberg (internal) | `http://gotenberg:3000` (Docker internal only) |
