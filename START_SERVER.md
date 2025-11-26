# 🚀 How to Run MONITIXE Properly

## The Problem
If you're seeing "Not allowed to load local resource: blob:null" errors, it's because you're opening `index.html` directly from your file system. Modern browsers block certain features (like blob URLs for videos) when files are opened this way.

## ✅ Solution: Run a Local Web Server

Choose **ONE** of these methods:

---

### Method 1: Python (Easiest - Most Computers Have This)

**If you have Python 3:**
```bash
cd monitixe
python -m http.server 8000
```

**If you have Python 2:**
```bash
cd monitixe
python -m SimpleHTTPServer 8000
```

Then open: **http://localhost:8000**

---

### Method 2: Node.js (If You Have It Installed)

**Install http-server globally:**
```bash
npm install -g http-server
```

**Run it:**
```bash
cd monitixe
http-server -p 8000
```

Then open: **http://localhost:8000**

---

### Method 3: VS Code (If You Use VS Code)

1. Install the **"Live Server"** extension by Ritwick Dey
2. Right-click on `index.html`
3. Select **"Open with Live Server"**

The browser will open automatically!

---

### Method 4: PHP (If You Have PHP)

```bash
cd monitixe
php -S localhost:8000
```

Then open: **http://localhost:8000**

---

## 🎉 After Starting the Server

1. Open the URL shown (usually `http://localhost:8000`)
2. Your REELS should now work perfectly!
3. All blob URLs and video playback will function correctly

## 🔍 How to Check What's Available

**Check Python:**
```bash
python --version
```

**Check Node.js:**
```bash
node --version
```

**Check PHP:**
```bash
php --version
```

---

**Note:** Keep the terminal window open while using the app. Press `Ctrl+C` to stop the server when done.
