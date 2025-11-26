// REEL Debugging Helper Functions
// Paste this in browser console to debug REEL issues

function debugReels() {
    console.log('=== REEL DEBUG INFO ===');
    
    // Check localStorage
    const stored = localStorage.getItem('uploadedReels');
    console.log('1. Raw localStorage data:', stored);
    
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            console.log('2. Parsed REELs count:', parsed.length);
            console.log('3. REELs data:', parsed);
        } catch (e) {
            console.error('ERROR parsing localStorage:', e);
        }
    } else {
        console.log('2. No REELs in localStorage');
    }
    
    // Check global variable
    if (typeof allReels !== 'undefined') {
        console.log('4. allReels variable count:', allReels.length);
        console.log('5. allReels variable data:', allReels);
    } else {
        console.log('4. allReels variable not defined');
    }
    
    // Check DOM elements
    const reelsViewer = document.getElementById('reelsViewer');
    const reelsEmpty = document.getElementById('reelsEmpty');
    console.log('6. DOM - reelsViewer exists:', !!reelsViewer);
    console.log('7. DOM - reelsEmpty exists:', !!reelsEmpty);
    
    if (reelsViewer) {
        console.log('8. reelsViewer display:', reelsViewer.style.display);
        console.log('9. reelsViewer children:', reelsViewer.children.length);
    }
    
    console.log('=== END DEBUG INFO ===');
}

function clearReels() {
    if (confirm('Clear all REELs? This cannot be undone!')) {
        localStorage.removeItem('uploadedReels');
        console.log('REELs cleared from localStorage');
        location.reload();
    }
}

function forceLoadReels() {
    console.log('Force loading REELs page...');
    if (typeof loadReelsPage === 'function') {
        loadReelsPage();
    } else {
        console.error('loadReelsPage function not found');
    }
}

console.log('REEL Debug Functions loaded!');
console.log('Available commands:');
console.log('  debugReels() - Show debug information');
console.log('  clearReels() - Clear all REELs');
console.log('  forceLoadReels() - Force reload REELs page');
