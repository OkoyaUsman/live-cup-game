let ws = null;
let isConnected = false;
let voteCount = 0;
let welcome_page_duration = 10
let round_vote_duration = 10
let round_result_duration = 10
let game_over_duration = 10

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:8765');
    
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        isConnected = true;
        startGame();
    };
    
    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        isConnected = false;
        setTimeout(connectWebSocket, 5000);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

function sendWebSocketMessage(type, data = {}) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'config':
            updateGameConfig(data.data);
            break;
        case 'votes':
            handleVotes(data.data);
            break;
        case 'result':
            handleResult(data.data);
            break;
        case 'next_round':
            updateGameConfig(data.data);
            break;
    }
}

function updateGameConfig(config, reveal=false) {
    document.getElementById('round-info').textContent = `Round ${config.round}/${config.totalRounds}`;
    
    const cupsContainer = document.getElementById('cups-container');
    cupsContainer.innerHTML = '';
    
    config.cups.forEach((cup, index) => {
        const cupElement = document.createElement('div');
        cupElement.className = 'cup-svg';
        cupElement.setAttribute('data-cup', index);
        cupElement.innerHTML = cupSVG(index + 1, cup.red ? 'red' : 'blue', reveal);
        cupsContainer.appendChild(cupElement);
    });
    
    const activePlayers = config.qualifiedPlayers.length + config.disqualifiedPlayers.length;
    document.getElementById('active-players').textContent = `Active Players: ${activePlayers}`;
    if(!reveal){
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) resultsContainer.classList.add('hidden');
    }
}

function handleVotes(votes) {
    voteCount += votes;
    document.getElementById('active-players').textContent = `Active Players: ${voteCount}`;
}

function handleResult(result){
    updateGameConfig(result, true)
    let qualified = result.qualifiedPlayers
    let disqualified = result.disqualifiedPlayers

    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    
    const sortedQualified = [...qualified].sort((a, b) => a.localeCompare(b));
    const sortedDisqualified = [...disqualified].sort((a, b) => a.localeCompare(b));
    
    const qualifiedList = resultsContainer.querySelector('.flex-1:first-child .players-list');
    const disqualifiedList = resultsContainer.querySelector('.flex-1:last-child .players-list');
    
    qualifiedList.innerHTML = sortedQualified.map(player => `
        <div class="player-item flex items-center justify-between space-x-3 text-green-400">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${player}</span>
            </div>
            <span class="text-2xl">✅</span>
        </div>
    `).join('');
    
    disqualifiedList.innerHTML = sortedDisqualified.map(player => `
        <div class="player-item flex items-center justify-between space-x-3 text-red-400">
            <div class="flex items-center space-x-3">
                <span class="text-2xl">${player}</span>
            </div>
            <span class="text-2xl">❌</span>
        </div>
    `).join('');

    // Setup auto-scroll for both lists
    setupAutoScroll(qualifiedList, round_result_duration);
    setupAutoScroll(disqualifiedList, round_result_duration);

    startCountdown(round_result_duration, () => {
        if (result.gameOver){
            sendWebSocketMessage('reset');
            showPage(4);
            startCountdown(game_over_duration, () => {
                startGame();
            });
        }else{
            if (result.gameFinished){
                sendWebSocketMessage('reset');
                showWinnersPage(result.qualifiedPlayers)
            }else{
                sendWebSocketMessage('next_round');
                startRound();
            }   
        }
    });
}

function showWinnersPage(winners) {
    showPage(3);
    const winnersList = document.getElementById('winners-list');
    winnersList.innerHTML = '';
    
    // Sort winners alphabetically
    const sortedWinners = [...winners].sort((a, b) => a.localeCompare(b));
    
    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'winners-grid bg-white/10 backdrop-blur-sm rounded-lg p-8 shadow-lg';
    
    const winnersPerPage = 5;
    const totalPages = Math.ceil(sortedWinners.length / winnersPerPage);
    let currentPage = 1;
    
    function displayPage(pageNum) {
        const startIdx = (pageNum - 1) * winnersPerPage;
        const endIdx = Math.min(startIdx + winnersPerPage, sortedWinners.length);
        const pageWinners = sortedWinners.slice(startIdx, endIdx);
        
        // Create new page content
        const pageContent = document.createElement('div');
        pageContent.className = 'winners-page opacity-0 transition-opacity duration-500';
        pageContent.innerHTML = pageWinners.map((winner, index) => `
            <div class="winner-item flex items-center justify-center text-yellow-400 p-4 mb-4">
                <span class="text-4xl font-bold">${winner}</span>
            </div>
        `).join('');
        
        // Add page info
        const pageInfo = document.createElement('div');
        pageInfo.className = 'text-2xl text-white/80 mt-4 text-center';
        pageInfo.textContent = `${pageNum} of ${totalPages}`;
        
        // Clear and add new content
        contentWrapper.innerHTML = '';
        contentWrapper.appendChild(pageContent);
        contentWrapper.appendChild(pageInfo);
        
        // Fade in the new content
        requestAnimationFrame(() => {
            pageContent.classList.remove('opacity-0');
        });
        
        // Trigger confetti for each winner with staggered timing
        pageWinners.forEach((_, index) => {
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF8C00'],
                    duration: 2000
                });
            }, index * 30);
        });
    }
    
    // Add content wrapper to the page
    winnersList.appendChild(contentWrapper);
    
    // Display first page
    displayPage(currentPage);
    
    // Set up auto-pagination
    const pageInterval = setInterval(() => {
        currentPage = currentPage % totalPages + 1;
        displayPage(currentPage);
        
        // If we've shown all pages, wait 5 seconds then start new game
        if (currentPage === totalPages) {
            clearInterval(pageInterval);
            setTimeout(() => {
                startGame();
            }, 5000);
        }
    }, 5000);
}

function startGame() {
    sendWebSocketMessage('get_config')
    showPage(1);
    startCountdown(welcome_page_duration, () => {
        startRound();
    });
}

function startRound() {
    voteCount = 0;
    sendWebSocketMessage('get_config')
    showPage(2);
    
    // Start collecting votes immediately
    const voteInterval = setInterval(() => {sendWebSocketMessage('get_votes')}, 1000);
    
    // Start the voting countdown
    startCountdown(round_vote_duration, () => {
        // Create and show the swapping overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="text-6xl font-bold text-yellow-400 mb-8">Randomly Swapping Cups...</div>
                <div class="text-4xl text-white/80">Please wait while we shuffle the cups</div>
            </div>
        `;
        document.getElementById('game-container').appendChild(overlay);
        
        // Wait for latency period then get results
        setTimeout(() => {
            overlay.remove();
            clearInterval(voteInterval);
            sendWebSocketMessage('get_result');
        }, 15000);
    });
}

function startCountdown(seconds, callback) {
    let countdownElement = document.getElementById('persistent-countdown');
    if (!countdownElement) {
        countdownElement = document.createElement('div');
        countdownElement.id = 'persistent-countdown';
        countdownElement.className = 'absolute top-4 right-4 z-50 flex items-center justify-center w-28 h-28 rounded-full bg-red-600 text-white text-5xl font-bold shadow-lg border-4 border-red-700';
        document.getElementById('game-container').appendChild(countdownElement);
    }
    countdownElement.textContent = seconds;
    
    const interval = setInterval(() => {
        seconds--;
        countdownElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(interval);
            if (callback) callback();
        }
    }, 1000);
}

function showPage(pageNumber) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    
    const page = document.getElementById(`page${pageNumber}`);
    if (page) {
        page.classList.remove('hidden');
    }
}

function cupSVG(number, ballColor, reveal=false) {
    const cupColor = '#4B5563';
    const cupHighlight = '#6B7280';
    const cupShadow = '#374151';
    const ballColorMap = {red: '#EF4444', blue: '#45B6FE'};
    return `
        <svg width="200" height="200" viewBox="0 0 200 200">
            <!-- Cup body -->
            <path d="M40 60 L160 60 L140 180 L60 180 Z" 
                  fill="${cupColor}" 
                  stroke="${cupHighlight}" 
                  stroke-width="2"/>
            
            <!-- Cup rim -->
            <path d="M40 60 L160 60" 
                  stroke="${cupHighlight}" 
                  stroke-width="4" 
                  stroke-linecap="round"/>
            
            <!-- Cup shadow -->
            <path d="M60 180 L140 180" 
                  stroke="${cupShadow}" 
                  stroke-width="4" 
                  stroke-linecap="round"/>
            
            <!-- Cup number -->
            <text x="100" y="120" 
                  font-family="Arial" 
                  font-size="48" 
                  fill="white" 
                  text-anchor="middle">
                ${number}
            </text>
            ${reveal ? `
                <!-- Ball -->
                <circle cx="100" cy="160" 
                        r="15" 
                        fill="${ballColorMap[ballColor]}" 
                        stroke="${ballColorMap[ballColor]}" 
                        stroke-width="2"
                        class="ball ${ballColor}"/>
            ` : ''}
        </svg>
    `;
}

function setupAutoScroll(element, duration = 10) {
    if (!element) return;
    
    // Wait for next frame
    requestAnimationFrame(() => {
        // Check if content height is greater than container height
        const hasOverflow = element.scrollHeight > element.offsetHeight;
        console.log('Scroll check:', {
            contentHeight: element.scrollHeight,
            containerHeight: element.offsetHeight,
            hasOverflow: hasOverflow
        });
        
        if (!hasOverflow) return;
        
        // Calculate scroll distance
        const scrollDistance = element.scrollHeight - element.offsetHeight;
        const scrollDuration = duration * 1000;
        const startTime = performance.now();
        
        function scroll() {
            const currentTime = performance.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / scrollDuration, 1);
            
            // Calculate current scroll position
            element.scrollTop = progress * scrollDistance;
            
            if (progress < 1) {
                requestAnimationFrame(scroll);
            }
        }
        
        // Start scrolling
        requestAnimationFrame(scroll);
    });
}

connectWebSocket();