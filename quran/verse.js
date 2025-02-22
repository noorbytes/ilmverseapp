const API_BASE = 'https://api.quran.com/api/v4';
const CLOUD_API = 'https://api.alquran.cloud/v1';
const AUDIO_BASE_URL = 'https://verses.quran.com/';
const DEFAULT_QARI = 7; // Mishari Rashid al-`Afasy

let currentAudio = new Audio();
let isPlaying = false;
let currentPlayingVerse = null;

// Add new audio control variables
let totalDuration = 0;
let currentTime = 0;
let verseDurations = [];
let isPlayingAll = false;
let activeVerseIndex = 0;

// Add these variables at the top with other variables
let totalResources = 0;
let loadedResources = 0;

// Add this helper function at the top with other variables
function disableSelection() {
    document.body.classList.add('disable-selection');
    setTimeout(() => {
        document.body.classList.remove('disable-selection');
    }, 800); // Remove class after transition completes
}

// Add this function near the top of the file
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `px-4 py-2 rounded-full text-sm bg-opacity-90 transition-all duration-300 flex items-center gap-2 shadow-lg ${
        type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
    }`;
    
    // Add icon based on type
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    // Add to container
    container.appendChild(toast);
    
    // Animate out after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add this function before loadSurah
function updateLoadingProgress(detail, progress) {
    const loadingStatus = document.getElementById('loading-status');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingDetail = document.getElementById('loading-detail');
    
    if (loadingStatus) loadingStatus.textContent = detail;
    if (loadingProgress) loadingProgress.style.width = `${progress}%`;
    if (loadingDetail) loadingDetail.textContent = `${Math.round(progress)}% complete`;
}

async function loadSurah() {
    const verseContainer = document.getElementById('verses-container');
    if (!verseContainer) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const surahId = urlParams.get('id') || '1';
        const verseId = urlParams.get('verse'); // Add this line to get verse ID from URL
        
        updateLoadingProgress('Fetching surah data...', 10);

        // Fetch all data with progress tracking
        const [versesResponse, surahInfo, transliteration, audioResponse] = await Promise.all([
            fetch(`${API_BASE}/verses/by_chapter/${surahId}?language=en&words=false&translations=131&fields=text_uthmani,verse_number&per_page=1000`),
            fetch(`${API_BASE}/chapters/${surahId}`),
            fetch(`${CLOUD_API}/surah/${surahId}/en.transliteration`),
            fetch(`${API_BASE}/recitations/${DEFAULT_QARI}/by_chapter/${surahId}?per_page=286`) // Added per_page parameter
        ]);

        updateLoadingProgress('Processing data...', 30);

        const versesData = await versesResponse.json();
        const surahData = await surahInfo.json();
        const transliterationData = await transliteration.json();
        const audioData = await audioResponse.json();

        updateLoadingProgress('Preparing audio files...', 50);

        // Process verses with both translation and transliteration
        let verses = versesData.verses.map((verse, index) => ({
            number: verse.verse_number,
            key: `${surahId}:${verse.verse_number}`,
            arabic: verse.text_uthmani,
            translation: verse.translations[0]?.text || 'Translation not available',
            transliteration: transliterationData.data.ayahs[index]?.text || 'Transliteration not available'
        }));

        updateLoadingProgress('Loading audio files...', 60);
        
        // Preload audio files with progress tracking
        const totalAudioFiles = verses.filter(v => v.audioUrl).length;
        let loadedAudioFiles = 0;

        await Promise.all(verses.map(async verse => {
            if (verse.audioUrl) {
                try {
                    const audio = new Audio();
                    audio.src = `${AUDIO_BASE_URL}${verse.audioUrl}`;
                    await new Promise((resolve) => {
                        audio.addEventListener('loadeddata', () => {
                            loadedAudioFiles++;
                            const progress = 60 + ((loadedAudioFiles / totalAudioFiles) * 30);
                            updateLoadingProgress(
                                `Loading audio files (${loadedAudioFiles}/${totalAudioFiles})...`,
                                progress
                            );
                            resolve();
                        });
                        audio.addEventListener('error', resolve); // Skip failed loads
                    });
                } catch (error) {
                    console.error('Error preloading audio:', error);
                }
            }
        }));

        updateLoadingProgress('Rendering content...', 90);

        // Map audio files to verses
        verses = verses.map(verse => ({
            ...verse,
            audioUrl: audioData.audio_files.find(
                audio => audio.verse_key === verse.key
            )?.url
        }));

        // Render content
        verseContainer.innerHTML = `
            <div class="space-y-6">
                ${verses.map(verse => `
                    <div id="verse-${verse.number}" 
                         class="verse-block bg-gray-800/50 rounded-lg p-4 md:p-6"
                         data-verse-key="${verse.key}">
                        <div class="flex flex-col space-y-4">
                            <div class="flex justify-between items-center">
                                <div class="verse-number bg-emerald-900/30 text-emerald-400 rounded-lg px-4 py-2 text-lg font-bold">
                                    ${verse.key}
                                </div>
                                <div class="flex items-center gap-2">
                                    <button 
                                        class="share-btn text-gray-400 hover:text-emerald-400 p-2 rounded-full hover:bg-gray-700"
                                        onclick="shareVerse('${verse.key}')"
                                    >
                                        <i class="fas fa-share-alt"></i>
                                    </button>
                                    <button 
                                        class="tafsir-btn text-gray-400 hover:text-emerald-400 p-2 rounded-full hover:bg-gray-700"
                                        onclick="toggleTafsir('${verse.key}')"
                                    >
                                        <i class="fas fa-book-open"></i>
                                    </button>
                                    <button 
                                        class="play-verse-btn text-emerald-500 hover:text-emerald-400 p-2 rounded-full hover:bg-gray-700"
                                        onclick="toggleVerseAudio('${verse.key}', '${verse.audioUrl}')"
                                        data-audio-url="${verse.audioUrl}"
                                    >
                                        <i class="fas fa-play"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="arabic-text mt-4" dir="rtl">
                                ${verse.arabic}
                            </div>
                            
                            <div class="transliteration text-gray-400 italic text-lg">
                                ${verse.transliteration}
                            </div>
                            
                            <div class="translation text-gray-300 text-base border-l-2 border-emerald-800/50 pl-4">
                                ${verse.translation}
                            </div>

                            <div class="tafsir-content hidden">
                                <!-- Tafsir content will be loaded here -->
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // After verses are loaded and rendered, initialize audio player
        await initializeAudioPlayer(verses);
        
        updateLoadingProgress('Complete!', 100);

        // Remove loading overlay
        setTimeout(() => {
            document.getElementById('loading-overlay').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-overlay').remove();
            }, 500);
        }, 500);

        // Add progress update listener
        currentAudio.addEventListener('timeupdate', updateProgress);

        // After rendering verses, scroll to specific verse if verseId exists
        if (verseId) {
            setTimeout(() => {
                scrollToVerse(verseId, true);
            }, 1000); // Give time for content to load
        }

    } catch (error) {
        console.error('Error:', error);
        updateLoadingProgress('Error loading surah', 0);
        verseContainer.innerHTML = `
            <div class="bg-red-900/20 text-red-500 p-4 rounded-lg">
                Failed to load surah: ${error.message}
            </div>
        `;
    }
}

// Add new sidebar functionality
async function initializeSidebar() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const currentSurahId = parseInt(urlParams.get('id')) || 1;

        // Fetch all surahs
        const response = await fetch(`${API_BASE}/chapters`);
        const data = await response.json();
        
        // Simplified surah list with just number and name
        const surahList = document.getElementById('surah-list');
        surahList.innerHTML = data.chapters.map(surah => `
            <div class="list-item ${surah.id === currentSurahId ? 'active' : ''}" 
                 onclick="window.location.href='?id=${surah.id}'">
                <span class="number">${surah.id}.</span>
                <span class="name">${surah.name_simple}</span>
            </div>
        `).join('');

        // Populate verse numbers for current surah
        const verseList = document.getElementById('verse-list');
        verseList.innerHTML = Array.from(
            { length: data.chapters[currentSurahId - 1].verses_count }, 
            (_, i) => `
                <div class="list-item" onclick="scrollToVerse(${i + 1})">
                    <span class="item-number">${i + 1}</span>
                    <span class="text-sm">Verse ${i + 1}</span>
                </div>
            `
        ).join('');

        // Add search functionality for surahs
        const surahSearch = document.getElementById('surah-search');
        surahSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('#surah-list .list-item').forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            });
        });

        // Add improved search functionality for verses
        const verseSearch = document.getElementById('verse-search');
        verseSearch.addEventListener('input', (e) => {
            const searchNum = e.target.value;
            const verseItems = Array.from(document.querySelectorAll('#verse-list .list-item'));
            
            if (searchNum) {
                // Sort verses based on how close they match the search number
                verseItems.sort((a, b) => {
                    const aNum = parseInt(a.querySelector('.item-number').textContent);
                    const bNum = parseInt(b.querySelector('.item-number').textContent);
                    const searchNumInt = parseInt(searchNum);
                    
                    // Calculate difference from search number
                    const aDiff = Math.abs(aNum - searchNumInt);
                    const bDiff = Math.abs(bNum - searchNumInt);
                    
                    // Sort by closest match
                    return aDiff - bDiff;
                });

                // Show/hide based on match and reorder
                verseItems.forEach(item => {
                    const verseNum = item.querySelector('.item-number').textContent;
                    const matches = verseNum.includes(searchNum);
                    item.style.display = matches ? 'flex' : 'none';
                    if (matches) {
                        item.parentNode.appendChild(item);
                    }
                });
            } else {
                // If no search, restore original order
                verseItems.sort((a, b) => {
                    const aNum = parseInt(a.querySelector('.item-number').textContent);
                    const bNum = parseInt(b.querySelector('.item-number').textContent);
                    return aNum - bNum;
                }).forEach(item => {
                    item.style.display = 'flex';
                    item.parentNode.appendChild(item);
                });
            }
        });

    } catch (error) {
        console.error('Error initializing sidebar:', error);
    }
}

async function updateVerseList(surahId) {
    try {
        const response = await fetch(`${API_BASE}/verses/by_chapter/${surahId}?fields=text_uthmani`);
        const data = await response.json();
        
        const verseList = document.getElementById('verse-list');
        verseList.innerHTML = data.verses.map(verse => `
            <div class="list-item cursor-pointer hover:bg-gray-700" 
                 onclick="scrollToVerse(${verse.verse_number})"
                 data-verse="${verse.verse_number}">
                <span class="text-emerald-500 font-medium">${verse.verse_number}</span>
                <span class="text-sm text-gray-300">Verse ${verse.verse_number}</span>
            </div>
        `).join('');

        // Add click event listeners to verse items
        document.querySelectorAll('#verse-list .list-item').forEach(item => {
            item.addEventListener('click', function() {
                const verseNum = this.getAttribute('data-verse');
                scrollToVerse(parseInt(verseNum));
            });
        });
    } catch (error) {
        console.error('Error updating verse list:', error);
    }
}

// Improved scroll function with highlighting
function scrollToVerse(verseNumber, highlight = false) {
    const verseElement = document.getElementById(`verse-${verseNumber}`);
    if (verseElement) {
        // Remove previous highlights
        document.querySelectorAll('.verse-block').forEach(block => {
            block.classList.remove('active', 'bg-emerald-900/20');
        });
        
        // Add highlight to clicked verse
        verseElement.classList.add('active');
        if (highlight) {
            verseElement.classList.add('bg-emerald-900/20');
            // Remove highlight after 3 seconds
            setTimeout(() => {
                verseElement.classList.remove('bg-emerald-900/20');
            }, 3000);
        }
        
        // Smooth scroll to verse
        verseElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
        });

        // Update URL without reloading the page
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('verse', verseNumber);
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.pushState({}, '', newUrl);

        // Update verse list highlight
        document.querySelectorAll('#verse-list .list-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-verse') === verseNumber.toString()) {
                item.classList.add('active');
            }
        });
    }
}

function toggleVerseAudio(verseKey, audioUrl) {
    if (!audioUrl) return;

    const fullAudioUrl = `${AUDIO_BASE_URL}${audioUrl}`;
    const verseElement = document.getElementById(`verse-${verseKey.split(':')[1]}`);
    const playButton = verseElement.querySelector('.play-verse-btn i');

    // If clicking the same verse that's playing
    if (currentPlayingVerse === verseKey) {
        if (isPlaying) {
            currentAudio.pause();
            playButton.className = 'fas fa-play';
            isPlaying = false;
        } else {
            currentAudio.play();
            playButton.className = 'fas fa-pause';
            isPlaying = true;
        }
        return;
    }

    // Reset previous verse's button if exists
    if (currentPlayingVerse) {
        const prevVerseElement = document.getElementById(`verse-${currentPlayingVerse.split(':')[1]}`);
        if (prevVerseElement) {
            prevVerseElement.querySelector('.play-verse-btn i').className = 'fas fa-play';
        }
    }

    // Play new verse
    currentAudio.pause();
    currentAudio.src = fullAudioUrl;
    currentAudio.play().then(() => {
        playButton.className = 'fas fa-pause';
        isPlaying = true;
        currentPlayingVerse = verseKey;
        
        // Highlight current verse
        highlightVerse(verseKey.split(':')[1]);
    }).catch(error => {
        console.error('Error playing audio:', error);
        playButton.className = 'fas fa-play';
    });
}

currentAudio.addEventListener('ended', () => {
    if (currentPlayingVerse) {
        const verseElement = document.getElementById(`verse-${currentPlayingVerse.split(':')[1]}`);
        if (verseElement) {
            verseElement.querySelector('.play-verse-btn i').className = 'fas fa-play';
        }
    }
    isPlaying = false;
    currentPlayingVerse = null;
});

function highlightVerse(verseNumber) {
    // Remove previous highlights
    document.querySelectorAll('.verse-block').forEach(block => {
        block.classList.remove('active');
    });
    
    // Add highlight to current verse
    const verseElement = document.getElementById(`verse-${verseNumber}`);
    if (verseElement) {
        verseElement.classList.add('active');
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Add new audio control functions
let audioDurationsCache = null;

async function loadAudioDurations() {
    if (audioDurationsCache) return audioDurationsCache;
    
    try {
        const response = await fetch('quran/audio-durations.json');
        audioDurationsCache = await response.json();
        return audioDurationsCache;
    } catch (error) {
        console.error('Error loading audio durations:', error);
        return null;
    }
}

async function initializeAudioPlayer(verses) {
    try {
        // Reset audio state
        verseDurations = [];
        totalDuration = 0;
        
        // Load durations from JSON file with correct path
        const response = await fetch('quran/audio-durations.json');
        if (!response.ok) {
            throw new Error(`Failed to load audio durations: ${response.status}`);
        }
        const audioDurations = await response.json();
        
        const surahId = verses[0]?.key.split(':')[0];
        
        if (!audioDurations[surahId]) {
            console.error('No cached durations found for surah:', surahId);
            return;
        }

        // Use cached durations instead of calculating
        verses.forEach(verse => {
            if (verse.audioUrl) {
                const duration = audioDurations[surahId].verses[verse.key] || 0;
                verseDurations.push(duration);
                totalDuration += duration;
                console.log(`Using cached duration for verse ${verse.key}: ${duration}s`);
            }
        });

        // Update total time display
        document.getElementById('total-time').textContent = formatTime(totalDuration);
        
        // Add event listeners
        const progressContainer = document.getElementById('progress-container');
        if (progressContainer) {
            progressContainer.addEventListener('click', handleProgressClick);
        }
        
        const playAllBtn = document.getElementById('play-all');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', togglePlayAll);
        }
        
        const prevBtn = document.getElementById('prev-verse');
        if (prevBtn) {
            prevBtn.addEventListener('click', playPreviousVerse);
        }
        
        const nextBtn = document.getElementById('next-verse');
        if (nextBtn) {
            nextBtn.addEventListener('click', playNextVerse);
        }
        
    } catch (error) {
        console.error('Error initializing audio player:', error);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add this function before playFromVerse
function updatePlayingVerse(verseNumber) {
    // Update verse number display
    const playingVerseElement = document.getElementById('playing-verse');
    if (playingVerseElement) {
        playingVerseElement.textContent = `Verse: ${verseNumber}`;
    }

    // Update verse list highlight
    document.querySelectorAll('#verse-list .list-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-verse') === verseNumber.toString()) {
            item.classList.add('active');
        }
    });

    // Scroll the verse list to show the active verse
    const activeItem = document.querySelector('#verse-list .list-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Update the playFromVerse function to include auto-scrolling and highlighting
async function playFromVerse(index) {
    if (!isPlayingAll) return;
    
    disableSelection(); // Add this line to prevent selection during transition
    
    activeVerseIndex = index;
    const verses = document.querySelectorAll('.verse-block');
    
    if (index >= verses.length) {
        stopPlayback();
        return;
    }

    // Remove all previous highlights and pause buttons
    verses.forEach(verse => {
        verse.classList.remove('active');
        verse.style.backgroundColor = '';
        const playBtn = verse.querySelector('.play-verse-btn i');
        if (playBtn) playBtn.className = 'fas fa-play';
    });

    // Add highlight to current verse and scroll into view
    const currentVerse = verses[index];
    if (currentVerse) {
        currentVerse.classList.add('active');
        currentVerse.style.backgroundColor = 'rgba(16, 185, 129, 0.15)'; // Slightly more visible highlight
        currentVerse.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Update verse play button
        const playBtn = currentVerse.querySelector('.play-verse-btn i');
        if (playBtn) playBtn.className = 'fas fa-pause';
    }

    // Update UI
    updatePlayingVerse(index + 1);
    
    // Play audio
    const audioBtn = currentVerse.querySelector('.play-verse-btn');
    const audioUrl = audioBtn.dataset.audioUrl;
    
    if (audioUrl) {
        currentAudio.src = `${AUDIO_BASE_URL}${audioUrl}`;
        try {
            await currentAudio.play();
            
            // Set up next verse
            currentAudio.onended = () => {
                // Reset current verse button and remove highlight
                const playBtn = currentVerse.querySelector('.play-verse-btn i');
                if (playBtn) playBtn.className = 'fas fa-play';
                currentVerse.classList.remove('active');
                currentVerse.style.backgroundColor = '';
                
                // Play next verse
                playFromVerse(index + 1);
            };
        } catch (error) {
            console.error('Error playing audio:', error);
            playFromVerse(index + 1);
        }
    } else {
        playFromVerse(index + 1);
    }
}

// Update togglePlayAll function to add highlighting for first verse
async function togglePlayAll() {
    const playButton = document.getElementById('play-all');
    const icon = playButton.querySelector('i');

    disableSelection(); // Add this line to prevent selection during transition
    
    if (isPlayingAll) {
        // Pausing playback
        isPlayingAll = false;
        icon.className = 'fas fa-play';
        currentAudio.pause();
        
        // Keep the highlight on the current verse while paused
    } else {
        // Starting playback
        isPlayingAll = true;
        icon.className = 'fas fa-pause';
        
        // Reset if at end
        if (activeVerseIndex >= document.querySelectorAll('.verse-block').length) {
            activeVerseIndex = 0;
        }
        
        // Start playing from current verse
        await playFromVerse(activeVerseIndex);
    }
}

// Update stopPlayback to properly remove all highlights
function stopPlayback() {
    isPlayingAll = false;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.querySelector('#play-all i').className = 'fas fa-play';
    activeVerseIndex = 0;
    updatePlayingVerse(1);
    
    // Remove all verse highlights
    document.querySelectorAll('.verse-block').forEach(verse => {
        verse.classList.remove('active');
        verse.style.backgroundColor = '';
    });
}

function handleProgressClick(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const timeToSeek = clickPosition * totalDuration;
    
    let accumulatedTime = 0;
    for (let i = 0; i < verseDurations.length; i++) {
        accumulatedTime += verseDurations[i];
        if (accumulatedTime > timeToSeek) {
            activeVerseIndex = i;
            playFromVerse(i);
            break;
        }
    }
}

function playPreviousVerse() {
    if (activeVerseIndex > 0) {
        playFromVerse(activeVerseIndex - 1);
    }
}

function playNextVerse() {
    if (activeVerseIndex < verseDurations.length - 1) {
        playFromVerse(activeVerseIndex + 1);
    }
}

function stopPlayback() {
    isPlayingAll = false;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    document.querySelector('#play-all i').className = 'fas fa-play';
    activeVerseIndex = 0;
    updatePlayingVerse(1);
    
    // Remove highlight from all verses
    document.querySelectorAll('.verse-block').forEach(verse => {
        verse.style.backgroundColor = '';
    });
}

function updateProgress() {
    if (!isPlayingAll) return;
    
    // Calculate current time including completed verses
    const completedVersesDuration = verseDurations
        .slice(0, activeVerseIndex)
        .reduce((sum, duration) => sum + duration, 0);
    
    currentTime = completedVersesDuration + currentAudio.currentTime;
    const progress = (currentTime / totalDuration) * 100;
    
    // Update UI
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('current-time').textContent = formatTime(currentTime);
}

// Update the initialization
document.addEventListener('DOMContentLoaded', () => {
    loadSurah();
    initializeSidebar();
    
    // Add event listener for loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.addEventListener('transitionend', () => {
            if (loadingOverlay.style.opacity === '0') {
                loadingOverlay.remove();
            }
        });
    }

    // Add missing event listeners for audio controls
    const progressContainer = document.getElementById('progress-container');
    if (progressContainer) {
        progressContainer.addEventListener('click', handleProgressClick);
    }

    // Initialize audio controls
    currentAudio.addEventListener('timeupdate', updateProgress);
    currentAudio.addEventListener('ended', () => {
        if (isPlayingAll) {
            playFromVerse(activeVerseIndex + 1);
        } else {
            stopPlayback();
        }
    });
});

// Fix togglePlayAll function to properly handle states
async function togglePlayAll() {
    const playButton = document.getElementById('play-all');
    const icon = playButton?.querySelector('i');
    if (!icon) return;

    try {
        if (isPlayingAll) {
            // Pausing playback
            isPlayingAll = false;
            icon.className = 'fas fa-play';
            currentAudio.pause();
            
            // Remove highlighting from current verse
            document.querySelectorAll('.verse-block').forEach(verse => {
                verse.style.backgroundColor = '';
                verse.classList.remove('playing', 'active');
            });
        } else {
            // Starting playback
            isPlayingAll = true;
            icon.className = 'fas fa-pause';
            
            // Reset if at end
            if (activeVerseIndex >= document.querySelectorAll('.verse-block').length) {
                activeVerseIndex = 0;
            }
            
            // Start playing from current verse
            await playFromVerse(activeVerseIndex);
        }
    } catch (error) {
        console.error('Error in togglePlayAll:', error);
        isPlayingAll = false;
        icon.className = 'fas fa-play';
    }
}

// Fix playFromVerse function to handle errors better
async function playFromVerse(index) {
    if (!isPlayingAll) return;
    
    const verses = document.querySelectorAll('.verse-block');
    if (index >= verses.length) {
        stopPlayback();
        return;
    }
    
    try {
        activeVerseIndex = index;
        
        // Clear previous highlights and icons
        verses.forEach(verse => {
            verse.style.backgroundColor = '';
            verse.classList.remove('playing', 'active');
            const btn = verse.querySelector('.play-verse-btn i');
            if (btn) btn.className = 'fas fa-play';
        });
        
        // Setup current verse
        const currentVerse = verses[index];
        if (!currentVerse) return;
        
        // Add highlight
        currentVerse.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        currentVerse.classList.add('playing', 'active');
        
        // Update play button
        const playBtn = currentVerse.querySelector('.play-verse-btn i');
        if (playBtn) playBtn.className = 'fas fa-pause';
        
        // Scroll into view
        currentVerse.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        
        // Update UI
        updatePlayingVerse(index + 1);
        
        // Get audio URL
        const audioBtn = currentVerse.querySelector('.play-verse-btn');
        const audioUrl = audioBtn?.dataset.audioUrl;
        
        if (!audioUrl) {
            console.warn('No audio URL found for verse:', index + 1);
            playFromVerse(index + 1);
            return;
        }
        
        // Play audio
        currentAudio.src = `${AUDIO_BASE_URL}${audioUrl}`;
        await currentAudio.play();
        
    } catch (error) {
        console.error('Error in playFromVerse:', error);
        // Try to play next verse on error
        playFromVerse(index + 1);
    }
}

// Update the audio ended event listener
currentAudio.addEventListener('ended', () => {
    if (!isPlayingAll) {
        if (currentPlayingVerse) {
            const verseElement = document.getElementById(`verse-${currentPlayingVerse.split(':')[1]}`);
            if (verseElement) {
                verseElement.querySelector('.play-verse-btn i').className = 'fas fa-play';
                verseElement.style.backgroundColor = '';
            }
        }
        isPlaying = false;
        currentPlayingVerse = null;
    }
});

// Update the shareVerse function
async function shareVerse(verseKey) {
    const url = new URL(window.location.href);
    url.searchParams.set('verse', verseKey.split(':')[1]);
    
    try {
        await navigator.clipboard.writeText(url.toString());
        showToast('Link copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link', 'error');
    }
}
