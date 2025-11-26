# REELS TROUBLESHOOTING GUIDE - QUICK START

## 🚨 REELS NOT PLAYING? FOLLOW THESE STEPS:

### STEP 1: Open Browser Console
1. Press `F12` on your keyboard (or `Ctrl+Shift+I` / `Cmd+Option+I`)
2. Click the "Console" tab
3. Keep it open for the next steps

### STEP 2: Run the Test Script
Copy and paste this command into the console and press Enter:

```javascript
fetch('/monitixe/test_reels.js').then(r=>r.text()).then(eval).then(()=>testReelsSystem())
```

OR manually:
1. Open the file: `monitixe/test_reels.js`
2. Copy ALL the contents
3. Paste into console
4. Press Enter
5. Then type: `testReelsSystem()`
6. Press Enter

### STEP 3: Read the Test Results

The test will show you exactly what's wrong. Look for these common issues:

#### ❌ PROBLEM A: "REELs WITHOUT video files"
```
❌ REELs WITHOUT video files: 2
💡 RECOMMENDED ACTION:
   Run this command to clear broken REELs:
   localStorage.removeItem("uploadedReels"); location.reload();
```

**SOLUTION:** Copy the command shown and paste it into console, press Enter.
Then upload a NEW REEL.

#### ❌ PROBLEM B: "No REELs found in localStorage"
```
❌ No REELs found in localStorage
```

**SOLUTION:** You haven't uploaded any REELs yet. Go to Upload page and upload one.

#### ❌ PROBLEM C: "MISMATCH DETECTED"
```
⚠️ MISMATCH DETECTED:
   2 REELs in localStorage have no video file in IndexedDB
```

**SOLUTION:** Old broken REELs. Clear them:
```javascript
localStorage.removeItem("uploadedReels");
location.reload();
```

### STEP 4: Upload a Fresh REEL

After clearing broken data:
1. Go to the **Upload** page
2. Click **"Upload REEL"** button
3. Select a video file (any MP4)
4. Fill in title and description
5. Click **Publish**
6. Watch the console - you should see:
   ```
   === REELS STORAGE DIAGNOSTIC ===
   ✅ Found 1 REELs in localStorage
   ✅ Found 1 video files in IndexedDB
   ```

### STEP 5: Check if Video Plays

After uploading:
1. You'll be redirected to REELS page
2. The video should start playing automatically
3. Look in console for video events:
   ```
   Video reel_xxx: loadstart event
   Video reel_xxx: metadata loaded
   Video reel_xxx: can play
   Video reel_xxx: playing
   ```

If you see ❌ **ERROR** messages, copy them and check below.

---

## 🔍 COMMON ERROR MESSAGES

### Error: "Reel not found"
```
FAILED to load reel video for reel_xxx: Error: Reel not found
```
**Meaning:** Video metadata exists but video file is missing from IndexedDB
**Fix:** Clear broken REELs and re-upload

### Error: "No file flag set"  
```
⚠️ Reel reel_xxx has no file flag set
```
**Meaning:** REEL was created without proper file handling
**Fix:** This is an old/broken REEL - clear and re-upload

### Error: Video element shows "Video not available"
**Meaning:** Video failed to load
**Fix:** Check console for specific error, likely need to clear and re-upload

---

## 🧹 CLEAN SLATE - START FRESH

If nothing works, do a complete reset:

### Option 1: Clear REELS Only
```javascript
// In browser console
localStorage.removeItem("uploadedReels");
indexedDB.deleteDatabase('MONITIXE_REELS_DB');
location.reload();
```

### Option 2: Clear Everything (nuclear option)
```javascript
// WARNING: This clears ALL MONITIXE data
localStorage.clear();
indexedDB.deleteDatabase('MONITIXE_REELS_DB');
indexedDB.deleteDatabase('MONITIXE_VIDEOS_DB');
location.reload();
```

Then upload a fresh REEL.

---

## ✅ WHAT SUCCESS LOOKS LIKE

When everything works correctly:

### In Console:
```
=== LOADING REELS PAGE ===
=== REELS STORAGE DIAGNOSTIC ===
✅ Found 1 REELs in localStorage
✅ Found 1 video files in IndexedDB
✅ All REELs have matching video files

Creating reel element for: reel_1234567890_abc
✅ Video file loaded successfully
✅ Video URL created: blob:http://...

Video reel_1234567890_abc: loadstart event
Video reel_1234567890_abc: metadata loaded - duration: 15.5s
Video reel_1234567890_abc: can play
Video reel_1234567890_abc: playing
```

### On Screen:
- Video plays automatically
- You can see the video content
- Controls work (like, comment, share buttons)
- You can swipe/scroll to next REEL

---

## 🆘 STILL NOT WORKING?

Share this information:

1. Browser name and version
2. Operating system
3. Complete console output from `testReelsSystem()`
4. Screenshot of the REELS page
5. Any error messages in red in the console

Run this to get system info:
```javascript
console.log('Browser:', navigator.userAgent);
console.log('Storage available:', 'indexedDB' in window);
console.log('Blob support:', typeof Blob !== 'undefined');
```

---

## 📝 QUICK COMMANDS REFERENCE

```javascript
// Test entire system
testReelsSystem()

// Simple debug info
debugReels()

// Clear broken REELs
localStorage.removeItem("uploadedReels");
location.reload();

// Complete reset
localStorage.clear();
indexedDB.deleteDatabase('MONITIXE_REELS_DB');
location.reload();

// Force reload REELS page
forceLoadReels()

// Check storage directly
JSON.parse(localStorage.getItem('uploadedReels'))

// Check for diagnostics
diagnoseReelsStorage()
```

---

## 💡 PREVENTION TIPS

1. **Always check console** when uploading - make sure you see success messages
2. **One REEL at a time** - don't upload multiple REELs quickly
3. **Keep console open** while testing - catch errors early
4. **Use modern browser** - Chrome, Firefox, Safari, or Edge
5. **Check file size** - Keep videos under 100MB for best results

---

## 🎯 MOST LIKELY CAUSE

Based on your symptoms ("blank section, nothing playing"), the most probable issue is:

**Old REELs uploaded before the storage system was fixed**

The metadata (title, description) is in localStorage, but the actual video files weren't saved to IndexedDB.

**SOLUTION:** Clear old data and upload fresh:
```javascript
localStorage.removeItem("uploadedReels");
location.reload();
```

Then upload a new REEL - it should work!
