# REELS Testing Checklist

## 🎯 Complete Testing Guide

Use this checklist to verify all REEL functionality is working correctly.

---

## ✅ Pre-Test Setup

- [ ] Open browser DevTools (Press F12)
- [ ] Navigate to Console tab
- [ ] Keep console open during all tests
- [ ] Take note of any error messages

---

## 📤 Test 1: Upload REEL

### Steps:
1. [ ] Navigate to **Upload** page
2. [ ] Click "Choose Video" or drag & drop a video file
3. [ ] Select **"REEL"** from the Type dropdown
4. [ ] Fill in the following:
   - [ ] Title: "Test REEL 1"
   - [ ] Description: "Testing REELS system"
   - [ ] Category: Select any (e.g., "Entertainment")
5. [ ] (Optional) Select a thumbnail
6. [ ] Click **"Publish"** button

### Expected Results:
- [ ] Toast notification: "✓ REEL uploaded successfully!"
- [ ] Automatic redirect to REELS page
- [ ] Console shows:
  ```
  === REEL UPLOAD: Adding to storage ===
  Saving reels to localStorage...
  Verification - Reels count: 1
  === REEL UPLOAD: Save complete ===
  ```

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 👀 Test 2: View REEL in REELS Section

### Steps:
1. [ ] Click **"REELS"** in the main menu
2. [ ] Wait for page to load
3. [ ] Observe the REELS viewer

### Expected Results:
- [ ] Your uploaded REEL is visible
- [ ] Video thumbnail displayed
- [ ] REEL title shown
- [ ] Channel name and avatar visible
- [ ] Like, comment, share buttons present
- [ ] Video plays (or ready to play)
- [ ] Console shows:
  ```
  === LOADING REELS PAGE ===
  Directly loaded from localStorage: 1 reels
  === REELS PAGE LOADED SUCCESSFULLY ===
  ```

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🎬 Test 3: View REEL in Studio

### Steps:
1. [ ] Click **"Studio"** in the main menu
2. [ ] Scroll down to **"Your REELs"** section
3. [ ] Observe the REELS list

### Expected Results:
- [ ] "Your REELs" section visible
- [ ] Your REEL displayed with:
  - [ ] Pink "REEL" badge
  - [ ] Thumbnail (vertical aspect ratio)
  - [ ] Title
  - [ ] Upload date
  - [ ] View count
  - [ ] Like count
  - [ ] Comment count
  - [ ] "View" button
  - [ ] "Delete" button
- [ ] Console shows:
  ```
  === LOADING STUDIO PAGE ===
  Total REELs in storage: 1
  User REELs: 1
  === STUDIO PAGE LOADED ===
  ```

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🔄 Test 4: Navigate Between Pages

### Steps:
1. [ ] From Studio, click **"Home"** in menu
2. [ ] Click **"REELS"** in menu
3. [ ] Verify REEL still visible
4. [ ] Click **"Explore"** in menu
5. [ ] Click **"REELS"** again
6. [ ] Verify REEL still visible

### Expected Results:
- [ ] REEL persists across navigation
- [ ] REEL loads each time you visit REELS page
- [ ] No errors in console

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 👥 Test 5: Cross-Profile Viewing

### Steps:
1. [ ] Click user avatar (top right)
2. [ ] Click **"Switch Profile"** or logout
3. [ ] Select a **different profile**
4. [ ] Navigate to **REELS** page

### Expected Results:
- [ ] Previous profile's REEL is **visible** in REELS page
- [ ] Can view and watch the REEL
- [ ] Navigate to **Studio** page
- [ ] Previous profile's REEL is **NOT visible** in Studio
- [ ] Only current profile's REELs shown in Studio

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🗑️ Test 6: Delete REEL

### Steps:
1. [ ] Switch back to original profile (that uploaded the REEL)
2. [ ] Navigate to **Studio** page
3. [ ] Find your REEL in "Your REELs" section
4. [ ] Click **"Delete"** button
5. [ ] Confirm deletion in dialog

### Expected Results:
- [ ] Confirmation dialog appears
- [ ] After confirming:
  - [ ] REEL removed from Studio list
  - [ ] Toast: "REEL deleted successfully"
  - [ ] Console shows deletion logs
- [ ] Navigate to **REELS** page
- [ ] REEL is **no longer visible**
- [ ] Console shows reduced REEL count

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🔍 Test 7: Multiple REELs

### Steps:
1. [ ] Upload **3 different REELs** (repeat Test 1 three times)
2. [ ] Navigate to **REELS** page
3. [ ] Observe all REELs

### Expected Results:
- [ ] All 3 REELs visible
- [ ] Can scroll between REELs (vertical scroll or arrows)
- [ ] Each REEL plays when focused
- [ ] Console shows: "Directly loaded from localStorage: 3 reels"
- [ ] Navigate to **Studio**
- [ ] All 3 REELs visible in "Your REELs" section

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🎥 Test 8: Video Aspect Ratios

### Steps:
Upload REELs with different aspect ratios:
1. [ ] Upload **vertical video** (9:16 - portrait)
2. [ ] Upload **horizontal video** (16:9 - landscape)
3. [ ] Upload **square video** (1:1)
4. [ ] Navigate to **REELS** page

### Expected Results:
- [ ] All three REELs accepted
- [ ] **No aspect ratio errors**
- [ ] All REELs visible in REELS page
- [ ] All REELs visible in Studio

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🔧 Test 9: Browser Console Check

### Steps:
1. [ ] In Console, type: `localStorage.getItem('uploadedReels')`
2. [ ] Press Enter
3. [ ] Observe output

### Expected Results:
- [ ] Shows JSON string with REEL data
- [ ] Contains all uploaded REELs
- [ ] Each REEL has proper structure:
  - [ ] `id` field present
  - [ ] `uploadedBy` field present (email)
  - [ ] `title` field present
  - [ ] `hasFile` is `true`

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 📊 Test 10: REEL Statistics

### Steps:
1. [ ] Navigate to **REELS** page
2. [ ] Click **Like** button on a REEL
3. [ ] Add a **comment** to the REEL
4. [ ] Navigate to **Studio** page
5. [ ] Find the REEL in "Your REELs"

### Expected Results:
- [ ] Like count increased
- [ ] Comment count increased
- [ ] Studio shows updated statistics

### Pass/Fail: ⬜ PASS  ⬜ FAIL

**Notes:** ________________________________

---

## 🚨 Common Issues & Solutions

### Issue: REELs not showing in REELS page

**Check:**
1. Open Console, look for errors
2. Type: `localStorage.getItem('uploadedReels')`
3. If null: Upload a REEL again
4. If has data: Check for JavaScript errors

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Re-upload REEL

---

### Issue: REELs not showing in Studio

**Check:**
1. Console output when loading Studio
2. Verify "User REELs" count in console
3. Check if `uploadedBy` matches current user email

**Type in Console:**
```javascript
// Check current user
console.log(currentUser.email)

// Check REELs
const reels = JSON.parse(localStorage.getItem('uploadedReels'))
console.log(reels.map(r => r.uploadedBy))
```

---

### Issue: Upload button not working

**Check:**
1. Video file selected?
2. "REEL" type selected?
3. All required fields filled?
4. Console errors?

**Solution:**
- Refresh page (F5)
- Try different browser
- Check console for specific errors

---

### Issue: Video not playing

**Check:**
1. Video file format supported? (MP4 recommended)
2. File size reasonable? (< 100MB)
3. Browser supports video playback?

---

## 📝 Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Upload REEL | ⬜ | |
| 2. View in REELS | ⬜ | |
| 3. View in Studio | ⬜ | |
| 4. Navigation | ⬜ | |
| 5. Cross-Profile | ⬜ | |
| 6. Delete REEL | ⬜ | |
| 7. Multiple REELs | ⬜ | |
| 8. Aspect Ratios | ⬜ | |
| 9. Console Check | ⬜ | |
| 10. Statistics | ⬜ | |

**Overall Result:** ⬜ ALL PASS  ⬜ SOME ISSUES

---

## 🐛 Issue Reporting Template

If you encounter issues, provide this information:

### 1. Test Number & Name
_Which test failed?_

### 2. Console Output
```
(Paste console logs here)
```

### 3. localStorage Data
```
(Paste result of: localStorage.getItem('uploadedReels'))
```

### 4. Current User
```
(Paste result of: console.log(currentUser))
```

### 5. Steps to Reproduce
1. 
2. 
3. 

### 6. Expected vs Actual
- **Expected:** 
- **Actual:** 

### 7. Browser & Version
- Browser: 
- Version: 

---

## ✅ Final Checklist

After completing all tests:

- [ ] All tests passed
- [ ] REELs upload successfully
- [ ] REELs display in REELS page
- [ ] REELs display in Studio
- [ ] REELs visible across profiles
- [ ] Can delete REELs from Studio
- [ ] No console errors
- [ ] No aspect ratio restrictions
- [ ] Multiple REELs work correctly
- [ ] Statistics update properly

---

**Testing Date:** ________________
**Tested By:** ________________
**Browser:** ________________
**Result:** ⬜ SUCCESS  ⬜ ISSUES FOUND

---

**Document Version:** 1.0
**Last Updated:** 2025-11-25
