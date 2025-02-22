const fs = require('fs');
const https = require('https');

const AUDIO_BASE_URL = 'https://verses.quran.com/'; // Add base URL

async function generateAudioDurations() {
    const audioDurations = {};
    const surahId = 58; // Only process Surah 58
    
    try {
        console.log(`Processing surah ${surahId}...`);
        
        const response = await fetch(
            `https://api.quran.com/api/v4/recitations/7/by_chapter/${surahId}?per_page=300`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        audioDurations[surahId] = {
            reciter: "7",
            verses: {}
        };

        if (!data.audio_files || !Array.isArray(data.audio_files)) {
            console.log(`No audio files found for surah ${surahId}, exiting...`);
            return;
        }
        
        for (const audioFile of data.audio_files) {
            if (!audioFile.url) continue;
            
            try {
                const fullUrl = new URL(audioFile.url, AUDIO_BASE_URL).toString();
                const duration = await getAudioDuration(fullUrl);
                if (duration > 0) {
                    audioDurations[surahId].verses[audioFile.verse_key] = duration;
                    console.log(`Added duration for verse ${audioFile.verse_key}: ${duration}s`);
                }
            } catch (audioError) {
                console.error(`Error processing audio for verse ${audioFile.verse_key}:`, audioError);
            }
        }
        
        fs.writeFileSync(
            'test.json', 
            JSON.stringify(audioDurations, null, 2)
        );
        
        console.log(`Completed surah ${surahId}`);
        
    } catch (error) {
        console.error(`Error processing surah ${surahId}:`, error);
    }
}

function getAudioDuration(url) {
    return new Promise((resolve, reject) => {
        // Validate URL before making request
        try {
            new URL(url); // This will throw if URL is invalid
        } catch (error) {
            console.error('Invalid URL:', url);
            resolve(0); // Return 0 for invalid URLs instead of failing
            return;
        }

        https.get(url, (response) => {
            // Check if we got redirected
            if (response.statusCode === 301 || response.statusCode === 302) {
                getAudioDuration(response.headers.location).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                console.error(`HTTP ${response.statusCode} for ${url}`);
                resolve(0);
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    // Assuming MP3 format with 128kbps bitrate
                    const duration = buffer.length / (128 * 128);
                    resolve(Math.round(duration * 10) / 10); // Round to 1 decimal
                } catch (error) {
                    console.error('Error processing audio data:', error);
                    resolve(0);
                }
            });
            response.on('error', error => {
                console.error('Response error:', error);
                resolve(0);
            });
        }).on('error', error => {
            console.error('Request error:', error);
            resolve(0);
        });
    });
}

// Run the generator
generateAudioDurations().catch(error => {
    console.error('Generator error:', error);
    process.exit(1);
});
