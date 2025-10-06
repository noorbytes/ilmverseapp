function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `px-4 py-2 rounded-full text-sm transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 ${
        type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
    }`;
    
    // Add icon based on type
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    // Animate out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

const TAFSIR_BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir';
const TAFSIR_IDS = {
    'en-ibn-kathir': {
        name: 'Ibn Kathir',
        id: 'en-tafisr-ibn-kathir'  // Fixed ID
    },
    'en-tazkirul-quran': {
        name: 'Tazkirul Quran',
        id: 'en-tazkirul-quran'
    },
    'en-tahwidi-al-quran': {
        name: 'Al Jalayn',
        id: 'en-al-jalalayn'
    }
};

let currentTafsirId = TAFSIR_IDS['en-tazkirul-quran'].id;  // Use the ID from the object
let tafsirCache = new Map();


async function loadTafsir(surahId, verseKey) {
// Make function globally accessible
window.loadTafsir = async function(surahId, verseKey) {
    const [surah, verse] = verseKey.split(':');
    const cacheKey = `${currentTafsirId}-${verseKey}`;
    
    if (tafsirCache.has(cacheKey)) {
        return tafsirCache.get(cacheKey);
    }

    try {
        // Build correct URL path - ensure numbers are used without leading zeros
        const cleanSurah = parseInt(surah).toString();
        const cleanVerse = parseInt(verse).toString();
        const url = `${TAFSIR_BASE}/${currentTafsirId}/${cleanSurah}/${cleanVerse}.json`;
        
        console.log('Fetching tafsir from:', url); // Debug URL

        // Add CORS proxy if needed
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || !data.text) {
            throw new Error('Invalid tafsir data');
        }

        // Clean up the text - remove any HTML tags if present
        const cleanText = data.text.replace(/<[^>]*>/g, '');
        tafsirCache.set(cacheKey, cleanText);
        return cleanText;

    } catch (error) {
        console.error('Error loading tafsir:', error);
        showToast('Unable to load tafsir. Please try another source.', 'error');
        return 'Failed to load tafsir content.';
    }
}

function toggleTafsir(verseKey) {
    const verseElement = document.querySelector(`[data-verse-key="${verseKey}"]`);

// Make function globally accessible
window.toggleTafsir = function(verseKey) {
    console.log('window.toggleTafsir called with:', verseKey);
    const verseElement = document.querySelector(`[data-verse-key="${verseKey}"]`);
    console.log('Found verse element:', verseElement);
    if (!verseElement) {
        console.error('Verse element not found:', verseKey);
        return;
    }

    const tafsirContent = verseElement.querySelector('.tafsir-content');
    const tafsirBtn = verseElement.querySelector('.tafsir-btn i');
    
    if (!tafsirContent || !tafsirBtn) {
        console.error('Tafsir content or button not found');
        return;
    }

    if (!tafsirContent.hasAttribute('data-loaded')) {
        // Show loading state
        tafsirContent.innerHTML = `
            <div class="mt-4 pt-4 border-t border-gray-700">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-emerald-500 font-bold">Tafsir</h4>
                    <select class="bg-gray-700 text-sm text-gray-300 rounded px-2 py-1" 
                            onchange="changeTafsir(this.value, '${verseKey}')">
                        ${Object.entries(TAFSIR_IDS).map(([key, value]) => `
                            <option value="${key}" ${key === 'en-tazkirul-quran' ? 'selected' : ''}>
                                ${value.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="tafsir-text text-gray-300 text-base leading-relaxed">
                    <div class="animate-pulse flex space-x-4">
                        <div class="flex-1 space-y-4 py-1">
                            <div class="h-4 bg-gray-700 rounded w-3/4"></div>
                            <div class="space-y-2">
                                <div class="h-4 bg-gray-700 rounded"></div>
                                <div class="h-4 bg-gray-700 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load tafsir content
        console.log('Loading tafsir for verse:', verseKey); // Debug loading
        loadTafsir(verseKey.split(':')[0], verseKey).then(tafsirText => {
            const tafsirTextDiv = tafsirContent.querySelector('.tafsir-text');
            if (tafsirTextDiv) {
                tafsirTextDiv.innerHTML = tafsirText;
            }
            tafsirContent.setAttribute('data-loaded', 'true');
        });
    }

    // Toggle visibility with animation
    if (tafsirContent.classList.contains('hidden')) {
        tafsirContent.classList.remove('hidden');
        tafsirBtn.className = 'fas fa-book';
    } else {
        tafsirContent.classList.add('hidden');
        tafsirBtn.className = 'fas fa-book-open';
    }
}


async function changeTafsir(tafsirName, verseKey) {
// Make function globally accessible
window.changeTafsir = async function(tafsirName, verseKey) {

    if (!TAFSIR_IDS[tafsirName]) {
        showToast('Invalid tafsir selection.', 'error');
        return;
    }

    showToast('Loading new tafsir...', 'info');

    currentTafsirId = TAFSIR_IDS[tafsirName].id;
    const verseElement = document.querySelector(`[data-verse-key="${verseKey}"]`);
    if (!verseElement) return;

    const tafsirText = verseElement.querySelector('.tafsir-text');
    if (!tafsirText) return;

    // Show loading state
    tafsirText.innerHTML = `
        <div class="animate-pulse flex space-x-4">
            <div class="flex-1 space-y-4 py-1">
                <div class="h-4 bg-gray-700 rounded w-3/4"></div>
                <div class="space-y-2">
                    <div class="h-4 bg-gray-700 rounded"></div>
                    <div class="h-4 bg-gray-700 rounded w-5/6"></div>
                </div>
            </div>
        </div>
    `;

    const newTafsir = await loadTafsir(verseKey.split(':')[0], verseKey);
    tafsirText.innerHTML = newTafsir;
}
