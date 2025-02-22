const fs = require('fs');
const path = require('path');

const BOOKS = ['bukhari', 'muslim', 'abudawud', 'nasai', 'tirmidhi', 'ibnmajah'];
const SOURCE_DIR = '../db/by_chapter/the_9_books';
const OUTPUT_FILE = '../db/by_chapter/chapter.json';

async function generateChaptersJson() {
    const chapters = {};

    for (const book of BOOKS) {
        console.log(`Processing ${book}...`);
        const bookChapters = [];
        const bookPath = path.join(__dirname, SOURCE_DIR, book);

        try {
            const files = fs.readdirSync(bookPath)
                .filter(f => f.endsWith('.json'))
                .sort((a, b) => parseInt(a) - parseInt(b));

            for (const file of files) {
                const content = fs.readFileSync(path.join(bookPath, file), 'utf8');
                const data = JSON.parse(content);
                
                // Get chapter name from metadata
                const chapterName = {
                    arabic: data.metadata.arabic.introduction,
                    english: data.metadata.english.introduction
                };
                
                bookChapters.push(chapterName);
            }

            // Format book data
            const bookData = {
                title: {
                    arabic: bookChapters[0]?.arabic || '',
                    english: bookChapters[0]?.english || ''
                },
                chapters: bookChapters,
                total_chapters: bookChapters.length
            };

            // Add to main chapters object
            chapters[book] = bookData;

        } catch (error) {
            console.error(`Error processing ${book}:`, error);
        }
    }

    // Write the final JSON
    const outputPath = path.join(__dirname, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(chapters, null, 2));
    console.log(`Generated chapters.json with ${Object.keys(chapters).length} books`);
}

generateChaptersJson();
