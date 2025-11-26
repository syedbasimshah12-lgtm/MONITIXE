// REELS System Test Script
// Copy and paste this into browser console to diagnose issues

async function testReelsSystem() {
    console.log('🔍 ========================================');
    console.log('🔍 REELS SYSTEM COMPREHENSIVE TEST');
    console.log('🔍 ========================================\n');
    
    // Test 1: Check localStorage
    console.log('📦 TEST 1: LocalStorage Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const stored = localStorage.getItem('uploadedReels');
    if (stored) {
        try {
            const reels = JSON.parse(stored);
            console.log(`✅ Found ${reels.length} REELs in localStorage`);
            reels.forEach((reel, i) => {
                console.log(`   ${i+1}. "${reel.title}"`);
                console.log(`      - ID: ${reel.id}`);
                console.log(`      - Has File: ${reel.hasFile}`);
                console.log(`      - Channel: ${reel.channel}`);
                console.log(`      - Date: ${reel.date}`);
            });
        } catch (e) {
            console.error('❌ Error parsing localStorage:', e);
        }
    } else {
        console.log('❌ No REELs found in localStorage');
    }
    console.log('');
    
    // Test 2: Check IndexedDB
    console.log('💾 TEST 2: IndexedDB Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('MONITIXE_REELS_DB', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        console.log('✅ IndexedDB opened successfully');
        
        // Check reels store (video files)
        const reelsTransaction = db.transaction(['reels'], 'readonly');
        const reelsStore = reelsTransaction.objectStore('reels');
        const reelsRequest = reelsStore.getAllKeys();
        
        const reelKeys = await new Promise((resolve, reject) => {
            reelsRequest.onsuccess = () => resolve(reelsRequest.result);
            reelsRequest.onerror = () => reject(reelsRequest.error);
        });
        
        console.log(`✅ Video Files: ${reelKeys.length} found`);
        reelKeys.forEach((key, i) => {
            console.log(`   ${i+1}. ${key}`);
        });
        
        // Check thumbnails store
        const thumbsTransaction = db.transaction(['thumbnails'], 'readonly');
        const thumbsStore = thumbsTransaction.objectStore('thumbnails');
        const thumbsRequest = thumbsStore.getAllKeys();
        
        const thumbKeys = await new Promise((resolve, reject) => {
            thumbsRequest.onsuccess = () => resolve(thumbsRequest.result);
            thumbsRequest.onerror = () => reject(thumbsRequest.error);
        });
        
        console.log(`✅ Thumbnails: ${thumbKeys.length} found`);
        
        // Check for mismatches
        if (stored) {
            const reels = JSON.parse(stored);
            const mismatch = reels.filter(r => !reelKeys.includes(r.id));
            if (mismatch.length > 0) {
                console.warn('⚠️ MISMATCH DETECTED:');
                console.warn(`   ${mismatch.length} REELs in localStorage have no video file in IndexedDB:`);
                mismatch.forEach(r => {
                    console.warn(`   - ${r.title} (${r.id})`);
                });
            } else {
                console.log('✅ All REELs have matching video files');
            }
        }
        
    } catch (error) {
        console.error('❌ IndexedDB Error:', error);
    }
    console.log('');
    
    // Test 3: Check DOM elements
    console.log('🎬 TEST 3: DOM Elements Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const reelsViewer = document.getElementById('reelsViewer');
    const reelsEmpty = document.getElementById('reelsEmpty');
    const reelNavUp = document.getElementById('reelNavUp');
    const reelNavDown = document.getElementById('reelNavDown');
    
    console.log(`reelsViewer: ${reelsViewer ? '✅ Found' : '❌ Missing'}`);
    console.log(`reelsEmpty: ${reelsEmpty ? '✅ Found' : '❌ Missing'}`);
    console.log(`reelNavUp: ${reelNavUp ? '✅ Found' : '❌ Missing'}`);
    console.log(`reelNavDown: ${reelNavDown ? '✅ Found' : '❌ Missing'}`);
    
    if (reelsViewer) {
        const reelElements = reelsViewer.querySelectorAll('.short-item');
        console.log(`REEL elements loaded: ${reelElements.length}`);
        
        reelElements.forEach((el, i) => {
            const video = el.querySelector('video');
            const reelId = el.dataset.reelId;
            console.log(`   ${i+1}. REEL ${reelId}:`);
            console.log(`      - Video element: ${video ? '✅ Present' : '❌ Missing'}`);
            if (video) {
                const source = video.querySelector('source');
                console.log(`      - Source: ${source ? '✅ Present' : '❌ Missing'}`);
                if (source) {
                    console.log(`      - Source URL: ${source.src.substring(0, 50)}...`);
                }
                console.log(`      - Ready state: ${video.readyState} (4=HAVE_ENOUGH_DATA)`);
                console.log(`      - Paused: ${video.paused}`);
                console.log(`      - Duration: ${video.duration}s`);
            }
        });
    }
    console.log('');
    
    // Test 4: Test video file retrieval
    console.log('🎥 TEST 4: Video File Retrieval Test');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (stored) {
        const reels = JSON.parse(stored);
        if (reels.length > 0) {
            const testReel = reels[0];
            console.log(`Testing video retrieval for: ${testReel.title}`);
            console.log(`REEL ID: ${testReel.id}`);
            
            try {
                const db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open('MONITIXE_REELS_DB', 1);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                const transaction = db.transaction(['reels'], 'readonly');
                const store = transaction.objectStore('reels');
                const request = store.get(testReel.id);
                
                const result = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                
                if (result && result.file) {
                    console.log('✅ Video file retrieved successfully');
                    console.log(`   - File type: ${result.file.type}`);
                    console.log(`   - File size: ${(result.file.size / 1024 / 1024).toFixed(2)} MB`);
                    console.log(`   - Can create blob URL: ${result.file instanceof Blob ? '✅ Yes' : '❌ No'}`);
                    
                    if (result.file instanceof Blob) {
                        const url = URL.createObjectURL(result.file);
                        console.log(`   - Blob URL created: ${url.substring(0, 50)}...`);
                    }
                } else {
                    console.error('❌ No video file found in IndexedDB for this REEL');
                }
            } catch (error) {
                console.error('❌ Error retrieving video:', error);
            }
        }
    }
    console.log('');
    
    // Test 5: Current page check
    console.log('📍 TEST 5: Current Page Check');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const activePage = document.querySelector('.page.active');
    console.log(`Active page: ${activePage ? activePage.id : 'None'}`);
    console.log(`On REELS page: ${activePage && activePage.id === 'page-reels' ? '✅ Yes' : '❌ No'}`);
    console.log('');
    
    // Summary
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (stored) {
        const reels = JSON.parse(stored);
        console.log(`Total REELs in system: ${reels.length}`);
        
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('MONITIXE_REELS_DB', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        const transaction = db.transaction(['reels'], 'readonly');
        const store = transaction.objectStore('reels');
        const request = store.getAllKeys();
        
        const reelKeys = await new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        const withFiles = reels.filter(r => reelKeys.includes(r.id)).length;
        const withoutFiles = reels.length - withFiles;
        
        console.log(`✅ REELs with video files: ${withFiles}`);
        if (withoutFiles > 0) {
            console.log(`❌ REELs WITHOUT video files: ${withoutFiles}`);
            console.log('');
            console.log('💡 RECOMMENDED ACTION:');
            console.log('   Run this command to clear broken REELs:');
            console.log('   localStorage.removeItem("uploadedReels"); location.reload();');
        } else {
            console.log('✅ All REELs have video files - system is healthy!');
        }
    } else {
        console.log('No REELs in system. Upload a REEL to test.');
    }
    
    console.log('');
    console.log('🔍 ========================================');
    console.log('🔍 TEST COMPLETE');
    console.log('🔍 ========================================');
}

// Auto-run when script loads
console.log('REELS Test Script Loaded!');
console.log('Run: testReelsSystem()');
