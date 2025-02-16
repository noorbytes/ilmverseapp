const API_VERSES = 'https://api.quran.com/api/v4/verses/by_chapter/';
const AUDIO_BASE_URL = 'https://verses.quran.com/';

const surahId = new URLSearchParams(window.location.search).get('surah') || '1'; // Default to Surah Al-Fatiha
const verseContainer = document.getElementById('verse-container');
let audio = new Audio();
let currentVerse = 0;

// Fetch verses and display them with translations
fetch(`${API_VERSES}${surahId}?translations=131&language=en`)
    .then(response => response.json())
    .then(data => {
        renderVerses(data.verses);
        document.getElementById('surah-title').textContent = `Surah ${data.verses[0].chapter_name}`;
    })
    .catch(error => console.error('Error fetching verses:', error));

// Render verses with Arabic text and translation
function renderVerses(verses) {
    verseContainer.innerHTML = '';

    verses.forEach((verse, index) => {
        const verseBlock = document.createElement('div');
        verseBlock.className = 'p-4 border-b last:border-none';
        verseBlock.id = `verse-${index}`;

        const arabicText = document.createElement('p');
        arabicText.className = 'text-2xl text-right font-semibold mb-2';
        arabicText.textContent = verse.text_uthmani;

        const translationText = document.createElement('p');
        translationText.className = 'text-sm text-gray-600 italic';
        translationText.textContent = verse.translations[0].text;

        verseBlock.appendChild(arabicText);
        verseBlock.appendChild(translationText);
        verseContainer.appendChild(verseBlock);
    });
}

// Play the recitation with verse syncing
document.getElementById('play-button').onclick = () => {
    playRecitation();
};

function playRecitation() {
    const audioUrl = `${AUDIO_BASE_URL}${surahId}.mp3`;
    audio.src = audioUrl;
    audio.play();

    audio.ontimeupdate = syncVerseHighlight;
}

// Sync verse highlight with audio time
function syncVerseHighlight() {
    const verseElements = document.querySelectorAll('[id^=verse-]');
    const verseDuration = audio.duration / verseElements.length;
    currentVerse = Math.floor(audio.currentTime / verseDuration);

    verseElements.forEach((verse, index) => {
        if (index === currentVerse) {
            verse.classList.add('bg-yellow-200');
            verse.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            verse.classList.remove('bg-yellow-200');
        }
    });
}

audio.onended = () => {
    currentVerse = 0;
    audio.currentTime = 0;
};
