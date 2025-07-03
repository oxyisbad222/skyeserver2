/**
 * SkyeServer Application Logic
 * ----------------------------
 * This script manages the client-side functionality of SkyeServer, including:
 * - Rendering content dynamically.
 * - Handling navigation for TV remotes (D-pad) and keyboards.
 * - Managing video playback.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    const sidebar = document.getElementById('sidebar');
    const contentRowsContainer = document.getElementById('content-rows');
    const videoPlayerOverlay = document.getElementById('video-player-overlay');
    const videoPlayer = document.getElementById('video-player');
    const closePlayerButton = document.getElementById('close-player');
    const navLinks = document.querySelectorAll('.nav-link');

    // --- State Management ---
    let lastFocusedElement; // To return focus after closing the player

    // --- Mock Data (to be replaced by API calls) ---
    // In a real application, this would be fetched from your server.
    const mockContent = {
        movies: [
            { id: 'mov1', title: 'Cybernetic Dawn', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/007BFF?text=Cybernetic+Dawn', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
            { id: 'mov2', title: 'Ocean\'s Whisper', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/17A2B8?text=Ocean\'s+Whisper', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
            { id: 'mov3', title: 'Galaxy Runners', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/28A745?text=Galaxy+Runners', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
            { id: 'mov4', title: 'The Last Stand', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/DC3545?text=The+Last+Stand', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
            { id: 'mov5', title: 'Forgotten City', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/FFC107?text=Forgotten+City', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
            { id: 'mov6', title: 'Project Blue', category: 'movies', thumbnail: 'https://placehold.co/400x600/0d1117/FD7E14?text=Project+Blue', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
        ],
        tv: [
            { id: 'tv1', title: 'The Grid: Season 1', category: 'tv', thumbnail: 'https://placehold.co/400x600/0d1117/6610F2?text=The+Grid', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
            { id: 'tv2', title: 'Chronos: Season 2', category: 'tv', thumbnail: 'https://placehold.co/400x600/0d1117/6F42C1?text=Chronos', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4' },
            { id: 'tv3', title: 'Legacy: The Series', category: 'tv', thumbnail: 'https://placehold.co/400x600/0d1117/E83E8C?text=Legacy', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' },
            { id: 'tv4', title: 'North Point', category: 'tv', thumbnail: 'https://placehold.co/400x600/0d1117/20C997?text=North+Point', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4' },
        ],
        other: [
             { id: 'oth1', title: 'Making Of: Galaxy', category: 'other', thumbnail: 'https://placehold.co/400x600/0d1117/17A2B8?text=Making+Of', videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4' },
        ]
    };

    /**
     * Renders content rows based on the selected category.
     * @param {string} category - The category to display ('home', 'movies', 'tv', 'other').
     */
    const renderContent = (category) => {
        contentRowsContainer.innerHTML = ''; // Clear previous content

        const categoriesToRender = category === 'home' 
            ? ['movies', 'tv', 'other'] 
            : [category];

        categoriesToRender.forEach(cat => {
            const items = mockContent[cat];
            if (!items || items.length === 0) return;

            const categoryTitle = cat.charAt(0).toUpperCase() + cat.slice(1);
            
            const row = document.createElement('div');
            row.className = 'mb-8 content-row';
            
            const title = document.createElement('h2');
            title.className = 'text-2xl font-bold mb-4';
            title.textContent = `Featured ${categoryTitle}`;
            row.appendChild(title);

            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'content-row-inner';

            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'content-item focusable rounded-lg overflow-hidden shadow-lg bg-gray-800 w-40 md:w-48';
                itemEl.tabIndex = 0; // Make it focusable
                itemEl.dataset.videoUrl = item.videoUrl;
                itemEl.innerHTML = `<img src="${item.thumbnail}" alt="${item.title}" class="w-full h-full object-cover">`;
                
                // Event listener for playing video on click or Enter
                itemEl.addEventListener('click', () => playVideo(item.videoUrl));
                itemEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        playVideo(item.videoUrl);
                    }
                });

                itemsContainer.appendChild(itemEl);
            });

            row.appendChild(itemsContainer);
            contentRowsContainer.appendChild(row);
        });
    };

    /**
     * Plays the selected video in a fullscreen overlay.
     * @param {string} videoUrl - The URL of the video to play.
     */
    const playVideo = (videoUrl) => {
        lastFocusedElement = document.activeElement; // Save focus
        videoPlayer.src = videoUrl;
        videoPlayerOverlay.classList.remove('hidden');
        videoPlayer.play();
        closePlayerButton.focus(); // Focus the close button for easy exit
    };

    /**
     * Closes the video player and returns to the content browser.
     */
    const closePlayer = () => {
        videoPlayer.pause();
        videoPlayer.src = ''; // Unload the video
        videoPlayerOverlay.classList.add('hidden');
        if (lastFocusedElement) {
            lastFocusedElement.focus(); // Restore focus
        }
    };

    /**
     * Handles navigation between different UI elements.
     * @param {KeyboardEvent} e - The keyboard event.
     */
    const handleNavigation = (e) => {
        if (videoPlayerOverlay.classList.contains('hidden')) {
            // --- Navigation logic for the main content area ---
            const { key } = e;
            const activeElement = document.activeElement;

            if (!activeElement || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                return;
            }

            e.preventDefault();

            const isSidebarFocused = sidebar.contains(activeElement);
            const isContentFocused = contentRowsContainer.contains(activeElement);

            if (key === 'ArrowRight') {
                if (isSidebarFocused) {
                    // Move focus from sidebar to the first item in the first content row
                    const firstItem = contentRowsContainer.querySelector('.focusable');
                    if (firstItem) firstItem.focus();
                } else if (isContentFocused) {
                    // Move to the next item in the same row
                    const nextItem = activeElement.nextElementSibling;
                    if (nextItem) nextItem.focus();
                }
            } else if (key === 'ArrowLeft') {
                if (isContentFocused) {
                    const prevItem = activeElement.previousElementSibling;
                    if (prevItem) {
                        prevItem.focus();
                    } else {
                        // If it's the first item, move focus to the corresponding sidebar link
                        const activeCategory = document.querySelector('.nav-link.active');
                        if (activeCategory) activeCategory.focus();
                    }
                }
            } else if (key === 'ArrowDown' || key === 'ArrowUp') {
                if (isContentFocused) {
                    // Advanced: Find item in the row above/below
                    const currentRect = activeElement.getBoundingClientRect();
                    const currentRow = activeElement.closest('.content-row');
                    const targetRow = key === 'ArrowDown' ? currentRow.nextElementSibling : currentRow.previousElementSibling;

                    if (targetRow && targetRow.classList.contains('content-row')) {
                        let bestCandidate = null;
                        let minDistance = Infinity;
                        
                        targetRow.querySelectorAll('.focusable').forEach(item => {
                            const itemRect = item.getBoundingClientRect();
                            const distance = Math.abs(itemRect.left - currentRect.left);
                            if (distance < minDistance) {
                                minDistance = distance;
                                bestCandidate = item;
                            }
                        });

                        if (bestCandidate) bestCandidate.focus();
                    }
                } else if (isSidebarFocused) {
                    // Navigate up/down the sidebar links
                    const focusableLinks = Array.from(sidebar.querySelectorAll('.focusable'));
                    const currentIndex = focusableLinks.findIndex(link => link === activeElement);
                    const nextIndex = key === 'ArrowDown' ? (currentIndex + 1) : (currentIndex - 1);

                    if (nextIndex >= 0 && nextIndex < focusableLinks.length) {
                        focusableLinks[nextIndex].focus();
                    }
                }
            }
        }
    };
    
    // --- Initial Setup & Event Listeners ---

    // Handle sidebar navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            renderContent(link.dataset.category);
        });
    });

    // Close player button
    closePlayerButton.addEventListener('click', closePlayer);

    // Global keyboard navigation
    document.addEventListener('keydown', handleNavigation);

    // Initial render
    renderContent('home');
    document.querySelector('.nav-link[data-category="home"]').focus();
});
