const API_BASE_URL = 'https://api.quran.com/api/v4';
const AUDIO_BASE_URL = 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal';

const surahSelect = document.getElementById('surah-select');
const qariSelect = document.getElementById('qari-select');
const fontSelect = document.getElementById('font-select');
const textSizeSlider = document.getElementById('text-size');
const verseContainer = document.getElementById('verse-container');
const playPauseButton = document.getElementById('play-pause');
const audioPlayer = document.getElementById('quran-audio');
const audioRange = document.getElementById('audio-range');
const currentTimeDisplay = document.getElementById('current-time');
const durationTimeDisplay = document.getElementById('duration-time');

let verses = [];
let currentVerseIndex = 0;
let isPlaying = false;

// Populate Surah Dropdown
async function populateSurahDropdown() {
    try {
        const response = await fetch(`${API_BASE_URL}/chapters`);
        const data = await response.json();

        data.chapters.forEach(chapter => {
            const option = document.createElement('option');
            option.value = chapter.id;
            option.textContent = `${chapter.id}. ${chapter.name_arabic} - ${chapter.name_simple}`;
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
        const url = `${API_BASE_URL}/verses/by_chapter/${surahId}?translations=131&fields=text_uthmani,text_indopak,page=1&per_page=300`;
        const response = await fetch(url);
        const data = await response.json();

        verses = data.verses;
        displayVerses(verses, surahId);
        setupAudio(surahId);
    } catch (error) {
        console.error('Error loading Surah:', error);
    }
}

// Display Verses with Arabic and Translation
function displayVerses(verses, surahId) {
    verseContainer.innerHTML = '';
    verses.forEach(verse => {
        const verseBlock = document.createElement('div');
        verseBlock.className = 'p-4 border-b border-gray-700';
        verseBlock.id = `verse-${verse.verse_number}`;

        const verseNumberText = document.createElement('span');
        verseNumberText.className = 'font-bold text-lg mr-2';
        verseNumberText.innerText = `${surahId}:${verse.verse_number}`;

        const arabicText = document.createElement('p');
        arabicText.className = 'arabic-text mb-2';
        arabicText.style.fontSize = `${textSizeSlider.value}px`;
        arabicText.dir = 'rtl';

        if (fontSelect.value === 'IndoPak') {
            fetch(`${API_BASE_URL}/quran/verses/indopak?chapter_number=${surahId}&verse_number=${verse.verse_number}`)
                .then(response => response.json())
                .then(data => {
                    arabicText.style.fontFamily = 'Noto Naskh Arabic';
                    arabicText.style.letterSpacing = '2px';
                    arabicText.style.wordSpacing = '8px';
                    arabicText.innerText = data.verses[0].text_indopak;
                })
                .catch(error => {
                    console.error('Error fetching Indo-Pak text:', error);
                    arabicText.innerText = verse.text_uthmani;
                });
        } else {
            arabicText.style.fontFamily = 'Amiri';
            arabicText.style.letterSpacing = 'normal';
            arabicText.style.wordSpacing = 'normal';
            arabicText.innerText = verse.text_uthmani;
        }

        const translationText = document.createElement('p');
        translationText.className = 'text-sm text-gray-400';
        translationText.style.fontSize = '1.25rem';
        translationText.innerText = verse.translations[0].text.replace(/<sup[^>]*>.*?<\/sup>/g, '').trim();

        verseBlock.appendChild(verseNumberText);
        verseBlock.appendChild(arabicText);
        verseBlock.appendChild(translationText);
        verseContainer.appendChild(verseBlock);
    });
}

// Setup Audio for Selected Surah
async function setupAudio(surahId) {
    const formattedSurahId = surahId;
    

    audioPlayer.src = `${AUDIO_BASE_URL}/${formattedSurahId}.mp3`;
    audioPlayer.load();
    currentVerseIndex = 0;
    audioPlayer.addEventListener('ended', playNextVerse); // Play next verse when audio ends
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
    if (isPlaying) {
        audioPlayer.pause();
        playPauseButton.textContent = 'Play';
    } else {
        audioPlayer.play();
        playPauseButton.textContent = 'Pause';
    }
    isPlaying = !isPlaying;
}
let verseDurations = {}; // Store verse durations

// Fetch verse audio durations
async function fetchVerseDurations(surahId) {
    // Assuming each verse audio is named in the format: [surahId]-[verseNumber].mp3
    for (let verse of verses) {
        const verseNumber = verse.verse_number;
        verseDurations[verseNumber] = await getAudioDuration(`${AUDIO_BASE_URL}/${getQariPath(qariSelect.value)}/${String(surahId).padStart(3, '0')}.mp3`);
    }
}

// Get Audio Duration
async function getAudioDuration(audioSrc) {
    return new Promise((resolve) => {
        const audio = new Audio(audioSrc);
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
    });
}

// Setup Audio for Selected Surah
async function setupAudio(surahId) {
    const formattedSurahId = surahId;
    audioPlayer.src = `${AUDIO_BASE_URL}/${formattedSurahId}.mp3`;
    audioPlayer.load();
    currentVerseIndex = 0;
    await fetchVerseDurations(surahId); // Fetch durations when loading the surah
    audioPlayer.addEventListener('ended', playNextVerse); // Play next verse when audio ends
}

// Play Next Verse
async function playNextVerse() {
    if (currentVerseIndex < verses.length - 1) {
        currentVerseIndex++;
        const verseNumber = verses[currentVerseIndex].verse_number;
        audioPlayer.src = `${AUDIO_BASE_URL}/${getQariPath(qariSelect.value)}/${String(surahSelect.value).padStart(3, '0')}.mp3`;
        audioPlayer.play();
        highlightAndScrollToVerse(verseNumber);

        // Auto-scroll after the duration of the verse
        setTimeout(() => {
            highlightAndScrollToVerse(verseNumber);
        }, verseDurations[verseNumber] * 1000); // Multiply by 1000 to convert to milliseconds
    } else {
        isPlaying = false;
        playPauseButton.textContent = 'Play';
    }
}

// Highlight and Smooth Scroll
function highlightAndScrollToVerse(verseNumber) {
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`verse-${verseNumber}`);
    if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}


// Play Next Verse
async function playNextVerse() {
    if (currentVerseIndex < verses.length - 1) {
        currentVerseIndex++;
        audioPlayer.src = `${AUDIO_BASE_URL}${getQariPath(qariSelect.value)}/${String(verses[currentVerseIndex].verse_number).padStart(3, '0')}.mp3`;
        audioPlayer.play();
        highlightAndScrollToVerse(verses[currentVerseIndex].verse_number);
    } else {
        isPlaying = false;
        playPauseButton.textContent = 'Play';
    }
}

// Get Qari Path
function getQariPath(qari) {
    switch (qari) {
        case 'Alafasy':
            return 'mishaari_raashid_al_3afaasee';
        case 'Husary':
            return 'mahmood_khaleel_al-husaree_iza3a';
        default:
            return 'abdul_basit_murattal';
    }
}

// Highlight and Smooth Scroll
function highlightAndScrollToVerse(verseNumber) {
    document.querySelectorAll('.active').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`verse-${verseNumber}`);
    if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Format Time in Minutes:Seconds
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

// Event Listeners
surahSelect.addEventListener('change', () => loadSurah(surahSelect.value));
qariSelect.addEventListener('change', () => setupAudio(surahSelect.value));
fontSelect.addEventListener('change', () => displayVerses(verses, surahSelect.value));
textSizeSlider.addEventListener('input', () => displayVerses(verses, surahSelect.value));
playPauseButton.addEventListener('click', toggleAudio);

audioPlayer.addEventListener('timeupdate', () => {
    audioRange.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    currentTimeDisplay.innerText = formatTime(audioPlayer.currentTime);
});

audioPlayer.addEventListener('loadedmetadata', () => {
    durationTimeDisplay.innerText = formatTime(audioPlayer.duration);
});

// Initialize the App
populateSurahDropdown();
