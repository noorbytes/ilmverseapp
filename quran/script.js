const API_BASE_URL = 'https://api.quran.com/api/v4';
const RECITATION_API_BASE_URL = `${API_BASE_URL}/recitations`;
const CHAPTERS_API_URL = `${API_BASE_URL}/chapters`;
const VERSES_API_URL = `${API_BASE_URL}/quran/verses/uthmani`;
const TRANSLATIONS_API_URL = `${API_BASE_URL}/quran/translations/131`;
const TRANSLITERATIONS_API_URL = `${API_BASE_URL}/quran/transliterations/131`;
const QARI_LIST_API_URL = `${API_BASE_URL}/resources/recitations`;
const AUDIO_BASE_URL = 'https://verses.quran.com/';

const surahSelect = document.getElementById('surah-select');
const qariSelect = document.getElementById('qari-select');
let currentAudio = new Audio();
const fontSelect = document.getElementById('font-select');
const textSizeSlider = document.getElementById('text-size');
const verseContainer = document.getElementById('verse-container');
const playPauseButton = document.getElementById('play-pause');
const audioRange = document.getElementById('audio-range');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');

let verses = [];
let currentVerseIndex = 0;
let isPlaying = false;
let audioFiles = [];
let totalDuration = 0;

// Add these functions at the beginning of your script
function initializeSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    
    // Toggle sidebar
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });

    // Close sidebar when overlay is clicked
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    });

    // Close sidebar when clicking links (for mobile)
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        });
    });

    // Handle resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        }
    });
}

// Helper function to fetch data
async function fetchData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// Populate Surah Dropdown
async function populateSurahDropdown() {
    try {
        const data = await fetchData(CHAPTERS_API_URL);

        data.chapters.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.id;
            option.textContent = `${surah.id}. ${surah.name_simple} - ${surah.translated_name.name}`;
            surahSelect.appendChild(option);
        });

        loadSurahFromURL(); // Load based on URL or default to Al-Fatiha (1)
    } catch (error) {
        console.error('Error loading Surahs:', error);
    }
}

// Load Surah by ID
async function loadSurah(surahId) {
    try {
        // Update URL without reloading
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', surahId);
        window.history.pushState({}, '', newUrl);

        // Fetch Arabic text, translations, and transliterations
        const versesUrl = `${VERSES_API_URL}?chapter_number=${surahId}`;
        const translationUrl = `${TRANSLATIONS_API_URL}?chapter_number=${surahId}`;
        const transliterationUrl = `${TRANSLITERATIONS_API_URL}?chapter_number=${surahId}`;

        console.log('Fetching from URLs:', { versesUrl, translationUrl, transliterationUrl });

        const [versesData, translationData, transliterationData] = await Promise.all([
            fetchData(versesUrl),
            fetchData(translationUrl),
            fetchData(transliterationUrl)
        ]);

        // Log raw data for inspection
        console.log('Verses Data:', versesData);
        console.log('Translation Data:', translationData);
        console.log('Transliteration Data:', transliterationData);

        verses = versesData.verses.map((verse, index) => ({
            verse_number: verse.verse_number,
            verse_key: `${surahId}:${verse.verse_number}`,
            text_uthmani: verse.text_uthmani,
            translations: [{
                text: translationData.translations[index].text
            }],
            transliterations: [{
                text: transliterationData.transliterations[index].text
            }]
        }));

        displayVerses(verses, surahId);
        setupAudio(surahId);
    } catch (error) {
        console.error('Error loading Surah:', error);
    }
}

// Display Verses with Arabic, Translation, and Transliteration
function displayVerses(verses, surahId) {
    console.log('Received verses:', verses);
    verseContainer.innerHTML = '';
    verses.forEach((verse, index) => {
        const verseBlock = document.createElement('div');
        verseBlock.className = 'p-4 border-b border-gray-700 verse-block';
        verseBlock.setAttribute('data-verse-number', verse.verse_number);

        const verseNumberBadge = document.createElement('span');
        verseNumberBadge.className = 'inline-block bg-blue-600 text-white px-2 py-1 rounded-full text-sm mb-2';
        verseNumberBadge.textContent = `${surahId}:${verse.verse_number}`;
        verseBlock.appendChild(verseNumberBadge);

        const arabicText = document.createElement('p');
        arabicText.className = 'arabic-text mb-2';
        arabicText.style.fontSize = `${textSizeSlider.value}px`;
        arabicText.dir = 'rtl';

        if (fontSelect.value === 'IndoPak') {
            fetchData(`${API_BASE_URL}/quran/verses/indopak?chapter_number=${surahId}`)
                .then(data => {
                    const indoPakVerse = data.verses.find(v => v.verse_number === verse.verse_number);
                    if (indoPakVerse) {
                        arabicText.innerText = indoPakVerse.text_indopak;
                    } else {
                        arabicText.innerText = verse.text_uthmani;
                    }
                })
                .catch(error => {
                    console.error('Error fetching IndoPak text:', error);
                    arabicText.innerText = verse.text_uthmani;
                });
        } else {
            arabicText.innerText = verse.text_uthmani;
        }
        
        arabicText.style.fontFamily = fontSelect.value === 'IndoPak' ? 'Noto Naskh Arabic' : 'Amiri';
        arabicText.style.letterSpacing = fontSelect.value === 'IndoPak' ? '2px' : 'normal';
        arabicText.style.wordSpacing = fontSelect.value === 'IndoPak' ? '8px' : 'normal';

        verseBlock.appendChild(arabicText);

        const transliterationText = document.createElement('p');
        transliterationText.className = 'text-sm text-gray-300 mt-2';
        transliterationText.style.fontSize = '1.1rem';
        transliterationText.innerText = verse.transliterations[0].text;
        const shouldShow = document.getElementById('show-transliteration').checked;
        transliterationText.style.display = shouldShow ? 'block' : 'none';

        const translationText = document.createElement('p');
        translationText.className = 'text-sm text-gray-400 mt-2';
        translationText.style.fontSize = '1.25rem';
        translationText.innerText = verse.translations[0].text.replace(/<sup[^>]*>.*?<\/sup>/g, '').trim();

        verseBlock.appendChild(verseNumberBadge);
        verseBlock.appendChild(arabicText);
        verseBlock.appendChild(transliterationText);
        verseBlock.appendChild(translationText);
        verseContainer.appendChild(verseBlock);
    });
}

// Setup Audio for Selected Surah
async function setupAudio(surahId) {
    const qariId = qariSelect.value;
    const audioUrl = `${RECITATION_API_BASE_URL}/${qariId}/by_chapter/${surahId}`;
    
    console.log('Loading audio:', audioUrl);
    try {
        const data = await fetchData(audioUrl);
        audioFiles = data.audio_files;
        currentVerseIndex = 0;
        totalDuration = 0;

        // Calculate total duration of all audio files
        for (const file of audioFiles) {
            const audio = new Audio(`${AUDIO_BASE_URL}${file.url}`);
            await new Promise(resolve => {
                audio.onloadedmetadata = () => {
                    totalDuration += audio.duration;
                    resolve();
                };
            });
        }

        durationTimeDisplay.innerText = formatTime(totalDuration);
    } catch (error) {
        console.error('Error fetching audio:', error);
    }
}

// Play the next verse's audio
function playNextVerse() {
    if (currentVerseIndex < audioFiles.length) {
        const audioFileUrl = `${AUDIO_BASE_URL}${audioFiles[currentVerseIndex].url}`;
        currentAudio.src = audioFileUrl;
        currentAudio.play();
        highlightAndScrollToVerse(currentVerseIndex + 1);
        currentAudio.onended = playNextVerse;
        currentVerseIndex++;
    } else {
        isPlaying = false;
        playPauseButton.textContent = 'Play';
    }
}

// Sync verse highlight with audio time
function highlightAndScrollToVerse(verseNumber) {
    document.querySelectorAll('.verse-block').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.getAttribute('data-verse-number')) === verseNumber) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

// Load Surah from URL
function loadSurahFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const surahId = urlParams.get('id') || 1; // Default to Al-Fatiha
    surahSelect.value = surahId;
    loadSurah(surahId);
}

// Play or Pause the Audio
function toggleAudio() {
    if (!currentAudio.src) {
        setupAudio(surahSelect.value).then(() => {
            if (!isPlaying) {
                playNextVerse();
                isPlaying = true;
                playPauseButton.textContent = 'Pause';
            }
        });
    } else {
        if (isPlaying) {
            currentAudio.pause();
            playPauseButton.textContent = 'Play';
        } else {
            currentAudio.play().then(() => {
                console.log('Audio playing');
                playPauseButton.textContent = 'Pause';
            }).catch(error => {
                console.error('Error playing audio:', error);
                playPauseButton.textContent = 'Play';
                isPlaying = false;
            });
        }
        isPlaying = !isPlaying;
    }
}

// Populate Qari Dropdown
async function populateQariOptions() {
    try {
        const data = await fetchData(QARI_LIST_API_URL);
        const qaris = data.recitations;

        qariSelect.innerHTML = qaris.map(qari => 
            `<option value="${qari.id}">${qari.reciter_name}</option>`
        ).join('');
    } catch (error) {
        console.error('Error loading Qari options:', error);
    }
}

// Format Time in Minutes:Seconds
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// Event Listeners
surahSelect.addEventListener('change', (e) => {
    const selectedSurahId = e.target.value;
    loadSurah(selectedSurahId);
    verseContainer.scrollTop = 0; // Reset scroll position
});
qariSelect.addEventListener('change', () => {
    // Do not auto-play when Qari is selected
    setupAudio(surahSelect.value);
});
fontSelect.addEventListener('change', () => {
    if (fontSelect.value === 'IndoPak') {
        loadSurah(surahSelect.value); // Reload the frame to bring in the IndoPak Quran
    } else {
        displayVerses(verses, surahSelect.value);
    }
});
textSizeSlider.addEventListener('input', () => displayVerses(verses, surahSelect.value));
playPauseButton.addEventListener('click', toggleAudio);

currentAudio.addEventListener('timeupdate', () => {
    const totalCurrentTime = audioFiles.slice(0, currentVerseIndex).reduce((acc, file) => acc + new Audio(`${AUDIO_BASE_URL}${file.url}`).duration, 0) + currentAudio.currentTime;
    audioRange.value = (totalCurrentTime / totalDuration) * 100;
    currentTimeDisplay.innerText = formatTime(totalCurrentTime);
});

currentAudio.addEventListener('loadedmetadata', () => {
    durationTimeDisplay.innerText = formatTime(totalDuration);
});

// Transliteration toggle handler
document.getElementById('show-transliteration').addEventListener('change', (e) => {
    const transliterations = document.querySelectorAll('.text-sm.text-gray-300');
    transliterations.forEach(el => {
        el.style.display = e.target.checked ? 'block' : 'none';
    });
});

// Initialize the App
populateQariOptions();
populateSurahDropdown();

// Event listener for audio ended
currentAudio.addEventListener('ended', () => {
    playPauseButton.textContent = 'Play';
    isPlaying = false;
});

// Event listener for audio errors
currentAudio.addEventListener('error', () => {
    console.error('Audio error:', currentAudio.error);
    playPauseButton.textContent = 'Play';
    isPlaying = false;
});

// Add this line to your existing DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', () => {
    initializeSidebarToggle();
    // ...existing initialization code...
});