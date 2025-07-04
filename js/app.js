/**
 * SkyeServer Application Logic (Final Version)
 * --------------------------------------------
 * This script manages all client-side functionality for the SkyeServer PWA.
 * - Fetches and renders content from the API.
 * - Implements a dynamic hero carousel.
 * - Handles TV remote (D-pad) and keyboard navigation.
 * - Manages video playback, search, downloads, and external player links.
 * - Designed for a seamless experience on Android TV.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const API_BASE_URL = '/api'; // This will point to your Vercel serverless functions

    // --- DOM Element References ---
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const heroSection = document.getElementById('hero-section');
    const heroContent = document.getElementById('hero-content');
    const heroTitle = document.getElementById('hero-title');
    const heroDescription = document.getElementById('hero-description');
    const heroButtons = document.getElementById('hero-buttons');
    const contentRowsContainer = document.getElementById('content-rows');
    
    const videoPlayerOverlay = document.getElementById('video-player-overlay');
    const videoPlayer = document.getElementById('video-player');
    const closePlayerButton = document.getElementById('close-player');

    const searchBtn = document.getElementById('search-btn');
    const searchOverlay = document.getElementById('search-overlay');
    const searchInput = document.getElementById('search-input');

    const navLinks = document.querySelectorAll('.nav-link');

    // --- State Management ---
    let allContent = [];
    let heroItems = [];
    let currentHeroIndex = 0;
    let heroInterval;
    let lastFocusedElement;
    let isSearchActive = false;

    // --- Initial Data Fetch ---
    const fetchAllContent = async () => {
        try {
            // In a real app, this fetches from your live API.
            // For now, we use a mock fetch to simulate the API call.
            const response = await mockApiFetch(`${API_BASE_URL}/content`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            allContent = data;
            heroItems = data.filter(item => item.featured).slice(0, 5); // Get up to 5 featured items
            
            renderContent('home');
            startHeroCarousel();
        } catch (error) {
            console.error("Failed to fetch content:", error);
            contentRowsContainer.innerHTML = `<p class="text-center text-red-400">Could not load content. Please check the server connection.</p>`;
        }
    };

    // --- Rendering ---
    const renderContent = (categoryOrQuery) => {
        mainContent.style.display = 'block';
        searchOverlay.classList.add('hidden');
        isSearchActive = false;
        
        let contentToRender;
        if (categoryOrQuery === 'home') {
            const categories = [...new Set(allContent.map(item => item.category))];
            contentToRender = categories.map(cat => ({
                title: `Trending in ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
                items: allContent.filter(item => item.category === cat)
            }));
        } else if (['movies', 'tv'].includes(categoryOrQuery)) {
             contentToRender = [{
                title: `${categoryOrQuery.charAt(0).toUpperCase() + categoryOrQuery.slice(1)}`,
                items: allContent.filter(item => item.category === categoryOrQuery)
            }];
        } else { // This is a search query
             contentToRender = [{
                title: `Search Results for "${categoryOrQuery}"`,
                items: allContent.filter(item => item.title.toLowerCase().includes(categoryOrQuery.toLowerCase()))
            }];
        }
        
        contentRowsContainer.innerHTML = '';
        contentToRender.forEach(row => {
            if (row.items.length === 0) return;
            const rowEl = createContentRow(row.title, row.items);
            contentRowsContainer.appendChild(rowEl);
        });
        
        // Set focus on the first item of the first row for navigation
        const firstItem = contentRowsContainer.querySelector('.focusable');
        if (firstItem) {
            // Delay focus to ensure rendering is complete
            setTimeout(() => firstItem.focus(), 100);
        }
    };

    const createContentRow = (title, items) => {
        const row = document.createElement('div');
        row.className = 'mb-10 content-row';
        
        const titleEl = document.createElement('h2');
        titleEl.className = 'text-2xl font-bold mb-4';
        titleEl.textContent = title;
        row.appendChild(titleEl);

        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'content-row-inner flex overflow-x-auto pb-4';

        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'content-item focusable rounded-lg overflow-hidden shadow-lg bg-gray-800 w-40 md:w-48 mr-4 flex-shrink-0';
            itemEl.tabIndex = 0;
            itemEl.innerHTML = `<img src="${item.thumbnail}" alt="${item.title}" class="w-full h-full object-cover">`;
            
            itemEl.addEventListener('click', () => updateHero(item));
            itemEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    updateHero(item);
                }
            });
            itemsContainer.appendChild(itemEl);
        });
        row.appendChild(itemsContainer);
        return row;
    };

    // --- Hero Section Logic ---
    const updateHero = (item) => {
        heroSection.style.backgroundImage = `url('${item.thumbnail}')`;
        heroTitle.textContent = item.title;
        heroDescription.textContent = item.description;

        heroButtons.innerHTML = `
            <button data-url="${item.videoUrl}" class="play-btn focusable flex items-center bg-white text-black font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-transform">
                <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3.5 2.5a.5.5 0 01.832.374l1.5 6a.5.5 0 01-.832.374l-1.5-6A.5.5 0 017.5 6.5zM15 12a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                Watch Now
            </button>
            <a href="${item.videoUrl}" download="${item.title}.mp4" class="download-btn focusable flex items-center bg-gray-700 bg-opacity-50 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-transform">Download</a>
            <a href="vlc://${item.videoUrl}" class="external-play-btn focusable flex items-center bg-gray-700 bg-opacity-50 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-transform">External Player</a>
        `;
    };

    const startHeroCarousel = () => {
        if (heroItems.length > 0) {
            updateHero(heroItems[0]);
            clearInterval(heroInterval); // Clear any existing interval
            heroInterval = setInterval(() => {
                currentHeroIndex = (currentHeroIndex + 1) % heroItems.length;
                updateHero(heroItems[currentHeroIndex]);
            }, 7000); // Change hero item every 7 seconds
        } else {
             heroSection.style.display = 'none'; // Hide hero if no featured content
        }
    };
    
    // --- Player Logic ---
    const playVideo = (videoUrl) => {
        lastFocusedElement = document.activeElement;
        videoPlayer.src = videoUrl;
        videoPlayerOverlay.classList.remove('hidden');
        videoPlayer.play();
        closePlayerButton.focus();
    };

    const closePlayer = () => {
        videoPlayer.pause();
        videoPlayer.src = '';
        videoPlayerOverlay.classList.add('hidden');
        if (lastFocusedElement) lastFocusedElement.focus();
    };

    // --- Search Logic ---
    const activateSearch = () => {
        lastFocusedElement = document.activeElement;
        isSearchActive = true;
        searchOverlay.classList.remove('hidden');
        mainContent.style.display = 'none';
        searchInput.value = '';
        searchInput.focus();
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                renderContent(query);
            }
        } else if (e.key === 'Escape') {
            isSearchActive = false;
            searchOverlay.classList.add('hidden');
            mainContent.style.display = 'block';
            if (lastFocusedElement) lastFocusedElement.focus();
        }
    };

    // --- Navigation (D-Pad & Keyboard) ---
    const handleNavigation = (e) => {
        if (!videoPlayerOverlay.classList.contains('hidden') || isSearchActive) return;

        const { key } = e;
        const activeElement = document.activeElement;

        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;
        
        e.preventDefault();

        if (key === 'ArrowLeft') {
            const prevItem = activeElement.previousElementSibling;
            if (prevItem && prevItem.classList.contains('focusable')) {
                prevItem.focus();
            } else if (activeElement.closest('.content-row') || activeElement.closest('#hero-buttons')) {
                // If at start of a row, focus the active nav link
                document.querySelector('.nav-link.active')?.focus();
            }
        } else if (key === 'ArrowRight') {
             if (sidebar.contains(activeElement)) {
                // From sidebar to content
                const firstHeroButton = heroButtons.querySelector('.focusable');
                if (firstHeroButton) {
                    firstHeroButton.focus();
                } else {
                    contentRowsContainer.querySelector('.focusable')?.focus();
                }
            } else {
                const nextItem = activeElement.nextElementSibling;
                if (nextItem && nextItem.classList.contains('focusable')) {
                    nextItem.focus();
                }
            }
        } else if (key === 'ArrowUp') {
            if (activeElement.closest('.content-row')) {
                const currentRow = activeElement.closest('.content-row');
                const prevRow = currentRow.previousElementSibling;
                if (prevRow) {
                    findNearestItemInRow(activeElement, prevRow)?.focus();
                } else {
                    // From top row to hero buttons
                    findNearestItemInRow(activeElement, heroButtons)?.focus();
                }
            } else if (sidebar.contains(activeElement)) {
                const focusableLinks = Array.from(sidebar.querySelectorAll('.focusable'));
                const currentIndex = focusableLinks.indexOf(activeElement);
                if (currentIndex > 0) focusableLinks[currentIndex - 1].focus();
            }
        } else if (key === 'ArrowDown') {
            if (sidebar.contains(activeElement)) {
                const focusableLinks = Array.from(sidebar.querySelectorAll('.focusable'));
                const currentIndex = focusableLinks.indexOf(activeElement);
                if (currentIndex < focusableLinks.length - 1) focusableLinks[currentIndex + 1].focus();
            } else if (activeElement.closest('#hero-buttons')) {
                 // From hero buttons to first content row
                 const firstRow = contentRowsContainer.querySelector('.content-row');
                 if (firstRow) findNearestItemInRow(activeElement, firstRow)?.focus();
            } else if (activeElement.closest('.content-row')) {
                const currentRow = activeElement.closest('.content-row');
                const nextRow = currentRow.nextElementSibling;
                if (nextRow) findNearestItemInRow(activeElement, nextRow)?.focus();
            }
        }
    };
    
    const findNearestItemInRow = (currentItem, targetRow) => {
        const currentRect = currentItem.getBoundingClientRect();
        const items = targetRow.querySelectorAll('.focusable');
        let bestCandidate = null;
        let minDistance = Infinity;
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const distance = Math.abs(itemRect.left - currentRect.left);
            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = item;
            }
        });
        return bestCandidate;
    };

    // --- Event Listeners ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = link.dataset.category;
            if (category) {
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                renderContent(category);
            }
        });
    });
    
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        activateSearch();
    });
    searchInput.addEventListener('keydown', handleSearch);
    
    document.addEventListener('keydown', handleNavigation);
    closePlayerButton.addEventListener('click', closePlayer);
    
    // Use event delegation for dynamically added buttons
    document.addEventListener('click', (e) => {
        const playButton = e.target.closest('.play-btn');
        if (playButton) {
            playVideo(playButton.dataset.url);
        }
    });

    // --- Mock API Fetch for Demonstration ---
    const mockApiFetch = (url) => {
        console.log(`Mock fetching from: ${url}`);
        const mockData = [
            { id: 'mov1', title: 'Dune: Part Two', category: 'movies', featured: true, description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.', thumbnail: 'https://www.themoviedb.org/t/p/w1280/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
            { id: 'mov2', title: 'The Creator', category: 'movies', featured: true, description: 'Against the backdrop of a war between humans and robots with artificial intelligence, a former soldier finds the secret weapon, a robot in the form of a young child.', thumbnail: 'https://www.themoviedb.org/t/p/w1280/vB8o2p4ETnrfiEGYgKIFF9yjivU.jpg', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
            { id: 'tv1', title: 'Fallout', category: 'tv', featured: true, description: 'In a future, post-apocalyptic Los Angeles brought about by nuclear decimation, citizens must live in underground bunkers to protect themselves from radiation, mutants and bandits.', thumbnail: 'https://www.themoviedb.org/t/p/w1280/p31z5VjASyK1d23rR6A2LhS4vEL.jpg', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
            { id: 'mov3', title: 'Oppenheimer', category: 'movies', featured: false, description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', thumbnail: 'https://www.themoviedb.org/t/p/w1280/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
            { id: 'tv2', title: 'Shōgun', category: 'tv', featured: false, description: 'In Japan in the year 1600, at the dawn of a century-defining civil war, Lord Yoshii Toranaga is fighting for his life as his enemies on the Council of Regents unite against him.', thumbnail: 'https://www.themoviedb.org/t/p/w1280/7O4iVfOMQmdCS2Mv0497YORnDP1.jpg', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
        ];
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockData),
        });
    };

    // --- App Initialization ---
    fetchAllContent();
});
