/**
 * SkyeServer Application Logic (Production Version)
 * -------------------------------------------------
 * This script manages all client-side functionality for the SkyeServer PWA.
 * - Fetches and renders content exclusively from the live backend API.
 * - Implements a dynamic hero carousel based on live "featured" data.
 * - Handles TV remote (D-pad) and keyboard navigation.
 * - Manages video playback, search, downloads, and external player links.
 * - Designed for a seamless experience on Android TV and other platforms.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const API_BASE_URL = '/api'; // This points to your Vercel serverless functions

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

    // --- Live Data Fetch from API ---
    const fetchAllContent = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/content`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Network response was not ok: ${errorText}`);
            }
            const data = await response.json();
            
            allContent = data;
            heroItems = data.filter(item => item.featured).slice(0, 5);
            
            renderContent('home');
            startHeroCarousel();
        } catch (error) {
            console.error("Failed to fetch content:", error);
            contentRowsContainer.innerHTML = `<p class="text-center text-red-400 p-8">Could not load content. Please ensure the server is running and content has been added via the admin panel.</p>`;
            heroSection.style.display = 'none';
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
             const lowerCaseQuery = categoryOrQuery.toLowerCase();
             contentToRender = [{
                title: `Search Results for "${categoryOrQuery}"`,
                items: allContent.filter(item => item.title.toLowerCase().includes(lowerCaseQuery))
            }];
        }
        
        contentRowsContainer.innerHTML = '';
        contentToRender.forEach(row => {
            if (row.items.length === 0) return;
            const rowEl = createContentRow(row.title, row.items);
            contentRowsContainer.appendChild(rowEl);
        });
        
        // Set focus on the first item of the first row for navigation
        setTimeout(() => {
            const firstFocusable = mainContent.querySelector('.focusable');
            if (firstFocusable) firstFocusable.focus();
        }, 100);
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
            itemEl.innerHTML = `<img src="${item.thumbnail}" alt="${item.title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/400x600/0d1117/FFF?text=No+Image';">`;
            
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
        if (!item) return;
        heroSection.style.backgroundImage = `url('${item.thumbnail}')`;
        heroTitle.textContent = item.title;
        heroDescription.textContent = item.description;

        heroButtons.innerHTML = `
            <button data-url="${item.videoUrl}" class="play-btn focusable flex items-center bg-white text-black font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-transform">
                <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>
                Watch Now
            </button>
            <a href="${item.videoUrl}" download="${item.title}.mp4" class="download-btn focusable flex items-center bg-gray-700 bg-opacity-50 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-transform">Download</a>
            <a href="vlc://${item.videoUrl}" class="external-play-btn focusable flex items-center bg-gray-700 bg-opacity-50 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-transform">External Player</a>
        `;
    };

    const startHeroCarousel = () => {
        if (heroItems.length > 0) {
            heroSection.style.display = 'flex';
            updateHero(heroItems[0]);
            clearInterval(heroInterval);
            heroInterval = setInterval(() => {
                currentHeroIndex = (currentHeroIndex + 1) % heroItems.length;
                updateHero(heroItems[currentHeroIndex]);
            }, 7000);
        } else {
             heroSection.style.display = 'none';
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
                document.querySelector('.nav-link.active')?.focus();
            }
        } else if (key === 'ArrowRight') {
             if (sidebar.contains(activeElement)) {
                const firstHeroButton = heroButtons.querySelector('.focusable');
                if (firstHeroButton && heroSection.style.display !== 'none') {
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
                if (prevRow && prevRow.classList.contains('content-row')) {
                    findNearestItemInRow(activeElement, prevRow)?.focus();
                } else if (heroSection.style.display !== 'none') {
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
    
    document.addEventListener('click', (e) => {
        const playButton = e.target.closest('.play-btn');
        if (playButton) {
            playVideo(playButton.dataset.url);
        }
    });

    // --- App Initialization ---
    fetchAllContent();
});
