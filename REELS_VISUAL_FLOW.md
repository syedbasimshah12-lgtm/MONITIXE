# REELS System - Visual Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      REELS ECOSYSTEM                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│  Upload Page │
└──────┬───────┘
       │
       │ Select Video + Type="REEL"
       ↓
┌─────────────────────────────────────────┐
│         REEL Upload Process             │
│  1. Generate ID: reel_[timestamp]       │
│  2. Save video → IndexedDB              │
│  3. Save metadata → localStorage        │
│  4. Add uploadedBy: user@email.com      │
└──────────────┬──────────────────────────┘
               │
               ├──────────────┬──────────────────┐
               ↓              ↓                  ↓
       ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │  REELS Page  │  │ Studio Page  │  │ Search Page  │
       │ (All REELs)  │  │(Your REELs)  │  │(REEL Badge)  │
       └──────────────┘  └──────────────┘  └──────────────┘
```

## Data Flow

```
┌────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                        │
├────────────────────────────────────────────────────────┤
│                                                         │
│  localStorage                    IndexedDB              │
│  ┌─────────────────┐            ┌──────────────┐      │
│  │ uploadedReels   │            │   ReelsDB    │      │
│  │ (JSON Array)    │            │              │      │
│  │                 │            │   Store:     │      │
│  │ [{              │            │   "reels"    │      │
│  │   id,           │            │              │      │
│  │   title,        │◄───────────│   Key: ID    │      │
│  │   uploadedBy,   │            │   Value:     │      │
│  │   views,        │            │   VideoBlob  │      │
│  │   likes,        │            │              │      │
│  │   ...           │            └──────────────┘      │
│  │ }]              │                                   │
│  └─────────────────┘                                   │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## REELS Page Flow

```
User clicks "REELS" in menu
        ↓
loadReelsPage() called
        ↓
Read localStorage.getItem('uploadedReels')
        ↓
Parse JSON → allReels array
        ↓
FOR EACH reel:
  │
  ├─→ Load video from IndexedDB
  │
  ├─→ Create video element
  │
  └─→ Add to viewer
        ↓
Display in vertical scrolling viewer
        ↓
✅ All REELs visible (cross-profile)
```

## Studio REELs Flow

```
User navigates to Studio
        ↓
loadStudioPage() called
        ↓
Read localStorage.getItem('uploadedReels')
        ↓
Parse JSON → allReels array
        ↓
Filter: allReels.filter(r => r.uploadedBy === currentUser.email)
        ↓
userReels array (only current user's REELs)
        ↓
loadStudioReelsList(userReels)
        ↓
FOR EACH reel:
  │
  ├─→ Display thumbnail
  │
  ├─→ Show stats (views, likes, comments)
  │
  └─→ Add View & Delete buttons
        ↓
✅ User's REELs displayed with management options
```

## Upload Process Detail

```
┌─────────────────────────────────────────────────┐
│              REEL UPLOAD FLOW                    │
└─────────────────────────────────────────────────┘

1. User selects video file
   videoFile (blob)
        ↓
2. User selects Type = "REEL"
   type = 'reel'
        ↓
3. User fills form
   title, description, category, tags
        ↓
4. User clicks Publish
        ↓
5. Generate unique ID
   reelId = reel_[timestamp]_[random]
        ↓
6. Save video to IndexedDB
   saveReelFile(reelId, videoFile)
        ↓
7. Create REEL object
   {
     id: reelId,
     title: "...",
     uploadedBy: currentUser.email,
     ...
   }
        ↓
8. Add to localStorage
   allReels.unshift(newReel)
   localStorage.setItem('uploadedReels', JSON.stringify(allReels))
        ↓
9. Navigate to REELS page
   navigateToPage('reels')
        ↓
✅ REEL uploaded and visible
```

## Delete Process Detail

```
┌─────────────────────────────────────────────────┐
│              REEL DELETE FLOW                    │
└─────────────────────────────────────────────────┘

User clicks Delete in Studio
        ↓
Confirmation dialog
        ↓
User confirms
        ↓
1. Remove from localStorage
   allReels = allReels.filter(r => r.id !== reelId)
   localStorage.setItem('uploadedReels', JSON.stringify(allReels))
        ↓
2. Remove from IndexedDB
   deleteReelFile(reelId)
   - Open ReelsDB
   - Delete from 'reels' store
        ↓
3. Reload Studio page
   loadStudioPage()
        ↓
✅ REEL deleted from all storage
```

## Cross-Profile Architecture

```
┌───────────────────────────────────────────────────┐
│             PROFILE ARCHITECTURE                   │
└───────────────────────────────────────────────────┘

Profile A (alice@email.com)
   │
   ├─→ Uploads REEL
   │   └─→ uploadedBy: "alice@email.com"
   │
   └─→ Studio shows: Only Alice's REELs

Profile B (bob@email.com)
   │
   ├─→ Uploads REEL
   │   └─→ uploadedBy: "bob@email.com"
   │
   └─→ Studio shows: Only Bob's REELs

REELS Page (All Profiles):
   │
   ├─→ Shows: Alice's REELs
   ├─→ Shows: Bob's REELs
   └─→ Shows: All other REELs

🔑 KEY POINT:
   - localStorage.uploadedReels = GLOBAL (all profiles)
   - Studio filters by uploadedBy === currentUser.email
   - REELS page shows ALL (no filter)
```

## State Diagram

```
┌────────────────────────────────────────────────┐
│            REEL LIFECYCLE                       │
└────────────────────────────────────────────────┘

    [Created]
       ↓
    Upload Process
       ↓
    [Stored]
    ├─→ localStorage (metadata)
    └─→ IndexedDB (video file)
       ↓
    [Visible]
    ├─→ REELS Page (all users)
    ├─→ Studio Page (owner only)
    └─→ Search Results (all users)
       ↓
    User Actions
    ├─→ View (REELS page)
    ├─→ Like
    ├─→ Comment
    └─→ Delete (Studio only)
       ↓
    [Deleted]
    ├─→ Removed from localStorage
    └─→ Removed from IndexedDB
       ↓
    [Gone Forever]
```

## Component Interaction

```
┌─────────────────────────────────────────────────────┐
│              COMPONENT DIAGRAM                       │
└─────────────────────────────────────────────────────┘

┌──────────────┐
│  Navigation  │
└──────┬───────┘
       │
       ├────────┐
       │        │
       ↓        ↓
┌──────────┐  ┌──────────┐
│  REELS   │  │  Studio  │
│   Page   │  │   Page   │
└────┬─────┘  └────┬─────┘
     │             │
     │             │
     ↓             ↓
┌────────────────────────┐
│  loadReelsPage()       │
│  - Load ALL REELs      │
│  - No filtering        │
│  - Cross-profile view  │
└────────────────────────┘
                         
┌────────────────────────┐
│  loadStudioPage()      │
│  - Load ALL REELs      │
│  - Filter by user      │
│  - Management UI       │
└────────────────────────┘
     │             │
     └─────┬───────┘
           ↓
┌────────────────────────┐
│   localStorage         │
│   "uploadedReels"      │
└────────────────────────┘
```

## Debug Console Output

```
┌─────────────────────────────────────────────────────┐
│           EXPECTED CONSOLE OUTPUT                    │
└─────────────────────────────────────────────────────┘

📤 UPLOAD:
=== REEL UPLOAD: Adding to storage ===
Loading reels from localStorage...
Current reels count before adding: 0
Current reels count after adding: 1
Saving reels to localStorage...
Number of reels to save: 1
Verification - Reels count: 1
=== REEL UPLOAD: Save complete ===

📺 REELS PAGE:
=== LOADING REELS PAGE ===
Direct localStorage check: [{"id":"reel_...", ...}]
Directly loaded from localStorage: 1 reels
Creating reel element 0: {...}
=== REELS PAGE LOADED SUCCESSFULLY ===

🎬 STUDIO PAGE:
=== LOADING STUDIO PAGE ===
Total REELs in storage: 5
User REELs: 2
=== STUDIO PAGE LOADED ===
```

## Error States & Recovery

```
┌─────────────────────────────────────────────────────┐
│           ERROR HANDLING                             │
└─────────────────────────────────────────────────────┘

❌ localStorage.getItem('uploadedReels') === null
   └─→ Initialize: allReels = []
       └─→ Show empty state

❌ JSON.parse() fails
   └─→ Catch error
       └─→ Log error
           └─→ Set allReels = []
               └─→ Show empty state

❌ IndexedDB read fails
   └─→ Log error
       └─→ Show thumbnail only
           └─→ Display error message

❌ No DOM elements found
   └─→ Log error
       └─→ Return early
           └─→ Prevent crash
```

---

## Quick Reference

### Storage Keys
- `uploadedReels` - Array of REEL objects in localStorage
- `ReelsDB` - IndexedDB database for video files

### REEL Object Structure
```javascript
{
  id: "reel_[timestamp]_[random]",
  title: String,
  description: String,
  channel: String,
  channelId: String,
  channelAvatar: String,
  thumbnail: String,
  uploadDate: ISO Date String,
  views: String,
  likes: Number,
  dislikes: Number,
  comments: Array,
  category: String,
  tags: Array,
  hasFile: Boolean,
  uploadedBy: String (email)
}
```

### Key Functions
- `loadReelsPage()` - Load all REELs (REELS page)
- `loadStudioPage()` - Load user's REELs (Studio)
- `saveReelFile()` - Save video to IndexedDB
- `getReelFile()` - Load video from IndexedDB
- `deleteStudioReel()` - Delete REEL from storage

---

**Visual Guide Version**: 1.0
**Last Updated**: 2025-11-25
