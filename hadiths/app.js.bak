document.addEventListener('DOMContentLoaded', async () => {
    console.log('App starting...');
    
    const hadithService = new HadithService();
    const chapterService = new ChapterService();
    
    let currentCollection = 'bukhari';
    let currentChapter = 1;
    let currentHadiths = [];

    // Remove problematic event listener
    // document.getElementById('index-search').addEventListener('keyup', ...);

    // Add chapter search functionality
    const chapterSearch = document.getElementById('chapter-search');
    if (chapterSearch) {
        chapterSearch.addEventListener('input', (e) => {
            const searchNum = parseInt(e.target.value);
            const chapterItems = document.querySelectorAll('.collection-item');
            
            chapterItems.forEach(item => {
                const chapterNum = parseInt(item.dataset.chapter);
                if (searchNum) {
                    if (chapterNum === searchNum) {
                        item.classList.remove('hidden');
                        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else {
                        item.classList.add('hidden');
                    }
                } else {
                    item.classList.remove('hidden');
                }
            });
        });
    }

    // Save and restore collection selection
    function saveCollection(collection) {
        localStorage.setItem('selectedCollection', collection);
    }

    function loadSavedCollection() {
        return localStorage.getItem('selectedCollection') || 'bukhari';
    }

    // Move collection select setup before init
    const collectionSelect = document.getElementById('collection-select');
    if (collectionSelect) {
        currentCollection = loadSavedCollection();
        collectionSelect.value = currentCollection;

        collectionSelect.addEventListener('change', (e) => {
            currentCollection = e.target.value;
            saveCollection(currentCollection);
            loadChapters(currentCollection);
            loadHadiths(currentCollection, 1);
        });
    }

    async function init() {
        try {
            // Remove collectionSelect check since it's now handled above
            currentCollection = loadSavedCollection();
            
            console.log('Testing chapter loading...');
            const chapters = await chapterService.getChapterList(currentCollection);
            console.log('Chapters loaded:', chapters);

            console.log('Testing hadith loading...');
            const hadiths = await hadithService.getHadithsByChapter(currentCollection, 1);
            console.log('Hadiths loaded:', hadiths);

            await loadChapters(currentCollection);
            await loadHadiths(currentCollection, currentChapter);

        } catch (error) {
            console.error('Initialization failed:', error);
            showError(`Failed to initialize: ${error.message}`);
        }
    }

    function initSearchFunctionality() {
        // Setup text search
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }

        // Setup collection select
        const collectionSelect = document.getElementById('collection-select');
        if (collectionSelect) {
            // Set initial value from saved selection
            currentCollection = loadSavedCollection();
            collectionSelect.value = currentCollection;

            collectionSelect.addEventListener('change', (e) => {
                currentCollection = e.target.value;
                saveCollection(currentCollection);
                loadChapters(currentCollection);
                loadHadiths(currentCollection, 1);
            });
        }

        // Setup number search only after hadiths are loaded
        const numberSearchContainer = document.getElementById('number-search-container');
        if (numberSearchContainer) {
            numberSearchContainer.innerHTML = `
                <div class="hadith-number-search">
                    <input type="number" 
                           id="number-search"
                           class="w-full bg-gray-700 rounded px-3 py-2" 
                           placeholder="Search hadith number..."
                           min="1">
                    <div id="number-list" class="number-list mt-2"></div>
                </div>
            `;

            const numberSearch = document.getElementById('number-search');
            if (numberSearch) {
                numberSearch.addEventListener('input', (e) => {
                    handleNumberSearch(e.target.value);
                });
            }
        }
    }

    function showLoading(show) {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = show ? 'block' : 'none';
    }

    function showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        }
    }
    
    async function loadChapters(collection) {
        try {
            const chapters = await chapterService.getChapterList(collection);
            const chapterList = document.getElementById('chapter-list');
            if (!chapterList) return;

            chapterList.innerHTML = chapters.map(chapter => `
                <div class="collection-item hover:bg-gray-700 p-2 rounded cursor-pointer" 
                     data-chapter="${chapter.number}">
                    <div class="flex flex-col">
                        <div class="flex items-center">
                            <span class="chapter-number text-emerald-500">${chapter.number}.</span>
                            <span class="chapter-title ml-2">${chapter.english}</span>
                        </div>
                        <div class="text-right text-sm text-gray-400 mt-1 font-arabic">
                            ${chapter.arabic}
                        </div>
                    </div>
                </div>
            `).join('');

            // Add click listeners to each chapter item
            document.querySelectorAll('.collection-item').forEach(item => {
                item.addEventListener('click', () => {
                    const chapter = parseInt(item.dataset.chapter);
                    currentChapter = chapter;
                    loadHadiths(currentCollection, chapter);
                    
                    // Update active state
                    document.querySelectorAll('.collection-item').forEach(i => 
                        i.classList.remove('bg-gray-700'));
                    item.classList.add('bg-gray-700');
                });
            });
        } catch (error) {
            showError('Failed to load chapters: ' + error.message);
        }
    }
    
    async function loadHadiths(collection, chapter) {
        showLoading(true);
        try {
            console.log('Loading hadiths for:', collection, chapter);
            const data = await hadithService.getHadithsByChapter(collection, chapter);
            console.log('Loaded data:', data);

            if (!data || !data.hadiths) {
                throw new Error('Invalid hadith data received');
            }

            currentHadiths = data.hadiths;
            
            const chapterTitle = document.getElementById('chapter-title');
            const hadithList = document.getElementById('hadith-list');
            
            if (!chapterTitle || !hadithList) {
                console.error('Required DOM elements not found');
                return;
            }

            // Update chapter title with metadata
            chapterTitle.innerHTML = `
                <div class="mb-8">
                    <h2 class="text-2xl font-bold mb-2">${data.metadata.english.title || ''}</h2>
                    <h3 class="text-xl text-emerald-500 mb-2">${data.metadata.english.author || ''}</h3>
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-lg">Chapter ${data.chapter.number}: ${data.chapter.english}</h4>
                        <div class="text-right">
                            <div class="text-xl font-arabic">${data.chapter.arabic}</div>
                        </div>
                    </div>
                </div>
            `;
            
            renderHadiths(data.hadiths);
            updateHadithNumbers(data.hadiths);

            // Update number search max value
            const numberSearch = document.getElementById('number-search');
            if (numberSearch) {
                numberSearch.setAttribute('max', currentHadiths.length);
                numberSearch.setAttribute('placeholder', `Search hadith number (1-${currentHadiths.length})`);
            }

        } catch (error) {
            console.error('Load error:', error);
            showError('Failed to load hadiths: ' + error.message);
            // Show empty state
            document.getElementById('hadith-list').innerHTML = `
                <div class="text-center text-gray-500 p-8">
                    No hadiths available for this chapter
                </div>
            `;
        } finally {
            showLoading(false);
        }
    }

    function applyFilters() {
        const searchText = document.getElementById('search').value.toLowerCase();
        const grades = Array.from(document.querySelectorAll('input[name="grade"]:checked'))
            .map(cb => cb.value);
        
        const filtered = currentHadiths.filter(hadith => {
            const matchesSearch = !searchText || 
                hadith.english.toLowerCase().includes(searchText) ||
                hadith.arabic.includes(searchText) ||
                hadith.narrator.toLowerCase().includes(searchText);
            const matchesGrade = !grades.length || grades.includes(hadith.grade);
            return matchesSearch && matchesGrade;
        });
        
        renderHadiths(filtered);
    }
    
    function renderHadiths(hadiths) {
        const hadithList = document.getElementById('hadith-list');
        if (!hadithList) return;

        hadithList.innerHTML = hadiths.map(hadith => `
            <div id="hadith-${hadith.number}" class="hadith-card content-spacing" 
                 data-hadith="${hadith.number}">
                <div class="hadith-reference">
                    <span>${hadith.reference}</span>
                    <span>Chapter ${hadith.chapter.number}</span>
                </div>
                
                <div class="hadith-narrator">
                    ${hadith.narrator}
                </div>

                <div class="hadith-arabic" lang="ar" dir="rtl">
                    ${hadith.arabic}
                </div>

                <div class="hadith-english content-container">
                    ${hadith.english}
                </div>

                <button class="copy-link" onclick="copyHadithLink(this)" 
                        data-link="${hadithService.generateHadithLink(currentCollection, currentChapter, hadith.number)}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 0 002-2M8 5a2 2 0 012-2h2a2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                    </svg>
                    <span class="tooltip">Copy link</span>
                </button>
            </div>
        `).join('');
    }

    // Handle deep linking
    async function handleDeepLink() {
        const hash = window.location.hash;
        const linkData = hadithService.parseHadithLink(hash);
        if (linkData) {
            currentCollection = linkData.collection;
            currentChapter = linkData.chapter;
            await loadChapters(currentCollection);
            await loadHadiths(currentCollection, currentChapter);
            
            // Scroll to specific hadith
            setTimeout(() => {
                const hadithElement = document.getElementById(`hadith-${linkData.hadithNumber}`);
                if (hadithElement) {
                    hadithElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
    }
    
    // Add mobile sidebar toggle
    const sidebarToggle = document.createElement('button');
    sidebarToggle.className = 'sidebar-toggle';
    sidebarToggle.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
    `;
    document.body.appendChild(sidebarToggle);

    sidebarToggle.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');
        sidebar.classList.toggle('open');
        
        // Close sidebar when clicking overlay
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    });

    // Handle link copying
    window.copyHadithLink = function(button) {
        const link = button.dataset.link;
        navigator.clipboard.writeText(link);
        
        const tooltip = button.querySelector('.tooltip');
        tooltip.textContent = 'Copied!';
        setTimeout(() => {
            tooltip.textContent = 'Copy link';
        }, 2000);
    };

    // Handle hash changes for deep linking
    window.addEventListener('hashchange', handleDeepLink);
    
    // Add scroll spy functionality
    document.addEventListener('scroll', () => {
        const hadithCards = document.querySelectorAll('.hadith-card');
        const numberItems = document.querySelectorAll('.number-item');
        
        hadithCards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            if (rect.top <= 100 && rect.bottom >= 100) {
                numberItems.forEach(item => item.classList.remove('active'));
                const activeItem = document.querySelector(
                    `.number-item[data-hadith="${card.dataset.hadith}"]`
                );
                if (activeItem) {
                    activeItem.classList.add('active');
                    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    });

    // Initial load
    try {
        // Initialize sidebar first
        const numberSearch = initializeSidebar();
        if (!numberSearch) {
            throw new Error('Failed to initialize hadith number search');
        }

        // Then handle deep linking and initial load
        await handleDeepLink();
        if (!window.location.hash) {
            await loadChapters(currentCollection);
            await loadHadiths(currentCollection, 1);
        }
    } catch (error) {
        showError('Failed to load initial data: ' + error.message);
    }

    function updateHadithNumbers(hadiths) {
        const numberList = document.querySelector('.number-list');
        if (!numberList) return;

        numberList.innerHTML = '';

        // Show the current chapter's hadith count at the top
        numberList.innerHTML = `
            <div class="chapter-hadith-count">
                This chapter has ${hadiths.length} hadiths
            </div>
        `;

        // Add hadith numbers with both sequential and actual numbers
        hadiths.forEach((hadith, index) => {
            const numberItem = document.createElement('div');
            numberItem.className = 'number-item';
            numberItem.dataset.hadith = hadith.number;
            numberItem.dataset.index = index + 1;
            numberItem.innerHTML = `
                <span class="sequential-number">#${index + 1}</span>
                <span class="actual-number">Hadith ${hadith.number}</span>
            `;
            
            numberItem.addEventListener('click', () => {
                const hadithElement = document.getElementById(`hadith-${hadith.number}`);
                if (hadithElement) {
                    hadithElement.scrollIntoView({ behavior: 'smooth' });
                    hadithElement.classList.add('highlight');
                    setTimeout(() => hadithElement.classList.remove('highlight'), 2000);
                    
                    document.querySelectorAll('.number-item').forEach(i => 
                        i.classList.remove('active'));
                    numberItem.classList.add('active');
                }
            });

            numberList.appendChild(numberItem);
        });
    }

    async function handleNumberSearch(searchValue) {
        const searchNum = parseInt(searchValue);
        const maxNumber = currentHadiths.length;
        const numberList = document.getElementById('number-list');

        if (!searchValue) {
            updateHadithNumbers(currentHadiths);
            return;
        }

        // Keep the chapter count at top
        numberList.innerHTML = `
            <div class="chapter-hadith-count">
                This chapter has ${maxNumber} hadiths
            </div>
        `;

        // Add suggestion if number exceeds chapter's hadith count
        if (searchNum > maxNumber) {
            numberList.innerHTML += `
                <div class="search-suggestion">
                    Try a number between 1 and ${maxNumber}.
                </div>
            `;
            return;
        }

        const numberItems = document.querySelectorAll('.number-item');
        const items = Array.from(numberItems);

        // Group matches by type
        const exactMatches = items.filter(item => {
            const sequentialNum = parseInt(item.dataset.index);
            return sequentialNum === searchNum;
        });

        const startsWithMatches = items.filter(item => {
            const sequentialNum = item.dataset.index;
            return sequentialNum.startsWith(searchValue) && !exactMatches.includes(item);
        });

        const otherMatches = items.filter(item => 
            !exactMatches.includes(item) && !startsWithMatches.includes(item)
        ).sort((a, b) => {
            const aNum = parseInt(a.dataset.index);
            const bNum = parseInt(b.dataset.index);
            const aDiff = Math.abs(aNum - searchNum);
            const bDiff = Math.abs(bNum - searchNum);
            return aDiff - bDiff;
        });

        // If we have exact matches, show them with a heading
        if (exactMatches.length > 0) {
            numberList.innerHTML += `
                <div class="match-heading">Exact Match:</div>
            `;
            exactMatches.forEach(item => {
                const clone = item.cloneNode(true);
                clone.classList.add('exact-match');
                numberList.appendChild(clone);
                
                const hadithNum = parseInt(item.dataset.hadith);
                scrollToHadith(hadithNum);
            });
        }

        // Show starts-with matches if any
        if (startsWithMatches.length > 0) {
            numberList.innerHTML += `
                <div class="match-heading">Similar Numbers:</div>
            `;
            startsWithMatches.forEach(item => {
                const clone = item.cloneNode(true);
                numberList.appendChild(clone);
            });
        }

        // Show closest matches
        if (otherMatches.length > 0 && !exactMatches.length) {
            numberList.innerHTML += `
                <div class="match-heading">Closest Numbers:</div>
            `;
            // Only show first 5 closest matches
            otherMatches.slice(0, 5).forEach(item => {
                const clone = item.cloneNode(true);
                numberList.appendChild(clone);
            });
        }

        // Re-add click handlers to all cloned items
        numberList.querySelectorAll('.number-item').forEach(item => {
            item.addEventListener('click', () => {
                const hadithNum = parseInt(item.dataset.hadith);
                scrollToHadith(hadithNum);
                document.querySelectorAll('.number-item').forEach(i => 
                    i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

<<<<<<< HEAD
    // Add live search functionality
=======
    // Enhanced live search functionality with dynamic suggestions
>>>>>>> 7a0c61e (Updated landing page, fixed API bugs, added Hadith keyword search)
    const mainSearch = document.getElementById('main-search');
    const searchResults = document.getElementById('search-results');

    let searchTimeout;
    mainSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
<<<<<<< HEAD
        const query = e.target.value;
        
        searchTimeout = setTimeout(() => {
            if (query.length >= 3) {
=======
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
>>>>>>> 7a0c61e (Updated landing page, fixed API bugs, added Hadith keyword search)
                searchHadiths(query);
            } else {
                searchResults.classList.remove('show');
            }
<<<<<<< HEAD
        }, 300);
    });

    async function searchHadiths(query) {
        const results = currentHadiths.filter(hadith => 
            hadith.english.toLowerCase().includes(query.toLowerCase()) ||
            hadith.arabic.includes(query) ||
            hadith.narrator.toLowerCase().includes(query.toLowerCase())
        );

        if (results.length > 0) {
            searchResults.innerHTML = results.map(hadith => `
                <div class="search-result-item" data-hadith="${hadith.number}">
                    <div class="text-emerald-500">#${hadith.number}</div>
                    <div class="text-sm">${hadith.english.substring(0, 150)}...</div>
                </div>
            `).join('');
=======
        }, 200); // Reduced delay for faster response
    });

    // Enhanced search function with better ranking and top 5 suggestions
    async function searchHadiths(query) {
        if (!query || query.length < 2) {
            searchResults.classList.remove('show');
            return;
        }

        const searchQuery = query.toLowerCase();
        const results = currentHadiths.map(hadith => {
            let score = 0;
            const english = hadith.english.toLowerCase();
            const arabic = hadith.arabic;
            const narrator = hadith.narrator.toLowerCase();
            const hadithNumber = hadith.number.toString();

            // Exact matches get highest score
            if (english.includes(searchQuery)) {
                score += 10;
                // Bonus for starting with query
                if (english.startsWith(searchQuery)) score += 5;
            }
            if (arabic.includes(query)) {
                score += 8;
            }
            if (narrator.includes(searchQuery)) {
                score += 6;
            }
            if (hadithNumber.includes(query)) {
                score += 4;
            }

            // Word boundary matches get bonus
            const words = searchQuery.split(' ');
            words.forEach(word => {
                if (word.length > 2) {
                    const regex = new RegExp(`\\b${word}`, 'i');
                    if (regex.test(english)) score += 3;
                    if (regex.test(narrator)) score += 2;
                }
            });

            return { hadith, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5) // Top 5 results only
        .map(result => result.hadith);

        if (results.length > 0) {
            searchResults.innerHTML = `
                <div class="search-header">
                    <span class="text-sm text-gray-400">Top ${results.length} matches for "${query}"</span>
                </div>
                ${results.map(hadith => `
                    <div class="search-result-item" data-hadith="${hadith.number}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="text-emerald-500 font-semibold">#${hadith.number}</div>
                                <div class="text-sm text-gray-300 mt-1">${hadith.english.substring(0, 120)}${hadith.english.length > 120 ? '...' : ''}</div>
                                <div class="text-xs text-gray-500 mt-1">${hadith.narrator}</div>
                            </div>
                            <div class="text-xs text-gray-400 ml-2">${hadith.grade || 'Sahih'}</div>
                        </div>
                    </div>
                `).join('')}
            `;
>>>>>>> 7a0c61e (Updated landing page, fixed API bugs, added Hadith keyword search)
            
            searchResults.classList.add('show');

            // Add click handlers
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const hadithNumber = item.dataset.hadith;
                    scrollToHadith(hadithNumber);
                    searchResults.classList.remove('show');
                    mainSearch.value = '';
                });
            });
        } else {
<<<<<<< HEAD
            searchResults.classList.remove('show');
=======
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <div class="text-gray-400 text-center py-4">
                        <i class="fas fa-search mb-2"></i>
                        <div>No hadith found matching "${query}"</div>
                        <div class="text-xs mt-1">Try different keywords or check spelling</div>
                    </div>
                </div>
            `;
            searchResults.classList.add('show');
>>>>>>> 7a0c61e (Updated landing page, fixed API bugs, added Hadith keyword search)
        }
    }

    function scrollToHadith(number) {
        const hadithElement = document.getElementById(`hadith-${number}`);
        if (hadithElement) {
            hadithElement.scrollIntoView({ behavior: 'smooth' });
            hadithElement.classList.add('highlight');
            setTimeout(() => hadithElement.classList.remove('highlight'), 2000);
        }
    }

    // Start initialization
    init().catch(error => {
        console.error('Fatal error:', error);
        showError('Application failed to start');
    });

    // Move navigateToHadith inside main scope
    async function navigateToHadith(collection, number) {
        try {
            const chapters = await chapterService.getChapterList(collection);
            
            // Find the chapter containing this hadith
            let currentCount = 0;
            let targetChapter = 1;
            
            for (let i = 0; i < chapters.length; i++) {
                const chapterData = await hadithService.getHadithsByChapter(collection, i + 1);
                currentCount += chapterData.hadiths.length;
                
                if (currentCount >= number) {
                    targetChapter = i + 1;
                    break;
                }
            }
            
            // Load the chapter and scroll to the hadith
            await loadHadiths(collection, targetChapter);
            
            // Add scroll to specific hadith after loading
            setTimeout(() => {
                const hadithElement = document.getElementById(`hadith-${number}`);
                if (hadithElement) {
                    hadithElement.scrollIntoView({ behavior: 'smooth' });
                    hadithElement.classList.add('highlight');
                    setTimeout(() => hadithElement.classList.remove('highlight'), 2000);
                }
            }, 500);

        } catch (error) {
            console.error('Failed to navigate to hadith:', error);
            showError('Failed to navigate to hadith: ' + error.message);
        }
    }
});
