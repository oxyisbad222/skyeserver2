/**
 * SkyeServer Admin Panel Logic
 * ----------------------------
 * This script handles all the interactive functionality for the admin panel,
 * including page navigation, content rendering, and form submissions.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const headerTitle = document.getElementById('header-title');
    const contentTableBody = document.getElementById('content-table-body');
    const addContentForm = document.getElementById('add-content-form');
    const totalVideosElement = document.getElementById('total-videos');

    // --- Mock Data ---
    // In a real application, this would be fetched from and managed by a database (e.g., Firestore).
    let mockContent = [
        { id: 'mov1', title: 'Cybernetic Dawn', category: 'movies', source: 'Link' },
        { id: 'mov2', title: 'Ocean\'s Whisper', category: 'movies', source: 'File' },
        { id: 'tv1', title: 'The Grid: Season 1', category: 'tv', source: 'Link' },
        { id: 'tv2', title: 'Chronos: Season 2', category: 'tv', source: 'Link' },
        { id: 'oth1', title: 'Making Of: Galaxy', category: 'other', source: 'File' },
    ];

    /**
     * Handles navigation between different pages in the admin panel.
     * @param {Event} e - The click event from the navigation link.
     */
    const handleNavigation = (e) => {
        e.preventDefault();
        const targetId = e.currentTarget.getAttribute('href').substring(1);

        // Update active state for navigation items
        navItems.forEach(item => {
            item.classList.remove('active-nav-item', 'bg-gray-700');
            if (item.getAttribute('href') === `#${targetId}`) {
                item.classList.add('active-nav-item', 'bg-gray-700');
            }
        });

        // Show the target page and hide others
        pages.forEach(page => {
            page.classList.add('hidden');
            if (page.id === targetId) {
                page.classList.remove('hidden');
            }
        });

        // Update the header title
        const targetNavItem = document.querySelector(`a[href="#${targetId}"]`);
        headerTitle.textContent = targetNavItem.textContent;
    };

    /**
     * Renders the content management table with the current data.
     */
    const renderContentTable = () => {
        contentTableBody.innerHTML = ''; // Clear existing rows
        if (mockContent.length === 0) {
            contentTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No content found.</td></tr>`;
            return;
        }

        mockContent.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="text-left py-3 px-4">${item.title}</td>
                <td class="text-left py-3 px-4">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</td>
                <td class="text-left py-3 px-4">${item.source}</td>
                <td class="text-left py-3 px-4">
                    <button data-id="${item.id}" class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm">Delete</button>
                </td>
            `;
            contentTableBody.appendChild(row);
        });
        
        // Update total videos count on the dashboard
        totalVideosElement.textContent = mockContent.length;
    };

    /**
     * Handles the submission of the 'Add New Content' form.
     * @param {Event} e - The form submission event.
     */
    const handleAddContent = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const title = formData.get('title');
        const category = formData.get('category');
        const videoLinks = formData.get('video-links').split('\n').filter(link => link.trim() !== '');

        if (!title || videoLinks.length === 0) {
            alert('Please provide a title and at least one video URL.');
            return;
        }

        // Create new content items from the links
        videoLinks.forEach((link, index) => {
            const newContent = {
                id: `new-${Date.now()}-${index}`, // Simple unique ID
                title: videoLinks.length > 1 ? `${title} - Part ${index + 1}` : title,
                category: category,
                source: 'Link', // Assuming all added via this form are links
                // In a real app, you'd also save the URL itself
            };
            
            // TODO: API Call to add content to the server/database would go here.
            console.log('Adding new content:', newContent);
            mockContent.push(newContent);
        });

        alert('Content added successfully!');
        e.target.reset(); // Clear the form
        renderContentTable(); // Re-render the table to show the new content
    };
    
    /**
     * Handles the deletion of a content item.
     * @param {Event} e - The click event from a delete button.
     */
    const handleDeleteContent = (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const contentId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this item?')) {
                // TODO: API Call to delete content from the server/database would go here.
                console.log('Deleting content with ID:', contentId);
                mockContent = mockContent.filter(item => item.id !== contentId);
                renderContentTable(); // Re-render the table
            }
        }
    };


    // --- Initial Setup & Event Listeners ---

    // Attach navigation event listeners
    navItems.forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Attach form submission listener
    addContentForm.addEventListener('submit', handleAddContent);
    
    // Attach event listener to the table body for delegation of delete clicks
    contentTableBody.addEventListener('click', handleDeleteContent);

    // Initial render of the content table
    renderContentTable();
});
