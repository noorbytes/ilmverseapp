const CORS_PROXY = 'https://corsproxy.io/?';
const API_BASE_URL = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://verses.quran.com/';
const QARI = 'abdul_basit_murattal'; // Using Abdul Basit's recitation
const DEFAULT_QARI = 'Alafasy';
const AUDIO_FORMAT = 'mp3';

// Add new API endpoint for transliteration
const AL_QURAN_CLOUD_API = 'https://api.alquran.cloud/v1/surah';

// Add new audio state variables
let totalDuration = 0;
let audioProgress = 0;
let verseDurations = [];

let currentAudio = new Audio();
let isPlaying = false;
let currentVerseIndex = 0;
let verses = [];

// Add these new functions and variables
let audioDurations = {};
let totalSurahDuration = 0;
let currentSurahId = null;

async function loadAudioDurations() {
    try {
        const response = await fetch('audio-durations.json');
        audioDurations = await response.json();
        updateTotalDuration();
    } catch (error) {
        console.error('Error loading audio durations:', error);
    }
}

function updateTotalDuration() {
    if (!currentSurahId || !audioDurations[currentSurahId]) return;
    
    const surahDurations = audioDurations[currentSurahId].verses;
    totalSurahDuration = Object.values(surahDurations).reduce((sum, duration) => sum + duration, 0);
    
    // Update duration display
    durationTimeDisplay.textContent = formatTime(totalSurahDuration);
}

function updateProgressBar(currentTime) {
    if (!currentSurahId || !audioDurations[currentSurahId]) return;

    const surahDurations = audioDurations[currentSurahId].verses;
    let elapsedTime = 0;

    // Calculate elapsed time up to current verse
    for (let i = 1; i < currentVerseIndex; i++) {
        const verseKey = `${currentSurahId}:${i}`;
        elapsedTime += surahDurations[verseKey] || 0;
    }

    // Add current verse progress
    elapsedTime += currentTime;

    // Update progress bar and time display
    const progress = (elapsedTime / totalSurahDuration) * 100;
    audioRange.value = progress;
    currentTimeDisplay.textContent = formatTime(elapsedTime);
}

// Update the fetchWithCorsProxy function to handle errors better
async function fetchWithCorsProxy(url) {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.contents ? JSON.parse(data.contents) : data;
    } catch (error) {
        console.error('Fetch error:', error, 'URL:', url);
        throw error;
    }
}

// Add CORS proxy for audio
const fetchAudioWithProxy = async (url) => {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Audio fetch error:', error);
        throw error;
    }
};

// Update audio constants
const AUDIO_API_URL = 'https://api.quran.com/api/v4/recitations';
const AUDIO_BASE_URL = 'https://verses.quran.com/';
const RECITATION_ID = 7; // Mishari Rashid al-`Afasy
const DEFAULT_RECITER = 'Alafasy';

async function loadSurah() {
    const verseContainer = document.getElementById('verse-container');
    if (!verseContainer) return;

    verseContainer.innerHTML = '<div class="text-center p-8">Loading surah...</div>';

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const surahId = urlParams.get('id') || 1;
        currentSurahId = surahId;

        await loadAudioDurations(); // Load durations first

        // Fetch all required data
        const [surahData, versesData, audioData] = await Promise.all([
            fetch(`${API_BASE_URL}/chapters/${surahId}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/quran/verses/uthmani?chapter_number=${surahId}`).then(r => r.json()),
            fetch(`${API_BASE_URL}/recitations/${RECITATION_ID}/by_chapter/${surahId}`).then(r => r.json())
        ]);

        console.log('Audio data:', audioData);

        // Process verses with audio URLs
        verses = audioData.audio_files.map(audioFile => {
            const verse = versesData.verses.find(v => v.verse_key === audioFile.verse_key);
            const [surahNum, verseNum] = audioFile.verse_key.split(':');
            return {
                id: parseInt(verseNum),
                verse_key: audioFile.verse_key,
                text_uthmani: verse.text_uthmani,
                audioUrl: `${AUDIO_BASE_URL}${audioFile.url}`,
                duration: audioDurations[surahId].verses[audioFile.verse_key] || 0
            };
        });

        // Debug first verse audio
        console.log('First verse:', verses[0]);

        // After processing verses, calculate total duration
        let totalDuration = 0;
        const progressBar = document.querySelector('.progress');
        const currentTimeDisplay = document.getElementById('current-time');
        const durationDisplay = document.getElementById('duration-time');

        // Add time tracking to audio element
        currentAudio.addEventListener('timeupdate', () => {
            // Calculate current verse time plus previous verses time
            const currentTime = verses.slice(0, currentVerseIndex).reduce((acc, _, idx) => {
                return acc + (verses[idx].duration || 0);
            }, 0) + currentAudio.currentTime;

            // Update progress bar
            if (progressBar) {
                const progress = (currentTime / totalDuration) * 100;
                progressBar.style.width = `${progress}%`;
            }

            // Update time display
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(currentTime);
            }
        });

        // Calculate duration for each verse
        for (let verse of verses) {
            try {
                const audio = new Audio(verse.audioUrl);
                await new Promise((resolve) => {
                    audio.addEventListener('loadedmetadata', () => {
                        verse.duration = audio.duration;
                        totalDuration += audio.duration;
                        resolve();
                    });
                    audio.addEventListener('error', () => {
                        verse.duration = 0;
                        resolve();
                    });
                });
            } catch (error) {
                console.error('Error loading audio duration:', error);
                verse.duration = 0;
            }
        }

        // Set total duration display
        if (durationDisplay) {
            durationDisplay.textContent = formatTime(totalDuration);
        }

        // Rest of your rendering code...
        verseContainer.innerHTML = `
            <div class="surah-info mb-8">
                <h1 class="text-3xl mb-2 text-center font-bold">${surahData.chapter.name_arabic}</h1>
                <h2 class="text-xl mb-2 text-center">${surahData.chapter.name_simple}</h2>
                <p class="text-gray-400 text-center">${surahData.chapter.verses_count} Verses • ${surahData.chapter.revelation_place}</p>
            </div>
            <div class="verses-wrapper">
                ${verses.map(verse => `
                    <div class="verse-block relative" id="verse-${verse.id}">
                        <div class="verse-number-badge absolute left-4 top-4 bg-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-sm text-emerald-400">
                            ${verse.verse_key}
                        </div>
                        <div class="verse-content pl-16 pr-4 py-6">
                            <button class="play-verse-btn absolute right-4 top-4 text-gray-400 hover:text-emerald-400"
                                    data-verse="${verse.id}">
                                <i class="fas fa-play"></i>
                            </button>
                            <div class="arabic-text text-right mb-4" dir="rtl">
                                ${verse.text_uthmani}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Setup audio player
        setupAudioControls();
        setupVerseClickHandlers();

    } catch (error) {
        console.error('Error:', error);
        verseContainer.innerHTML = `<div class="text-red-500 p-4 text-center">Failed to load surah: ${error.message}</div>`;
    }
}

// Helper function to get audio duration
function getAudioDuration(url) {
    return new Promise((resolve) => {
        const audio = new Audio(url);
        audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
        });
        audio.addEventListener('error', () => {
            resolve(0); // Fallback duration if audio fails to load
        });
    });
}

// Format time helper
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update progress bar and time display
function updateProgress() {
    // Calculate total progress including completed verses
    const completedVersesDuration = verseDurations
        .slice(0, currentVerseIndex)
        .reduce((sum, duration) => sum + duration, 0);
    
    const currentProgress = completedVersesDuration + currentAudio.currentTime;
    audioProgress = (currentProgress / totalDuration) * 100;

    // Update progress bar
    const progressBar = document.querySelector('.progress');
    if (progressBar) {
        progressBar.style.width = `${audioProgress}%`;
    }

    // Update time display
    const currentTimeDisplay = document.getElementById('current-time');
    if (currentTimeDisplay) {
        currentTimeDisplay.textContent = formatTime(currentProgress);
    }
}

// Handle progress bar click
function handleProgressBarClick(event) {
    const progressContainer = event.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const clickPosition = (event.clientX - rect.left) / rect.width;
    const timeToSeek = clickPosition * totalDuration;

    // Find which verse to play
    let accumulatedTime = 0;
    for (let i = 0; i < verseDurations.length; i++) {
        accumulatedTime += verseDurations[i];
        if (accumulatedTime > timeToSeek) {
            currentVerseIndex = i;
            const timeIntoVerse = timeToSeek - (accumulatedTime - verseDurations[i]);
            playVerseFromTime(currentVerseIndex, timeIntoVerse);
            break;
        }
    }
}

// Play verse from specific time
function playVerseFromTime(verseIndex, startTime) {
    if (verseIndex >= verses.length) return;

    currentVerseIndex = verseIndex;
    const verse = verses[currentVerseIndex];
    
    currentAudio.src = verse.audioUrl;
    currentAudio.currentTime = startTime;
    
    highlightVerse(verse.verse_key.split(':')[1]);
    scrollToVerse(verse.verse_key.split(':')[1]);
    
    currentAudio.play()
        .then(() => {
            isPlaying = true;
            updatePlayButton(true);
        })
        .catch(error => console.error('Error playing audio:', error));
}

function setupAudioControls() {
    const mainPlayBtn = document.getElementById('main-play-btn');
    
    if (mainPlayBtn) {
        mainPlayBtn.addEventListener('click', () => {
            console.log('Play button clicked, current state:', isPlaying);
            if (isPlaying) {
                pauseRecitation();
            } else {
                playFromVerse(1);
            }
        });
    }

    currentAudio.addEventListener('ended', () => {
        console.log('Audio ended, playing next verse');
        // Reset current verse button
        const currentVerseElement = document.getElementById(`verse-${verses[currentVerseIndex].id}`);
        if (currentVerseElement) {
            const playButton = currentVerseElement.querySelector('.play-verse-btn i');
            if (playButton) {
                playButton.className = 'fas fa-play';
            }
        }

        currentVerseIndex++;
        if (currentVerseIndex < verses.length) {
            playVerse();
        } else {
            stopRecitation();
        }
    });
}

function setupVerseClickHandlers() {
    document.querySelectorAll('.play-verse-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent verse block click
            const verseNumber = parseInt(e.currentTarget.dataset.verse);
            console.log('Verse button clicked:', verseNumber);
            
            // If clicking currently playing verse, pause it
            if (currentVerseIndex === verseNumber - 1 && isPlaying) {
                pauseRecitation();
            } else {
                playFromVerse(verseNumber);
            }
        });
    });
}

function playFromVerse(verseNumber) {
    currentVerseIndex = verseNumber - 1;
    playVerse();
}

// Update existing playVerse function to handle audio better
async function playVerse() {
    if (!verses || currentVerseIndex >= verses.length) {
        stopRecitation();
        return;
    }

    try {
        const verse = verses[currentVerseIndex];
        if (!verse || !verse.audioUrl) {
            console.error('Invalid verse or missing audio:', currentVerseIndex);
            currentVerseIndex++;
            playVerse();
            return;
        }

        console.log('Playing verse:', verse.verse_key, 'URL:', verse.audioUrl);
        
        // Update UI before playing
        const verseElement = document.getElementById(`verse-${verse.id}`);
        if (verseElement) {
            // Remove previous highlights
            document.querySelectorAll('.verse-block').forEach(block => {
                block.classList.remove('active', 'bg-emerald-900/20');
            });
            
            // Add highlight to current verse
            verseElement.classList.add('active', 'bg-emerald-900/20');
            
            // Scroll to verse
            verseElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });

            // Update verse button icon
            const playButton = verseElement.querySelector('.play-verse-btn i');
            if (playButton) {
                playButton.className = 'fas fa-pause';
            }
        }

        // Play audio
        currentAudio.src = verse.audioUrl;
        await currentAudio.load();
        await currentAudio.play();
        
        isPlaying = true;
        updatePlayButton(true);

    } catch (error) {
        console.error('Playback error:', error);
        currentVerseIndex++;
        playVerse();
    }
}

function playNextVerse() {
    currentVerseIndex++;
    playVerse();
}

function pauseRecitation() {
    currentAudio.pause();
    isPlaying = false;
    updatePlayButton(false);
    
    // Reset verse button
    const currentVerseElement = document.getElementById(`verse-${verses[currentVerseIndex].id}`);
    if (currentVerseElement) {
        const playButton = currentVerseElement.querySelector('.play-verse-btn i');
        if (playButton) {
            playButton.className = 'fas fa-play';
        }
    }
}

// Update stopRecitation to properly reset everything
function stopRecitation() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentVerseIndex = 0;
    isPlaying = false;
    updatePlayButton(false);
    removeAllHighlights();
}

function updatePlayButton(playing) {
    const mainPlayBtn = document.getElementById('main-play-btn');
    const icon = mainPlayBtn.querySelector('i');
    icon.className = playing ? 'fas fa-pause' : 'fas fa-play';
}

function highlightVerse(verseNumber) {
    removeAllHighlights();
    const verseElement = document.getElementById(`verse-${verseNumber}`);
    if (verseElement) {
        verseElement.classList.add('active');
    }
}

function removeAllHighlights() {
    document.querySelectorAll('.verse-block').forEach(block => {
        block.classList.remove('active');
    });
}

function scrollToVerse(verseNumber) {
    const verseElement = document.getElementById(`verse-${verseNumber}`);
    if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Add click handler for progress bar
function setupProgressBarClick() {
    const progressContainer = document.querySelector('.flex-grow.h-2.bg-gray-700');
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            
            // Calculate target time
            const totalDuration = verses.reduce((acc, verse) => acc + (verse.duration || 0), 0);
            const targetTime = ratio * totalDuration;
            
            // Find target verse
            let accumTime = 0;
            for (let i = 0; i < verses.length; i++) {
                accumTime += verses[i].duration || 0;
                if (accumTime > targetTime) {
                    currentVerseIndex = i;
                    const timeIntoVerse = targetTime - (accumTime - verses[i].duration);
                    playVerseFromTime(i, timeIntoVerse);
                    break;
                }
            }
        });
    }
}

// Add scroll and highlight management
function updateVerseHighlight(verseId) {
    // Remove previous highlights
    document.querySelectorAll('.verse-block').forEach(block => {
        block.classList.remove('active', 'bg-emerald-900/20');
    });

    // Add highlight to current verse
    const currentVerse = document.getElementById(`verse-${verseId}`);
    if (currentVerse) {
        currentVerse.classList.add('active', 'bg-emerald-900/20');
        
        // Smooth scroll to verse
        const container = document.querySelector('main');
        const verseTop = currentVerse.offsetTop;
        const containerHeight = container.clientHeight;
        const scrollPosition = verseTop - (containerHeight / 3); // Position verse 1/3 from top
        
        container.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
}

// Add CSS styles dynamically
const style = document.createElement('style');
style.textContent = `
    .verse-block {
        transition: background-color 0.3s ease;
    }
    .verse-block.active {
        background-color: rgba(16, 185, 129, 0.1);
        border-radius: 0.5rem;
    }
    .verse-block.active:hover {
        background-color: rgba(16, 185, 129, 0.2);
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadSurah();
    setupProgressBarClick();
});
