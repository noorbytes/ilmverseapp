class HadithService {
    constructor() {
        this.collections = {
            bukhari: { name: "Sahih Al-Bukhari", limit: 7563 },
            muslim: { name: "Sahih Muslim", limit: 3032 },
            abudawud: { name: "Abu Dawud", limit: 3998 },
            ibnmajah: { name: "Ibn Majah", limit: 4342 },
            nasai: { name: "Sunan an-Nasa'i", limit: 5662 },
            tirmidhi: { name: "Al-Tirmidhi", limit: 3956 }
        };

        this.cache = new Map();
        this.chapterService = new ChapterService();
    }

    async getHadithsByChapter(collection, chapter) {
        const cacheKey = `${collection}-${chapter}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // Fix: Use correct path relative to current directory
            const path = `db/by_chapter/the_9_books/${collection}/${chapter}.json`;
            console.log('Attempting to fetch from:', path);
            
            const response = await fetch(path);
            if (!response.ok) {
                console.error('Failed to fetch:', path, response.status);
                throw new Error(`Failed to load chapter ${chapter} from ${collection} (${response.status})`);
            }

            const data = await response.json();
            console.log('Successfully loaded data:', { collection, chapter, dataSize: JSON.stringify(data).length });

            // Ensure all required properties exist with fallbacks
            const result = {
                metadata: {
                    arabic: {
                        title: data.metadata?.arabic?.title || '',
                        author: data.metadata?.arabic?.author || '',
                        introduction: data.metadata?.arabic?.introduction || ''
                    },
                    english: {
                        title: data.metadata?.english?.title || this.collections[collection]?.name || '',
                        author: data.metadata?.english?.author || '',
                        introduction: data.metadata?.english?.introduction || ''
                    }
                },
                chapter: {
                    number: chapter,
                    arabic: data.chapter?.arabic || '',
                    english: data.chapter?.english || `Chapter ${chapter}`
                },
                hadiths: (data.hadiths || []).map(h => ({
                    id: h.id,
                    number: h.idInBook,
                    reference: `${collection.toUpperCase()} ${h.idInBook}`,
                    arabic: h.arabic || '',
                    english: h.english?.text || '',
                    narrator: h.english?.narrator || '',
                    chapter: {
                        number: chapter,
                        arabic: data.chapter?.arabic || '',
                        english: data.chapter?.english || `Chapter ${chapter}`
                    }
                }))
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Failed to load hadiths:', error);
            throw error; // Let the app handle the error
        }
    }

    async searchHadiths(collection, query, chapter = null) {
        try {
            const data = await this.getHadithsByChapter(collection, chapter || 1);
            const searchQuery = query.toLowerCase();
            
            return {
                results: data.hadiths.filter(hadith => 
                    hadith.english.toLowerCase().includes(searchQuery) ||
                    hadith.arabic.includes(query) ||
                    hadith.narrator.toLowerCase().includes(searchQuery)
                ),
                chapter: data.chapter
            };
        } catch (error) {
            console.error('Search failed:', error);
            return { results: [], chapter: { number: chapter, name: 'Unknown Chapter' } };
        }
    }

    getHadithGrade(grade = '') {
        const normalized = String(grade).toLowerCase().trim();
        if (normalized.includes('sahih')) return 'sahih';
        if (normalized.includes('hasan')) return 'hasan';
        if (normalized.includes('dhaif') || normalized.includes('daif')) return 'daif';
        return 'unknown';
    }

    getCollectionNames() {
        return Object.entries(this.collections).map(([key, value]) => ({
            id: key,
            name: value.name,
            limit: value.limit
        }));
    }

    async getChapterCount(collection) {
        const chapters = await this.chapterService.getChapterList(collection);
        return chapters.length;
    }

    async getHadithCount(collection, chapter) {
        try {
            const data = await this.getHadithsByChapter(collection, chapter);
            return data.hadiths.length;
        } catch (error) {
            console.error('Failed to get hadith count:', error);
            return 0;
        }
    }

    generateHadithLink(collection, chapter, hadithNumber) {
        return `${window.location.origin}${window.location.pathname}#${collection}/${chapter}/${hadithNumber}`;
    }

    parseHadithLink(hash) {
        if (!hash) return null;
        const parts = hash.replace('#', '').split('/');
        if (parts.length !== 3) return null;
        
        return {
            collection: parts[0],
            chapter: parseInt(parts[1]),
            hadithNumber: parseInt(parts[2])
        };
    }
}
