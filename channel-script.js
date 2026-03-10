document.addEventListener('DOMContentLoaded', () => {
    const categoryList = document.getElementById('category-list');
    const channelGrid = document.getElementById('channel-grid');
    const searchBar = document.getElementById('search-bar');
    const paginationContainer = document.getElementById('pagination');

    let allChannels = [];
    let categories = {};
    let currentChannelList = [];
    let currentPage = 1;
    const channelsPerPage = 100;

    // Fetch and parse the M3U file
    fetch('channels.m3u')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok. Make sure channels.m3u is in the root directory.');
            }
            return response.text();
        })
        .then(data => {
            allChannels = parseM3U(data);
            currentChannelList = allChannels;
            categories = categorizeChannels(allChannels);
            displayCategories(categories);
            renderPage(1);
        })
        .catch(error => {
            channelGrid.innerHTML = `<p class="loading-message" style="color: #ff4d4d;">${error.message}</p>`;
            console.error('Error fetching or parsing M3U file:', error);
        });

    function parseM3U(data) {
        const lines = data.split('\n');
        const channels = [];
        let currentChannel = {};

        for (const line of lines) {
            if (line.startsWith('#EXTINF:')) {
                const groupTitleMatch = line.match(/group-title="([^"]*)"/);
                const nameMatch = line.match(/,(.*)/);
                
                currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unnamed Channel';
                currentChannel.group = groupTitleMatch ? groupTitleMatch[1] : 'Uncategorized';

            } else if (line.trim().startsWith('http')) {
                currentChannel.url = line.trim();
                channels.push(currentChannel);
                currentChannel = {};
            }
        }
        return channels;
    }

    function categorizeChannels(channels) {
        const categories = { 'All Channels': [...channels] }; // Create a copy
        channels.forEach(channel => {
            const group = channel.group;
            if (!categories[group]) {
                categories[group] = [];
            }
            categories[group].push(channel);
        });
        return categories;
    }
    
    function displayCategories(categories) {
        categoryList.innerHTML = '';
        Object.keys(categories).sort().forEach(categoryName => {
            const li = document.createElement('li');
            li.textContent = `${categoryName} (${categories[categoryName].length})`;
            li.dataset.category = categoryName;
            if (categoryName === 'All Channels') {
                li.classList.add('active');
            }
            li.addEventListener('click', () => {
                document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                currentChannelList = categories[categoryName];
                searchBar.value = '';
                renderPage(1);
            });
            categoryList.appendChild(li);
        });
    }

    function displayChannels(channels) {
        channelGrid.innerHTML = '';
        if (channels.length === 0) {
            channelGrid.innerHTML = '<p class="loading-message">No channels found.</p>';
            return;
        }
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            
            card.innerHTML = `<div class="channel-name">${channel.name}</div>`;
            channelGrid.appendChild(card);
        });
    }

    function setupPagination(totalChannels) {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalChannels / channelsPerPage);

        if (totalPages <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.className = 'pagination-btn';
        prevButton.disabled = currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                renderPage(currentPage - 1);
            }
        });

        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.className = 'pagination-btn';
        nextButton.disabled = currentPage === totalPages;
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                renderPage(currentPage + 1);
            }
        });

        paginationContainer.appendChild(prevButton);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextButton);
    }

    function renderPage(page) {
        currentPage = page;
        const start = (page - 1) * channelsPerPage;
        const end = start + channelsPerPage;
        const channelsToDisplay = currentChannelList.slice(start, end);

        displayChannels(channelsToDisplay);
        setupPagination(currentChannelList.length);
    }
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // Always search from the 'All Channels' list for consistency
        const allChannelsList = categories['All Channels'] || [];
        
        currentChannelList = allChannelsList.filter(channel => 
            channel.name.toLowerCase().includes(searchTerm)
        );
        
        document.querySelectorAll('#category-list li').forEach(el => el.classList.remove('active'));
        
        renderPage(1);
    });
});

