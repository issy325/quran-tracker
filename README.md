# ☪ Quran Reading Tracker v2

A personal PWA to track your daily Quran reading progress with **Google Sheets cloud backup**.

## Features

- 📖 Track across **Para (30), Surah (114), Hizb Quarter (120), Ruku (558)**
- ✅ Mark sections as read & track frequency over time
- ⭐ Rate knowledge: Weak → Okay → Good → Strong → Memorized
- 🔥 Daily streaks & reading goals
- 📅 **GitHub-style calendar heatmap** showing your activity
- ↩️ **Undo** any action (5-second window)
- ☁️ **Google Sheets cloud backup** — your data, your control
- 📊 Weekly, monthly charts & progress stats
- 🌙 Dark/Light mode with Islamic green theme
- 📱 Installable PWA — works offline

---

## 🚀 SETUP GUIDE (Step by Step)

### Part 1: Set Up Google Sheets Backend (10 minutes)

#### Step 1: Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **"+ Blank spreadsheet"**
3. Name it **"Quran Tracker Database"** (or anything you like)
4. **Copy the Sheet URL** — you'll need it later to verify things are working

#### Step 2: Open Apps Script Editor

1. In your new Google Sheet, click **Extensions** → **Apps Script**
2. This opens a new tab with a code editor
3. You'll see a file called `Code.gs` with an empty function

#### Step 3: Paste the Backend Code

1. **Delete everything** in the `Code.gs` file
2. Open the file `google-apps-script/Code.gs` from this project
3. **Copy ALL the code** from that file
4. **Paste it** into the Apps Script editor
5. Press **Ctrl+S** (or Cmd+S) to save

#### Step 4: Run Initial Setup

1. In the Apps Script editor, find the **function dropdown** at the top (it says "myFunction" or "doGet")
2. Change it to **`setupSheets`**
3. Click the **▶ Run** button
4. Google will ask for **permissions** — click:
   - "Review Permissions"
   - Choose your Google account
   - Click "Advanced" (bottom left)
   - Click "Go to Quran Tracker Database (unsafe)" — this is safe, it's YOUR script
   - Click "Allow"
5. You should see a popup saying **"✅ Setup complete!"**
6. Go back to your Google Sheet tab — you'll see two new sheets: **"Readings"** and **"Settings"**

#### Step 5: Deploy as Web App

1. Back in the Apps Script editor, click **Deploy** → **New deployment**
2. Click the ⚙️ gear icon next to "Select type" → choose **"Web app"**
3. Fill in:
   - **Description**: "Quran Tracker API"
   - **Execute as**: "Me"
   - **Who has access**: "Anyone" (this is needed for the PWA to connect — only YOU will know the URL)
4. Click **Deploy**
5. Google will show you a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
6. **⚠️ COPY THIS URL** — you'll paste it into your app later!

> **💡 Tip**: Keep this URL private. Anyone with it could read/write to your sheet. But it's only accessible if someone knows the exact URL.

---

### Part 2: Deploy the PWA (5 minutes)

#### Step 1: Push to GitHub

1. Create a **new repository** at [github.com/new](https://github.com/new)
2. Name it `quran-tracker`
3. Open a terminal in this project folder:

```bash
git init
git add .
git commit -m "Initial commit - Quran Tracker v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/quran-tracker.git
git push -u origin main
```

#### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"Add New Project"**
3. Select your `quran-tracker` repository
4. Vercel auto-detects Vite — click **"Deploy"**
5. Wait ~1 minute → Done! You get a URL like `quran-tracker.vercel.app`

#### Step 3: Connect Google Sheets

1. Open your new app URL on your phone
2. Go to **Settings** (⚙️ tab)
3. Find **"☁️ Google Sheets Sync"**
4. **Paste your Apps Script URL** from Part 1, Step 5
5. Tap **Save**
6. You should see a green dot saying "Synced!"

#### Step 4: Install on Your Phone

**Android:**
1. Open the app URL in Chrome
2. Tap the menu (⋮) → **"Add to Home Screen"** (or you may see an install banner)
3. Tap "Install"

**iPhone:**
1. Open the app URL in **Safari** (not Chrome!)
2. Tap the **Share button** (⬆️ square with arrow)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap "Add"

🎉 **Done!** The app now appears on your home screen like a real app!

---

### Part 3: How It Works

#### Data Flow
```
You use the app → Saves to phone (localStorage)
                → Auto-syncs to Google Sheets (every 2 seconds)
                → Your Sheet becomes a real-time backup
```

#### Undo Feature
- Every time you mark something as read or change a rating, you get a **5-second undo toast**
- Tap "UNDO" to reverse the action
- Works for up to 10 recent actions

#### Calendar Heatmap
- Shows your reading activity for the last 6 months
- Darker green = more readings that day
- Just like GitHub's contribution graph!

#### Offline Mode
- The app works **completely offline** after first load
- Changes made offline sync when you're back online

---

## 💡 FAQ

**Q: Is my data safe?**
A: Your data lives in TWO places — your phone's browser AND your Google Sheet. Even if you clear your browser, the Google Sheet backup remains.

**Q: Can I access my data from another device?**
A: Yes! Just open the app on another device, paste the same Apps Script URL in Settings, and it will load your data from Google Sheets.

**Q: What if I need to update the app?**
A: Push changes to GitHub → Vercel auto-deploys within a minute.

**Q: How do I update the Apps Script if needed?**
A: Open your Google Sheet → Extensions → Apps Script → Edit code → Deploy → Manage deployments → Edit (pencil icon) → Version: New version → Deploy.

---

## 📂 Project Structure

```
quran-tracker/
├── google-apps-script/
│   └── Code.gs              ← Backend (copy to Google Apps Script)
├── public/
│   ├── favicon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── src/
│   ├── App.jsx               ← Main app with all features
│   └── main.jsx              ← Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md                 ← You are here
```

---

## 🛠️ Local Development

```bash
npm install
npm run dev        # Start dev server at localhost:5173
npm run build      # Build for production
npm run preview    # Preview production build
```

---

Built with ❤️ for the Ummah
