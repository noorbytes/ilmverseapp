const API_BASE_URL = 'https://api.alquran.cloud/v1';
const AUDIO_BASE_URL = 'https://cdn.islamic.network/quran/audio/128';

const surahSelect = document.getElementById('surah-select');
const qariSelect = document.getElementById('qari-select');
let currentAudio = null;
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
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();

        data.data.forEach(surah => {
            const option = document.createElement('option');
            option.value = surah.number;
            option.textContent = `${surah.number}. ${surah.name} - ${surah.englishName}`;
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

        // Fetch Arabic text
        const arabicUrl = `${API_BASE_URL}/surah/${surahId}`;
        const translationUrl = `${API_BASE_URL}/surah/${surahId}/en.sahih`;
        const transliterationUrl = `${API_BASE_URL}/surah/${surahId}/en.transliteration`;

        console.log('Fetching from URLs:', { arabicUrl, translationUrl, transliterationUrl });

        const [arabicResponse, translationResponse, transliterationResponse] = await Promise.all([
            fetch(arabicUrl),
            fetch(translationUrl),
            fetch(transliterationUrl)
        ]);

        const [arabicData, translationData, transliterationData] = await Promise.all([
            arabicResponse.json(),
            translationResponse.json(),
            transliterationResponse.json()
        ]);

        verses = arabicData.data.ayahs.map((ayah, index) => ({
            verse_number: ayah.numberInSurah,
            verse_key: `${surahId}:${ayah.numberInSurah}`,
            text_uthmani: ayah.text,
            translations: [{
                text: translationData.data.ayahs[index].text
            }],
            transliterations: [{
                text: transliterationData.data.ayahs[index].text
            }]
        }));

        displayVerses(verses, surahId);
        setupAudio(surahId);
    } catch (error) {
        console.error('Error loading Surah:', error);
    }
}

// Display Verses with Arabic and Translation
function displayVerses(verses, surahId) {
    console.log('Received verses:', verses);
    verseContainer.innerHTML = '';
    verses.forEach((verse, index) => {
        if (verse.verse_key.endsWith('1') && index > 0) return;

        const verseBlock = document.createElement('div');
        verseBlock.className = 'p-4 border-b border-gray-700 verse-block';
        verseBlock.setAttribute('data-verse-number', verse.verse_number);

        const verseNumberBadge = document.createElement('span');
        verseNumberBadge.className = 'inline-block bg-blue-600 text-white px-2 py-1 rounded-full text-sm mb-2';
        verseNumberBadge.textContent = verse.verse_key;
        verseBlock.appendChild(verseNumberBadge);

        const arabicText = document.createElement('p');
        arabicText.className = 'arabic-text mb-2';
        arabicText.style.fontSize = `${textSizeSlider.value}px`;
        arabicText.dir = 'rtl';

        if (fontSelect.value === 'IndoPak') {
            fetch(`https://api.quran.com/api/v4/quran/verses/indopak?chapter_number=${surahId}&verse_number=${verse.verse_number}`)
                .then(response => response.json())
                .then(data => {
                    if (data.verses && data.verses.length > 0) {
                        arabicText.innerText = data.verses[0].text_indopak;
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
                .then(data => {
                    if (data.verses && data.verses.length > 0) {
                        // Find the matching verse
                        const matchingVerse = data.verses.find(v => v.verse_number === verse.verse_number);
                        if (matchingVerse) {
                            arabicText.innerText = matchingVerse.text_indopak;
                        } else {
                            arabicText.innerText = verse.text_uthmani;
                        }
                    }
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

        const transliterationText = document.createElement('p');
        transliterationText.className = 'text-sm text-gray-300 mt-2';
        transliterationText.style.fontSize = '1.1rem';
        console.log('Transliterations:', verse.transliterations); // Debug log
        let transliteration = '';
        if (verse.transliterations && Array.isArray(verse.transliterations) && verse.transliterations.length > 0) {
            transliteration = verse.transliterations[0].text || '';
        }
        transliterationText.innerText = transliteration;
        const shouldShow = document.getElementById('show-transliteration').checked;
        transliterationText.style.display = shouldShow ? 'block' : 'none';
        console.log('Transliteration visibility:', shouldShow); // Debug log

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
    const qariPath = getQariPath(qariSelect.value);
    const formattedSurahId = String(surahId).padStart(3, '0');
    const audioUrl = `${AUDIO_BASE_URL}/${qariPath}/${formattedSurahId}.mp3`;
    
    console.log('Loading audio:', audioUrl);
    audioPlayer.src = audioUrl;
    audioPlayer.load();
    currentVerseIndex = 0;
    
    // Update audio progress
    audioPlayer.addEventListener('timeupdate', () => {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        audioRange.value = progress;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    });
    
    audioPlayer.addEventListener('loadedmetadata', () => {
        durationTimeDisplay.textContent = formatTime(audioPlayer.duration);
    });
    
    audioPlayer.addEventListener('ended', playNextVerse);
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
    if (!audioPlayer.src) {
        setupAudio(surahSelect.value);
    }
    
    if (isPlaying) {
        audioPlayer.pause();
        playPauseButton.textContent = 'Play';
    } else {
        audioPlayer.play().catch(error => {
            console.error('Error playing audio:', error);
            playPauseButton.textContent = 'Play';
            isPlaying = false;
        });
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
    document.querySelectorAll('.verse-block').forEach(el => {
        el.classList.remove('active');
        if (parseInt(el.getAttribute('data-verse-number')) === verseNumber) {
            el.classList.add('active');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}


// Get Qari Path
function getQariPath(qari) {
    const qaris = {
        'ar.alafasy': 'ar.alafasy',
        'ar.abdurrahmaansudais': 'ar.abdurrahmaansudais',
        'ar.hudhaify': 'ar.hudhaify',
        'ar.mahermuaiqly': 'ar.mahermuaiqly',
        'ar.minshawi': 'ar.minshawi',
        'ar.abdulbasit': 'ar.abdulbasit'
    };
    return qaris[qari] || 'ar.alafasy';
}

// Add qari options
function populateQariOptions() {
    const qaris = [
        { id: 'ar.alafasy', name: 'Mishary Alafasy' },
        { id: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais' },
        { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify' },
        { id: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly' },
        { id: 'ar.minshawi', name: 'Mohamed Siddiq El-Minshawi' },
        { id: 'ar.abdulbasit', name: 'Abdul Basit' },
        { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary' },
        { id: 'ar.muaiqly', name: 'Maher Al Muaiqly' },
        { id: 'ar.rifai', name: 'Hani Ar-Rifai' },
        { id: 'ar.shaatree', name: 'Abu Bakr Ash-Shaatree' },
        { id: 'ar.shuraym', name: 'Sa`ud Ash-Shuraym' },
        { id: 'ar.tablawi', name: 'Mohammad Al Tablawi' }
    ];
    
    qariSelect.innerHTML = qaris.map(qari => 
        `<option value="${qari.id}">${qari.name}</option>`
    ).join('');
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

// Transliteration toggle handler
document.getElementById('show-transliteration').addEventListener('change', (e) => {
    const transliterations = document.querySelectorAll('.text-sm.text-gray-300');
    transliterations.forEach(el => {
        el.style.display = e.target.checked ? 'block' : 'none';
    });
});

// Initialize the App
populateSurahDropdown();
populateQariOptions();

// Event listener for audio ended
audioPlayer.addEventListener('ended', () => {
    playPauseButton.textContent = 'Play';
    isPlaying = false;
});

// Event listener for audio errors
audioPlayer.addEventListener('error', () => {
    console.error('Audio error:', audioPlayer.error);
    playPauseButton.textContent = 'Play';
    isPlaying = false;
});