/**
 * SkyeServer Admin Panel Logic (Final Version)
 * --------------------------------------------
 * This script handles all interactive functionality for the admin panel, including:
 * - Page navigation and dynamic content rendering.
 * - Communication with the backend API for content and analytics.
 * - Direct-to-Backblaze B2 file uploads with progress tracking.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- API Configuration ---
    const API_BASE_URL = '/api';

    // --- DOM Element References ---
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    const headerTitle = document.getElementById('header-title');
    const contentTableBody = document.getElementById('content-table-body');
    const analyticsCardsContainer = document.getElementById('analytics-cards');
    
    // Form elements
    const addContentForm = document.getElementById('add-content-form');
    const submitBtn = document.getElementById('submit-btn');
    
    // File upload elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('video-file');
    const fileNameEl = document.getElementById('file-name');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');

    // --- State Management ---
    let selectedFile = null;

    // --- Modal Management (self-contained for simplicity) ---
    const showNotification = (title, message, isError = false) => {
        // In a real app, you'd use a more robust modal system.
        alert(`${title}\n\n${message}`);
    };

    // --- API & Data Handling ---
    const apiFetch = async (endpoint, options = {}) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
                throw new Error(errorData.message);
            }
            return response.json();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            showNotification('API Error', error.message, true);
            throw error; // Re-throw to stop subsequent actions
        }
    };

    const loadAnalytics = async () => {
        try {
            const data = await apiFetch('/analytics');
            analyticsCardsContainer.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-600">Total Videos</h3><p class="text-3xl font-bold text-blue-500">${data.totalVideos || 0}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-600">Storage Used</h3><p class="text-3xl font-bold text-green-500">${data.storageUsed || 'N/A'}</p></div>
                <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-gray-600">Server Status</h3><p class="text-3xl font-bold text-green-500 flex items-center">Online <span class="ml-2 h-4 w-4 bg-green-500 rounded-full"></span></p></div>
            `;
        } catch (error) { /* Error is handled by apiFetch */ }
    };

    const loadContent = async () => {
        try {
            const content = await apiFetch('/content');
            contentTableBody.innerHTML = '';
            if (!content || content.length === 0) {
                contentTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">No content found.</td></tr>`;
                return;
            }
            content.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-left py-3 px-4">${item.title}</td>
                    <td class="text-left py-3 px-4">${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</td>
                    <td class="text-left py-3 px-4">${item.source}</td>
                    <td class="text-left py-3 px-4"><button data-id="${item.id}" class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm">Delete</button></td>
                `;
                contentTableBody.appendChild(row);
            });
        } catch (error) { /* Error is handled by apiFetch */ }
    };

    // --- File Upload Logic ---
    const handleFileSelect = (file) => {
        if (!file || !file.type.startsWith('video/')) {
            showNotification('Invalid File', 'Please select a valid video file.', true);
            return;
        }
        selectedFile = file;
        fileNameEl.textContent = `Selected File: ${file.name}`;
        dropZone.classList.add('border-green-500');
    };

    const uploadFile = (uploadUrl, authToken, file) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', uploadUrl, true);

            xhr.setRequestHeader('Authorization', authToken);
            xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.setRequestHeader('X-Bz-Content-Sha1', 'do_not_verify'); // Let B2 calculate the SHA1

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBar.style.width = `${percentComplete}%`;
                    progressBar.textContent = `${percentComplete}%`;
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            };
            
            xhr.onerror = () => reject(new Error('Upload failed due to a network error.'));

            xhr.send(file);
        });
    };

    // --- Form Submission ---
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showNotification('Missing File', 'Please select a video file to upload.', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        progressContainer.classList.remove('hidden');

        try {
            // 1. Get the secure one-time upload URL from our API
            const { uploadUrl, authorizationToken } = await apiFetch('/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: selectedFile.name, contentType: selectedFile.type }),
            });

            // 2. Upload the file directly to Backblaze B2
            await uploadFile(uploadUrl, authorizationToken, selectedFile);
            
            // 3. Once upload is successful, create the content record in our database
            const formData = new FormData(addContentForm);
            const contentData = {
                title: formData.get('title'),
                description: formData.get('description'),
                category: formData.get('category'),
                featured: formData.get('featured') === 'on',
                thumbnail: formData.get('thumbnail'),
                fileName: selectedFile.name, // The server will construct the final URL
                source: 'File'
            };

            await apiFetch('/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contentData),
            });

            showNotification('Success', 'Content has been successfully uploaded and added!');
            addContentForm.reset();
            fileNameEl.textContent = '';
            selectedFile = null;
            loadContent(); // Refresh the content table

        } catch (error) {
            showNotification('Upload Failed', `An error occurred: ${error.message}`, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Content';
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
        }
    };
    
    // --- Event Listeners ---
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('href').substring(1);
            navItems.forEach(i => i.classList.remove('active'));
            e.currentTarget.classList.add('active');
            pages.forEach(p => p.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            headerTitle.textContent = e.currentTarget.textContent;

            if (targetId === 'dashboard') loadAnalytics();
            if (targetId === 'content') loadContent();
        });
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    addContentForm.addEventListener('submit', handleFormSubmit);
    
    contentTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const contentId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
                try {
                    await apiFetch(`/content/${contentId}`, { method: 'DELETE' });
                    showNotification('Success', 'Content deleted.');
                    loadContent();
                } catch (error) { /* Handled by apiFetch */ }
            }
        }
    });

    // --- Initial Load ---
    loadAnalytics();
});
