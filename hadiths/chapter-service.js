class ChapterService {
    constructor() {
        this.chaptersData = null;
    }

    async loadChapters() {
        if (this.chaptersData) return this.chaptersData;
        
        try {
            // Fix: Updated path to match the actual file location
            const path = 'db/by_chapter/chapter.json';
            console.log('Loading chapters from:', path);
            
            const response = await fetch(path);
            if (!response.ok) {
                console.error('Failed to fetch chapters:', path, response.status);
                throw new Error('Failed to load chapters data');
            }
            
            this.chaptersData = await response.json();
            console.log('Successfully loaded chapters:', Object.keys(this.chaptersData));
            return this.chaptersData;
        } catch (error) {
            console.error('Failed to load chapters:', error);
            return null;
        }
    }

    async getChapterName(collection, chapterNumber) {
        const chapters = await this.loadChapters();
        if (!chapters || !chapters[collection]) return 'Unknown Chapter';
        
        const chapter = chapters[collection].chapters[chapterNumber - 1];
        return chapter ? {
            arabic: chapter.arabic,
            english: chapter.english
        } : 'Unknown Chapter';
    }

    async getChapterList(collection) {
        const chapters = await this.loadChapters();
        if (!chapters || !chapters[collection]) return [];
        
        return chapters[collection].chapters.map((chapter, index) => ({
            number: index + 1,
            arabic: chapter.arabic,
            english: chapter.english
        }));
    }

    async getCollectionInfo(collection) {
        const chapters = await this.loadChapters();
        if (!chapters || !chapters[collection]) return null;
        
        return {
            title: chapters[collection].title,
            totalChapters: chapters[collection].total_chapters
        };
    }
}
