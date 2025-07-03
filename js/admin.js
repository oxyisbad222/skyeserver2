/**
 * SkyeServer Admin Panel Logic
 * ----------------------------
 * This script handles all the interactive functionality for the admin panel.
 * It's designed to communicate with a backend API to manage content.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- API Configuration ---
    const API_BASE_URL = '/api'; // Placeholder for the backend API

    // --- DOM Element References ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const headerTitle = document.getElementById('header-title');
    const contentTableBody = document.getElementById('content-table-body');
    const addContentForm = document.getElementById('add-content-form');
    
    // Dashboard analytics elements
    const totalVideosElement = document.getElementById('total-videos');
    // In a real app, you'd have elements for storage, streams, etc.

    // --- Modal Injection and Management ---
    // Inject modal HTML into the DOM
    const modalHTML = `
        <div id="admin-modal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3 text-center">
                    <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title"></h3>
                    <div class="mt-2 px-7 py-3">
                        <p class="text-sm text-gray-500" id="modal-body"></p>
                    </div>
                    <div class="items-center px-4 py-3" id="modal-footer">
                        <!-- Buttons will be injected here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('admin-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    /**
     * Shows a notification modal.
     * @param {string} title - The title of the notification.
     * @param {string} message - The body text of the notification.
     */
    const showNotification = (title, message) => {
        modalTitle.textContent = title;
        modalBody.textContent = message;
        modalFooter.innerHTML = `<button id="modal-ok-btn" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">OK</button>`;
        modal.classList.remove('hidden');
        document.getElementById('modal-ok-btn').onclick = () => modal.classList.add('hidden');
    };
    
    /**
     * Shows a confirmation dialog and returns a Promise.
     * @param {string} title - The title of the confirmation.
     * @param {string} message - The confirmation question.
     * @returns {Promise<boolean>} - Resolves true if confirmed, false otherwise.
     */
    const showConfirmation = (title, message) => {
        return new Promise((resolve) => {
            modalTitle.textContent = title;
            modalBody.textContent = message;
            modalFooter.innerHTML = `
                <button id="modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2">Cancel</button>
                <button id="modal-confirm-btn" class="px-4 py-2 bg-red-500 text-white rounded-md">Confirm</button>
            `;
            modal.classList.remove('hidden');
            document.getElementById('modal-confirm-btn').onclick = () => {
                modal.classList.add('hidden');
                resolve(true);
            };
            document.getElementById('modal-cancel-btn').onclick = () => {
                modal.classList.add('hidden');
                resolve(false);
            };
        });
    };

    // --- API Communication & Rendering ---

    /**
     * Fetches content from the API and triggers rendering.
     */
    const loadAndRenderContent = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/content`);
            if (!response.ok) throw new Error('Failed to fetch content.');
            const content = await response.json();
            renderContentTable(content);
        } catch (error) {
            console.error('Error loading content:', error);
            showNotification('Error', 'Could not load content from the server.');
            // Render an empty table in case of an error
            renderContentTable([]); 
        }
    };
    
    /**
     * Fetches analytics data and updates the dashboard.
     */
    const loadAnalytics = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/analytics`);
            if (!response.ok) throw new Error('Failed to fetch analytics.');
            const data = await response.json();
            totalVideosElement.textContent = data.totalVideos || 0;
            // Update other analytics cards here
        } catch (error) {
            console.error('Error loading analytics:', error);
            totalVideosElement.textContent = 'N/A';
        }
    };

    /**
     * Renders the content management table with data.
     * @param {Array} content - An array of content objects.
     */
    const renderContentTable = (content) => {
        contentTableBody.innerHTML = '';
        if (!content || content.length === 0) {
            contentTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No content found.</td></tr>`;
            return;
        }

        content.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.id = item.id;
            row.innerHTML = `
                <td class="text-left py-3 px-4">${item.title}</td>
                <td class="text-left py-3 px-4">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</td>
                <td class="text-left py-3 px-4">${item.source}</td>
                <td class="text-left py-3 px-4">
                    <button class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm">Delete</button>
                </td>
            `;
            contentTableBody.appendChild(row);
        });
    };

    /**
     * Handles the submission of the 'Add New Content' form.
     * @param {Event} e - The form submission event.
     */
    const handleAddContent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newContent = {
            title: formData.get('title'),
            category: formData.get('category'),
            thumbnail: formData.get('thumbnail'),
            videoLinks: formData.get('video-links').split('\n').filter(link => link.trim() !== ''),
        };

        if (!newContent.title || newContent.videoLinks.length === 0) {
            showNotification('Invalid Input', 'Please provide a title and at least one video URL.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContent),
            });
            if (!response.ok) throw new Error('Server responded with an error.');
            
            showNotification('Success', 'Content has been added successfully.');
            e.target.reset();
            loadAndRenderContent(); // Refresh the content table
        } catch (error) {
            console.error('Error adding content:', error);
            showNotification('Error', 'Failed to add the new content.');
        }
    };

    /**
     * Handles the deletion of a content item.
     * @param {Event} e - The click event from a delete button.
     */
    const handleDeleteContent = async (e) => {
        if (!e.target.classList.contains('delete-btn')) return;
        
        const row = e.target.closest('tr');
        const contentId = row.dataset.id;
        const contentTitle = row.cells[0].textContent;

        const confirmed = await showConfirmation('Confirm Deletion', `Are you sure you want to delete "${contentTitle}"?`);

        if (confirmed) {
            try {
                const response = await fetch(`${API_BASE_URL}/content/${contentId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) throw new Error('Server failed to delete the item.');
                
                showNotification('Success', `"${contentTitle}" was deleted.`);
                loadAndRenderContent(); // Refresh the content table
            } catch (error) {
                console.error('Error deleting content:', error);
                showNotification('Error', 'The content could not be deleted.');
            }
        }
    };

    /**
     * Handles navigation between different pages in the admin panel.
     */
    const handleNavigation = (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href').substring(1);

        navItems.forEach(item => item.classList.remove('active-nav-item', 'bg-gray-700'));
        e.currentTarget.classList.add('active-nav-item', 'bg-gray-700');
        
        pages.forEach(page => page.classList.add('hidden'));
        document.getElementById(targetId).classList.remove('hidden');

        headerTitle.textContent = e.currentTarget.textContent;
        
        // Refresh data when navigating to a relevant page
        if (targetId === 'dashboard') loadAnalytics();
        if (targetId === 'content') loadAndRenderContent();
    };

    // --- Initial Setup & Event Listeners ---
    const initializeApp = () => {
        navItems.forEach(item => item.addEventListener('click', handleNavigation));
        addContentForm.addEventListener('submit', handleAddContent);
        contentTableBody.addEventListener('click', handleDeleteContent);
        
        // Initial load
        loadAnalytics();
    };

    initializeApp();
});
