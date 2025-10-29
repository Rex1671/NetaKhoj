  function createParticles() {
            const particlesContainer = document.getElementById('particles');
            const particleCount = 40;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.width = (Math.random() * 5 + 2) + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDelay = Math.random() * 25 + 's';
                particle.style.animationDuration = (Math.random() * 15 + 20) + 's';
                particlesContainer.appendChild(particle);
            }
        }
        createParticles();

        let currentProgress = 0;
        const progressBar = document.getElementById('progressBar');

        function updateProgress(target, checkpoint) {
            const interval = setInterval(() => {
                if (currentProgress < target) {
                    currentProgress += 2;
                    progressBar.style.width = currentProgress + '%';
                } else {
                    clearInterval(interval);
                    if (checkpoint) {
                        document.getElementById(checkpoint).classList.add('active');
                    }
                }
            }, 30);
        }

        const map = L.map('map', {
            zoomControl: false
        }).setView([22.9734, 78.6569], 5);

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        let constituencyData = {};
        let rajyaSabhaData = {};
        let geojsonLayer;
        let selectedLayer = null;
        let allFeatures = [];
        let stateData = {};
        let highlightedLayers = [];
        let currentMapType = 'assembly';

        const stats = {
            lokSabha: {},
            rajyaSabha: {},
            mla: {},
            totalLokSabha: 0,
            totalRajyaSabha: 0,
            totalMLAs: 0
        };

        const assemblyBtn = document.getElementById('assemblyBtn');
        const parliamentaryBtn = document.getElementById('parliamentaryBtn');

        assemblyBtn.addEventListener('click', () => switchMap('assembly'));
        parliamentaryBtn.addEventListener('click', () => switchMap('parliamentary'));

        function switchMap(type) {
            if (currentMapType === type) return;

            currentMapType = type;

            if (type === 'assembly') {
                assemblyBtn.classList.add('active');
                parliamentaryBtn.classList.remove('active');
            } else {
                assemblyBtn.classList.remove('active');
                parliamentaryBtn.classList.add('active');
            }

            if (selectedLayer) {
                selectedLayer.setStyle(defaultStyle());
                selectedLayer = null;
            }
            clearHighlightedLayers();
            document.getElementById('detailPanel').classList.remove('active');
            document.getElementById('searchBox').value = '';
            document.getElementById('searchSuggestions').classList.remove('active');

            if (geojsonLayer) {
                map.removeLayer(geojsonLayer);
            }

            loadGeoJSON(type);
        }

        function cleanName(name) {
            if (!name) return "";
            return name.trim().toUpperCase().replace(/[^\w\s]/g, '');
        }

        function getConstituencyName(properties) {
            return properties.pc_name || properties.PC_NAME ||
                properties.ac_name || properties.AC_NAME || '';
        }

        function getStateName(properties) {
            return properties.st_name || properties.ST_NAME || 'India';
        }

        function isCurrentTerm(startDate, endDate) {
            const today = new Date();
            const start = new Date(startDate);
            const end = endDate.toLowerCase().includes('office') ? today : new Date(endDate);
            return start <= today && today <= end;
        }

        // ==================== MAP HELPER FUNCTIONS ====================

        function defaultStyle(feature) {
            return {
                color: '#3b82f6',
                weight: 2,
                fillOpacity: 0.2,
                fillColor: '#3b82f6'
            };
        }

        function highlightStyle(feature) {
            return {
                color: '#667eea',
                weight: 3,
                fillOpacity: 0.5,
                fillColor: '#667eea'
            };
        }

        function onEachFeature(feature, layer) {
            layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: clickFeature
            });
        }

        function highlightFeature(e) {
            const layer = e.target;
            if (layer !== selectedLayer && !highlightedLayers.includes(layer)) {
                layer.setStyle({
                    weight: 3,
                    fillOpacity: 0.4,
                    color: '#667eea'
                });
            }
        }

        function resetHighlight(e) {
            const layer = e.target;
            if (layer !== selectedLayer && !highlightedLayers.includes(layer)) {
                layer.setStyle(defaultStyle());
            }
        }

        function clickFeature(e) {
            const layer = e.target;
            const feature = layer.feature;

            if (selectedLayer && selectedLayer !== layer) {
                selectedLayer.setStyle(defaultStyle());
            }

            layer.setStyle(highlightStyle());
            selectedLayer = layer;

            const bounds = layer.getBounds();
            const center = bounds.getCenter();

            map.flyTo(center, Math.max(map.getZoom(), 8), {
                duration: 1.5,
                easeLinearity: 0.25
            });

            setTimeout(() => {
                showConstituencyDetails(feature);
            }, 1600);
        }

        // ==================== HIGHLIGHT MANAGEMENT ====================

        function highlightConstituencyOnMap(feature) {
            if (!geojsonLayer) return;

            geojsonLayer.eachLayer(function (layer) {
                if (layer.feature === feature) {
                    layer.setStyle({
                        color: '#f59e0b',
                        weight: 4,
                        fillOpacity: 0.5,
                        fillColor: '#f59e0b',
                        dashArray: ''
                    });
                    highlightedLayers.push(layer);

                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        layer.bringToFront();
                    }
                }
            });
        }

        function clearHighlightedLayers() {
            highlightedLayers.forEach(layer => {
                if (layer !== selectedLayer) {
                    layer.setStyle(defaultStyle());
                }
            });
            highlightedLayers = [];
        }

        // ==================== DATA LOADING ====================

        updateProgress(25, 'checkpoint1');

        Promise.all([
            fetch('/api/all-data').then(res => res.json()),
            fetch('/api/rajya-sabha').then(res => res.json()).catch(() => ({}))
        ])
            .then(([allData, rajyaSabha]) => {
                updateProgress(50, 'checkpoint2');
                console.log('Loaded all_data.json:', allData);
                console.log('Loaded rajya_sabha.json:', rajyaSabha);

                constituencyData = {};
                rajyaSabhaData = rajyaSabha;

                for (let key in allData) {
                    const cleanKey = cleanName(key);
                    constituencyData[cleanKey] = allData[key];

                    if (allData[key].MP && isCurrentTerm(allData[key].MP.term_start_date, allData[key].MP.term_end_date)) {
                        stats.totalLokSabha++;
                        const party = allData[key].MP.party;
                        stats.lokSabha[party] = (stats.lokSabha[party] || 0) + 1;
                    }

                    if (allData[key].Rajya_Sabha) {
                        allData[key].Rajya_Sabha.forEach(rs => {
                            if (isCurrentTerm(rs.term_start_date, rs.term_end_date)) {
                                stats.totalRajyaSabha++;
                                const party = rs.party;
                                stats.rajyaSabha[party] = (stats.rajyaSabha[party] || 0) + 1;
                            }
                        });
                    }

                    if (allData[key].MLAs) {
                        allData[key].MLAs.forEach(mla => {
                            if (isCurrentTerm(mla.term_start_date, mla.term_end_date)) {
                                stats.totalMLAs++;
                                const party = mla.party;
                                stats.mla[party] = (stats.mla[party] || 0) + 1;
                            }
                        });
                    }
                }

                for (let state in rajyaSabhaData) {
                    rajyaSabhaData[state].forEach(member => {
                        const termEnd = member.term_end_date;
                        if (termEnd === "In Office" || isCurrentTerm(member.term_start_date, termEnd)) {
                            stats.totalRajyaSabha++;
                            const party = member.party || "Unknown";
                            stats.rajyaSabha[party] = (stats.rajyaSabha[party] || 0) + 1;
                        }
                    });
                }

                updateProgress(75, 'checkpoint3');
                updateDashboard();
                loadGeoJSON('assembly');
            })
            .catch(error => {
                console.error('Error loading data:', error);
                document.getElementById('loadingOverlay').classList.add('hidden');
                alert('Error loading data. Please check console for details.');
            });

        function updateDashboard() {
            document.getElementById('totalLokSabhaMPs').textContent = stats.totalLokSabha;
            document.getElementById('totalRajyaSabhaMPs').textContent = stats.totalRajyaSabha;
            document.getElementById('totalMLAs').textContent = stats.totalMLAs;

            updatePartyList('lokSabhaParties', stats.lokSabha);
            updatePartyList('rajyaSabhaParties', stats.rajyaSabha);
            updatePartyList('mlaParties', stats.mla);
        }

        function updatePartyList(elementId, partyData) {
            const container = document.getElementById(elementId);
            const sortedParties = Object.entries(partyData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

            if (sortedParties.length === 0) {
                container.innerHTML = '<p class="no-data">No data available</p>';
                return;
            }

            let html = '';
            sortedParties.forEach(([party, count]) => {
                html += `
                <div class="party-item">
                    <div class="party-info">
                        <div class="party-color"></div>
                        <div class="party-details">
                            <div class="party-name">${party}</div>
                            <div class="party-type">${count} member${count !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="party-count">${count}</div>
                </div>
            `;
            });
            container.innerHTML = html;
        }

        function loadGeoJSON(type) {
            updateProgress(85, null);

            fetch(`/api/constituencies?type=${type}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to load GeoJSON: ' + res.status);
                    return res.json();
                })
                .then(geojson => {
                    console.log('Loaded GeoJSON:', type);
                    allFeatures = geojson.features;

                    geojsonLayer = L.geoJSON(geojson, {
                        style: defaultStyle,
                        onEachFeature: onEachFeature
                    }).addTo(map);

                    updateProgress(100, 'checkpoint4');
                    setTimeout(() => {
                        document.getElementById('loadingOverlay').classList.add('hidden');
                    }, 500);
                })
                .catch(err => {
                    console.error('Error loading GeoJSON:', err);
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    alert('Error loading map data. Please check console for details.');
                });
        }

       
      // ==================== CONSTITUENCY DETAILS WITH API INTEGRATION ====================

async function showConstituencyDetails(feature) {
    const constituencyName = getConstituencyName(feature.properties);
    const stateName = getStateName(feature.properties);
    const cleanedName = cleanName(constituencyName);
    const data = constituencyData[cleanedName];

    const detailPanel = document.getElementById('detailPanel');
    const detailBody = document.getElementById('detailBody');

    document.getElementById('detailTitle').textContent = constituencyName;
    document.getElementById('detailSubtitle').innerHTML = `
        <i class="fas fa-map-marker-alt"></i>
        ${stateName}
    `;

    console.log('Showing details for:', constituencyName, '(cleaned:', cleanedName, ')');

    detailBody.innerHTML = `
        <div class="detail-loading">
            <div class="loading-spinner-detail"></div>
            <div class="loading-text-detail">Loading constituency data...</div>
        </div>
    `;
    detailPanel.classList.add('active');

    let html = '';
    const state = data?.MP?.state || stateName;

    // ========== LOCAL MP DATA ==========
    html += `<div class="detail-section">
        <div class="detail-section-title">
            <i class="fas fa-landmark"></i>
            Lok Sabha Representative (Local Data)
        </div>`;

    if (data?.MP && isCurrentTerm(data.MP.term_start_date, data.MP.term_end_date)) {
        const mpName = data.MP.name.replace(/'/g, "\\'");
        html += generateRepresentativeCard(data.MP, 'MP', constituencyName);
    } else {
        html += '<p class="no-data">No current Lok Sabha MP in local database</p>';
    }
    html += '</div>';

    // ========== LOCAL MLA DATA ==========
    html += `<div class="detail-section">
        <div class="detail-section-title">
            <i class="fas fa-users"></i>
            Assembly Members (Local Data)
        </div>`;

    if (data?.MLAs) {
        const currentMLAs = data.MLAs.filter(mla =>
            isCurrentTerm(mla.term_start_date, mla.term_end_date)
        );

        if (currentMLAs.length > 0) {
            currentMLAs.forEach(mla => {
                html += generateRepresentativeCard(mla, 'MLA', mla.ac_name);
            });
        } else {
            html += '<p class="no-data">No current MLAs in local database</p>';
        }
    } else {
        html += '<p class="no-data">No MLA data available</p>';
    }
    html += '</div>';

    // ========== NATIONAL DATABASE SECTION (PLACEHOLDER) ==========
  html += `
    <div class="detail-section">
        <div class="detail-section-title">
            <i class="fas fa-database"></i>
            Electoral Intelligence - ${constituencyName}
            <span class="live-badge">LIVE</span>
        </div>
        <div id="nationalDbResults" class="national-db-container">
            <div class="api-loading">
                <div class="mini-spinner"></div>
                <div class="rotating-loading-content">
                    <div class="rotating-loading-icon">
                        <i class="fas fa-landmark"></i>
                    </div>
                    <span class="rotating-loading-text">Searching Electoral Commission Records...</span>
                </div>
            </div>
        </div>
    </div>
`;
    // ========== RAJYA SABHA LINK ==========
    if (state) {
        html += `
            <div class="state-link" onclick="event.stopPropagation(); showStateModal('${state}')">
                <i class="fas fa-arrow-right"></i>
                <span>View ${state} Rajya Sabha Members</span>
            </div>
        `;
    }

    detailBody.innerHTML = html;

    // ========== FETCH NATIONAL DATABASE ==========
    fetchNationalDatabaseForConstituency(constituencyName);
}



// ==================== ROTATING LOADING MESSAGES ====================

const loadingMessages = [
    { text: "Searching Electoral Commission Records", icon: "fa-landmark" },
    { text: "Accessing Official Candidate Registry", icon: "fa-file-certificate" },
    { text: "Loading Election Commission Archive", icon: "fa-archive" },
    { text: "Fetching Verified Candidate Database", icon: "fa-shield-check" },
    { text: "Retrieving Pan-India Electoral Records", icon: "fa-globe-asia" },
    { text: "Analyzing Constituency Data", icon: "fa-chart-line" },
    { text: "Cross-referencing Electoral Intelligence", icon: "fa-brain" },
     { text: "Validating Candidate Information", icon: "fa-check-double" },
    { text: "Scanning Election History", icon: "fa-history" },
    { text: "Processing Electoral Data", icon: "fa-cog" },
    { text: "Querying Central Database", icon: "fa-server" }
];

let loadingInterval = null;
function startRotatingLoadingText(containerId) {
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.querySelector(`#${containerId}, .api-loading, .search-loading`);
    }
    
    if (!container) return;

    let currentIndex = 0;

    const textElement = container.querySelector('.rotating-loading-text');
    const iconElement = container.querySelector('.rotating-loading-icon i');
    
    if (!textElement || !iconElement) return;

    updateLoadingMessage(container, loadingMessages[0]);

    if (loadingInterval) {
        clearInterval(loadingInterval);
    }

    loadingInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % loadingMessages.length;
        updateLoadingMessage(container, loadingMessages[currentIndex]);
    }, 1000);
}
function updateLoadingMessage(container, message) {
    const textElement = container.querySelector('.rotating-loading-text');
    const iconElement = container.querySelector('.rotating-loading-icon i');
    
    if (textElement && iconElement) {
        textElement.classList.add('fade-out');
        
        setTimeout(() => {
            textElement.textContent = message.text + '...';
            iconElement.className = `fas ${message.icon}`;
            
            textElement.classList.remove('fade-out');
            textElement.classList.add('fade-in');
            
            setTimeout(() => {
                textElement.classList.remove('fade-in');
            }, 300);
        }, 150);
    }
}

function stopRotatingLoadingText() {
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }
}


async function fetchNationalDatabaseForConstituency(constituencyName) {
    const container = document.getElementById('nationalDbResults');
    
    if (!container) return;

    startRotatingLoadingText('nationalDbResults');

    try {
        const response = await fetch(`/api/search-proxy?q=${encodeURIComponent(constituencyName)}`);
        
        stopRotatingLoadingText();
        
        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();

        console.log('📊 National DB Results for', constituencyName, ':', data);

        if (data.fallback || !data.suggestions || data.suggestions.length === 0) {
            container.innerHTML = `
                <div class="no-api-results">
                    <div class="no-results-icon-small">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="no-results-text-small">No records found in electoral databases</div>
                    <div class="no-results-hint-small">Try searching by candidate name in the search box above</div>
                </div>
            `;
            return;
        }

        const relevantResults = data.suggestions.filter(item => 
            item.constituency && 
            cleanName(item.constituency) === cleanName(constituencyName)
        );

        const allResults = relevantResults.length > 0 ? relevantResults : data.suggestions.slice(0, 8);

        let html = `
            <div class="api-results-header">
                <div class="api-results-count">
                    <i class="fas fa-check-circle"></i>
                    Found ${allResults.length} candidate${allResults.length !== 1 ? 's' : ''}
                    ${relevantResults.length > 0 ? 'from this constituency' : 'matching this search'}
                </div>
                ${data.cached ? '<span class="cached-badge"><i class="fas fa-bolt"></i> Cached</span>' : ''}
            </div>
            <div class="national-db-grid">
        `;

        allResults.forEach(result => {
            html += generateNationalDbCard(result);
        });

        html += '</div>';

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Error fetching national database:', error);
        
        stopRotatingLoadingText();
        
        container.innerHTML = `
            <div class="api-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-text">Unable to access electoral databases</div>
                <div class="error-hint">Local data is still available above</div>
            </div>
        `;
    }
}
// ==================== GENERATE REPRESENTATIVE CARD ====================

function generateRepresentativeCard(member, type, constituency) {
    const memberName = member.name.replace(/'/g, "\\'");
    const party = member.party || 'N/A';
    
    return `
        <div class="representative-card clickable-card"
             data-member-name="${memberName}"
             data-member-type="${type}"
             data-constituency="${constituency}"
             data-party="${party}"
             onclick="handleCardClick(this)"
             style="cursor: pointer; position: relative;">
            <div class="rep-header">
                <div>
                    <div class="rep-name" style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${member.name}</span>
                        <i class="fas fa-external-link-alt" style="font-size: 0.8rem; opacity: 0.5;"></i>
                    </div>
                </div>
                <div class="rep-party">${party}</div>
            </div>
            <div class="rep-details">
                <div class="rep-detail-item">
                    <i class="fas fa-venus-mars"></i>
                    ${member.gender || 'N/A'}
                </div>
                <div class="rep-detail-item">
                    <i class="fas fa-birthday-cake"></i>
                    ${member.age ? member.age + ' years' : 'N/A'}
                </div>
                <div class="rep-detail-item">
                    <i class="fas fa-graduation-cap"></i>
                    ${member.education || 'N/A'}
                </div>
                <div class="rep-detail-item">
                    <i class="far fa-calendar-alt"></i>
                    ${member.term_start_date} - ${member.term_end_date}
                </div>
                ${member.attendance !== null && member.attendance !== undefined ? `
                <div class="rep-detail-item">
                    <i class="fas fa-check-circle"></i>
                    Attendance: ${typeof member.attendance === 'number' ? (member.attendance * 100).toFixed(1) : member.attendance}%
                </div>` : ''}
            </div>
            <div class="card-click-hint">
                <i class="fas fa-arrow-right"></i>
                Click to view full profile
            </div>
        </div>
    `;
}

// ==================== GENERATE NATIONAL DB CARD ====================

function generateNationalDbCard(result) {
    const typeInfo = detectMemberType(result.type);
    const criminalBadge = result.criminal ? 
        '<span class="criminal-badge-inline"><i class="fas fa-exclamation-triangle"></i> Criminal Record</span>' : '';
    
    let meow = '';
    let bhaw = '';
    
    if (result.link) {
        try {
            const url = new URL(result.link);
            const params = new URLSearchParams(url.search);
            meow = params.get('candidate_id') || '';
            
            const pathParts = url.pathname.split('/');
            const stateIndex = pathParts.findIndex(part => part && part !== '');
            if (stateIndex !== -1) {
                bhaw = pathParts[stateIndex];
            }
        } catch (error) {
            console.error('Error parsing URL:', error);
        }
    }

    return `
        <div class="national-db-card clickable-card"
             data-member-name="${result.name.replace(/'/g, "\\'")}"
             data-member-type="${typeInfo.type}"
             data-constituency="${result.constituency || ''}"
             data-party="${result.party || ''}"
             data-meow="${meow}"
             data-bhaw="${bhaw}"
             onclick="handleNationalDbClick(this)"
             style="cursor: pointer;">
            
            ${result.image ? `
                <div class="ndb-image">
                    <img src="${result.image}" alt="${result.name}" 
                         onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-user\\'></i></div>'">
                </div>
            ` : `
                <div class="ndb-image">
                    <div class="image-placeholder">
                        <i class="fas fa-user"></i>
                    </div>
                </div>
            `}
            
            <div class="ndb-content">
                <div class="ndb-header">
                    <div class="ndb-name">
                        ${result.name}
                        <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.5; margin-left: 0.3rem;"></i>
                    </div>
                    <span class="suggestion-type-badge ${typeInfo.class}">${typeInfo.label}</span>
                </div>
                
                <div class="ndb-meta">
                    <div class="ndb-meta-item">
                        <i class="fas fa-flag"></i>
                        <span>${result.party}</span>
                    </div>
                    <div class="ndb-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${result.constituency}</span>
                    </div>
                    <div class="ndb-meta-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="election-badge-inline">${result.election}</span>
                    </div>
                </div>
                
                ${criminalBadge}
            </div>
            
            <div class="card-click-hint-small">
                <i class="fas fa-arrow-right"></i>
                View Profile
            </div>
        </div>
    `;
}

// ==================== HANDLE NATIONAL DB CLICK ====================

function handleNationalDbClick(cardElement) {
    const name = cardElement.getAttribute('data-member-name');
    const type = cardElement.getAttribute('data-member-type');
    const constituency = cardElement.getAttribute('data-constituency') || '';
    const party = cardElement.getAttribute('data-party') || '';
    const meow = cardElement.getAttribute('data-meow') || '';
    const bhaw = cardElement.getAttribute('data-bhaw') || '';

    console.log('🎯 National DB Card clicked:', { name, type, constituency, party, meow, bhaw });

    if (name && type) {
        navigateToMember(name, type, constituency, party, meow, bhaw);
    } else {
        console.error('❌ Missing name or type in national DB card');
    }
}
        // ==================== NAVIGATION ====================

        function handleCardClick(cardElement) {
            const name = cardElement.getAttribute('data-member-name');
            const type = cardElement.getAttribute('data-member-type');
            const constituency = cardElement.getAttribute('data-constituency') || '';
            const party = cardElement.getAttribute('data-party') || '';

            console.log('🎯 Card clicked:', { name, type, constituency, party });

            if (name && type) {
                navigateToMember(name, type, constituency, party);
            } else {
                console.error('❌ Missing name or type in card data');
            }
        }

       function navigateToMember(name, type, constituency = '', party = '', meow = '', bhaw = '') {
    console.log('🚀 Navigating to:', name, type, constituency, party, meow, bhaw);

    const params = new URLSearchParams();
    params.append('name', name);
    params.append('type', type);
    if (constituency) params.append('constituency', constituency);
    if (party) params.append('party', party);
    if (meow) params.append('meow', meow);
    if (bhaw) params.append('bhaw', bhaw);

    const url = `/member?${params.toString()}`;
    console.log('📍 URL:', url);

    window.location.href = url;
}


        function testNavigation(name, type) {
            console.log('🔍 Test Navigation Called:', name, type);
            const url = `/member?name=${encodeURIComponent(name)}&type=${type}`;
            console.log('📍 Navigating to:', url);
            window.location.href = url;
        }

        function testMemberRoute() {
            fetch('/member?name=Test&type=MP')
                .then(response => {
                    console.log('✅ Member route status:', response.status);
                    if (response.ok) {
                        console.log('✅ Member route is accessible');
                    } else {
                        console.error('❌ Member route returned error:', response.status);
                    }
                })
                .catch(error => {
                    console.error('❌ Cannot reach member route:', error);
                });
        }

        setTimeout(testMemberRoute, 2000);

        // ==================== STATE MODAL ====================

        function showStateModal(stateName) {
            const modal = document.getElementById('stateModal');
            const modalBody = document.getElementById('modalBody');

            document.getElementById('modalTitle').textContent = stateName;

            let rajyaSabhaMembers = rajyaSabhaData[stateName] || [];
            rajyaSabhaMembers = rajyaSabhaMembers.filter(rs =>
                isCurrentTerm(rs.term_start_date, rs.term_end_date)
            );
            rajyaSabhaMembers = rajyaSabhaMembers.filter((member, index, self) =>
                index === self.findIndex(m => m.name === member.name && m.party === member.party)
            );

            console.log('Rajya Sabha members for', stateName, ':', rajyaSabhaMembers);

            let html = '';
            const partyCount = {};
            rajyaSabhaMembers.forEach(member => {
                partyCount[member.party] = (partyCount[member.party] || 0) + 1;
            });

            html += `
            <div class="modal-stats">
                <div class="modal-stat-card">
                    <div class="modal-stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="modal-stat-value">${rajyaSabhaMembers.length}</div>
                    <div class="modal-stat-label">Total Members</div>
                </div>
                <div class="modal-stat-card">
                    <div class="modal-stat-icon">
                        <i class="fas fa-flag"></i>
                    </div>
                    <div class="modal-stat-value">${Object.keys(partyCount).length}</div>
                    <div class="modal-stat-label">Parties</div>
                </div>
                <div class="modal-stat-card">
                    <div class="modal-stat-icon">
                        <i class="fas fa-university"></i>
                    </div>
                    <div class="modal-stat-value">${stateName.length}</div>
                    <div class="modal-stat-label">State Code</div>
                </div>
            </div>
        `;

            html += '<div class="detail-section"><div class="detail-section-title"><i class="fas fa-university"></i> Rajya Sabha Members</div>';

            if (rajyaSabhaMembers.length > 0) {
                rajyaSabhaMembers.forEach(member => {
                    const memberName = member.name.replace(/'/g, "\\'");
                    html += `
                    <div class="representative-card clickable-card" 
                         data-member-name="${memberName}" 
                         data-member-type="MP"
                         onclick="handleCardClick(this)"
                         style="cursor: pointer; position: relative;">
                        <div class="rep-header">
                            <div>
                                <div class="rep-name" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span>${member.name}</span>
                                    <i class="fas fa-external-link-alt" style="font-size: 0.8rem; opacity: 0.5;"></i>
                                </div>
                            </div>
                            <div class="rep-party">${member.party}</div>
                        </div>
                        <div class="rep-details">
                            <div class="rep-detail-item">
                                <i class="fas fa-venus-mars"></i>
                                ${member.gender || 'N/A'}
                            </div>
                            <div class="rep-detail-item">
                                <i class="fas fa-birthday-cake"></i>
                                ${member.age ? member.age + ' years' : 'N/A'}
                            </div>
                            <div class="rep-detail-item">
                                <i class="fas fa-graduation-cap"></i>
                                ${member.education || 'N/A'}
                            </div>
                            <div class="rep-detail-item">
                                <i class="far fa-calendar-alt"></i>
                                ${member.term_start_date} - ${member.term_end_date}
                            </div>
                            ${member.attendance !== null && member.attendance !== undefined ? `
                            <div class="rep-detail-item">
                                <i class="fas fa-check-circle"></i>
                                Attendance: ${(member.attendance * 100).toFixed(2)}%
                            </div>` : ''}
                        </div>
                        <div class="card-click-hint">
                            <i class="fas fa-arrow-right"></i>
                            Click to view full profile
                        </div>
                    </div>
                `;
                });
            } else {
                html += '<p class="no-data">No Rajya Sabha members found for this state</p>';
            }

            html += '</div>';
            modalBody.innerHTML = html;
            modal.classList.add('active');
        }

        function closeStateModal(event) {
            if (!event || event.target.id === 'stateModal') {
                document.getElementById('stateModal').classList.remove('active');
            }
        }

       // ==================== OPTIMIZED SEARCH CONFIGURATION ====================
 const searchBox = document.getElementById('searchBox');
        const suggestionsBox = document.getElementById('searchSuggestions');
        
const SEARCH_CONFIG = {
    minChars: 3,            
    debounceTime: 600,      
    maxCacheSize: 100,       
    maxCacheAge: 300000,     
    apiThrottle: 1000         
};

let searchTimeout = null;
let apiCache = new Map();
let abortController = null;
let lastAPICallTime = 0;
let pendingSearchTerm = null;
let isSearching = false;

// ==================== CACHE MANAGEMENT ====================

function getCachedResult(searchTerm) {
    const cached = apiCache.get(searchTerm.toLowerCase());
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > SEARCH_CONFIG.maxCacheAge) {
        apiCache.delete(searchTerm.toLowerCase());
        return null;
    }
    
    console.log(`✅ Using cached result for "${searchTerm}" (age: ${Math.round(age/1000)}s)`);
    return cached.data;
}

function setCachedResult(searchTerm, data) {
    if (apiCache.size >= SEARCH_CONFIG.maxCacheSize) {
        const firstKey = apiCache.keys().next().value;
        apiCache.delete(firstKey);
        console.log('🗑️ Cache limit reached, removed oldest entry');
    }
    
    apiCache.set(searchTerm.toLowerCase(), {
        data: data,
        timestamp: Date.now()
    });
    
    console.log(`💾 Cached result for "${searchTerm}" (total cached: ${apiCache.size})`);
}

function clearExpiredCache() {
    const now = Date.now();
    let removed = 0;
    
    for (let [key, value] of apiCache.entries()) {
        if (now - value.timestamp > SEARCH_CONFIG.maxCacheAge) {
            apiCache.delete(key);
            removed++;
        }
    }
    
    if (removed > 0) {
        console.log(`🗑️ Removed ${removed} expired cache entries`);
    }
}

setInterval(clearExpiredCache, 120000);

// ==================== OPTIMIZED SEARCH INPUT HANDLER ====================

searchBox.addEventListener('input', function (e) {
    const searchTerm = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    
    if (searchTerm.length < SEARCH_CONFIG.minChars) {
        suggestionsBox.classList.remove('active');
        clearHighlightedLayers();
        stopRotatingLoadingText();
        isSearching = false;
        return;
    }
    
    showSearchLoading();
    
    searchTimeout = setTimeout(() => {
        performOptimizedSearch(searchTerm);
    }, SEARCH_CONFIG.debounceTime);
});

function showSearchLoading() {
    suggestionsBox.innerHTML = `
        <div class="search-loading">
            <div class="loading-spinner"></div>
            <div class="rotating-loading-content">
                <div class="rotating-loading-icon">
                    <i class="fas fa-landmark"></i>
                </div>
                <div class="rotating-loading-text">Searching Electoral Commission Records...</div>
            </div>
        </div>
    `;
    suggestionsBox.classList.add('active');
    
    setTimeout(() => {
        startRotatingLoadingText('searchLoadingText');
    }, 100);
}

// ==================== OPTIMIZED SEARCH FUNCTION ====================

async function performOptimizedSearch(searchTerm) {
    if (isSearching) {
        console.log('⏸️ Search already in progress, queuing...');
        pendingSearchTerm = searchTerm;
        return;
    }
    
    isSearching = true;
    
    try {
        const localResults = performLocalSearch(searchTerm);
        
        const cachedApiResults = getCachedResult(searchTerm);
        
        if (cachedApiResults !== null) {
            stopRotatingLoadingText();
            displayCombinedResults(localResults, cachedApiResults, searchTerm);
            isSearching = false;
            checkPendingSearch();
            return;
        }
        
        displayCombinedResults(localResults, [], searchTerm, true);
        
        const timeSinceLastCall = Date.now() - lastAPICallTime;
        if (timeSinceLastCall < SEARCH_CONFIG.apiThrottle) {
            const waitTime = SEARCH_CONFIG.apiThrottle - timeSinceLastCall;
            console.log(`⏱️ Throttling API call, waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const apiResults = await fetchAPIResultsOptimized(searchTerm);
        
        if (apiResults && apiResults.length > 0) {
            setCachedResult(searchTerm, apiResults);
        }
        
        stopRotatingLoadingText();
        displayCombinedResults(localResults, apiResults, searchTerm);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Search error:', error);
            stopRotatingLoadingText();
            const localResults = performLocalSearch(searchTerm);
            displayCombinedResults(localResults, [], searchTerm);
        }
    } finally {
        isSearching = false;
        checkPendingSearch();
    }
}

function checkPendingSearch() {
    if (pendingSearchTerm) {
        const term = pendingSearchTerm;
        pendingSearchTerm = null;
        console.log(`▶️ Processing pending search: "${term}"`);
        performOptimizedSearch(term);
    }
}

// ==================== OPTIMIZED API FETCH ====================

async function fetchAPIResultsOptimized(query) {
    if (abortController) {
        abortController.abort();
        console.log('🛑 Cancelled previous API request');
    }
    
    abortController = new AbortController();
    lastAPICallTime = Date.now();
    
    const apiUrl = `/api/search-proxy?q=${encodeURIComponent(query)}`;
    
    console.log(`🌐 API Request: "${query}"`);
    
    try {
        const response = await fetch(apiUrl, {
            signal: abortController.signal,
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            console.warn(`⚠️ API returned ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (data.fallback) {
            console.warn('⚠️ API in fallback mode:', data.error);
            return [];
        }

        console.log(`✅ API Response: ${data.count || data.suggestions?.length || 0} results (${data.responseTime}ms)`);
        return data.suggestions || [];

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('🛑 Request aborted');
        } else {
            console.warn('⚠️ API error:', error.message);
        }
        return [];
    }
}

// ==================== KEEP EXISTING FUNCTIONS ====================

function performLocalSearch(searchTerm) {
    const results = [];
    const lowerTerm = searchTerm.toLowerCase();

    allFeatures.forEach(feature => {
        const pcName = getConstituencyName(feature.properties);
        const stName = getStateName(feature.properties);

        if (pcName.toLowerCase().includes(lowerTerm) ||
            stName.toLowerCase().includes(lowerTerm)) {
            results.push({
                type: 'constituency',
                name: pcName,
                state: stName,
                feature: feature,
                source: 'local'
            });
        }
    });

    for (let key in constituencyData) {
        const data = constituencyData[key];

        if (data.MP && data.MP.name.toLowerCase().includes(lowerTerm)) {
            const feature = allFeatures.find(f => {
                const fname = getConstituencyName(f.properties);
                return cleanName(fname) === key;
            });
            if (feature) {
                results.push({
                    type: 'mp',
                    name: data.MP.name,
                    party: data.MP.party,
                    constituency: getConstituencyName(feature.properties),
                    feature: feature,
                    source: 'local'
                });
            }
        }

        if (data.MLAs) {
            data.MLAs.forEach(mla => {
                if (mla.name.toLowerCase().includes(lowerTerm)) {
                    const feature = allFeatures.find(f => {
                        const fname = getConstituencyName(f.properties);
                        return cleanName(fname) === key;
                    });
                    if (feature) {
                        results.push({
                            type: 'mla',
                            name: mla.name,
                            party: mla.party,
                            constituency: getConstituencyName(feature.properties),
                            assembly: mla.ac_name,
                            feature: feature,
                            source: 'local'
                        });
                    }
                }
            });
        }

        if (data.MP && data.MP.party.toLowerCase().includes(lowerTerm)) {
            const feature = allFeatures.find(f => {
                const fname = getConstituencyName(f.properties);
                return cleanName(fname) === key;
            });
            if (feature && !results.find(r => r.feature === feature && r.type === 'mp')) {
                results.push({
                    type: 'mp',
                    name: data.MP.name,
                    party: data.MP.party,
                    constituency: getConstituencyName(feature.properties),
                    feature: feature,
                    source: 'local'
                });
            }
        }
    }

    return results;
}

  function displayCombinedResults(localResults, apiResults, searchTerm, loading = false) {
    clearHighlightedLayers();

    if (localResults.length === 0 && apiResults.length === 0 && !loading) {
        stopRotatingLoadingText();
        suggestionsBox.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="fas fa-search-minus"></i>
                </div>
                <div class="no-results-text">No results found for "${searchTerm}"</div>
                <div class="no-results-hint">Try searching for a constituency, MP, MLA, or party name</div>
            </div>
        `;
        suggestionsBox.classList.add('active');
        return;
    }

    let html = '';

    if (localResults.length > 0) {
        html += `
            <div class="search-section">
                <div class="search-section-header">
                    <i class="fas fa-map-marked-alt"></i>
                    <span>Map Results</span>
                    <span class="result-count">${localResults.length}</span>
                </div>
                <div class="search-results-grid">
        `;

        localResults.slice(0, 5).forEach((result, index) => {
            html += generateLocalResultCard(result, index, searchTerm);
            if (result.feature) {
                highlightConstituencyOnMap(result.feature);
            }
        });

        html += `</div></div>`;
    }

    if (apiResults.length > 0) {
        const cached = getCachedResult(searchTerm);
        const isCached = cached !== null;
        
        html += `
            <div class="search-section">
                <div class="search-section-header">
                    <i class="fas fa-database"></i>
                    <span>Electoral Intelligence</span>
                    <span class="result-count">${apiResults.length}</span>
                    ${isCached ? '<span class="cached-indicator"><i class="fas fa-bolt"></i> Instant</span>' : ''}
                </div>
                <div class="search-results-grid">
        `;

        apiResults.slice(0, 8).forEach((result, index) => {
            html += generateAPIResultCard(result, index, searchTerm);
        });

        html += `</div></div>`;
    } else if (loading) {
        html += `
            <div class="search-section">
                <div class="search-section-header">
                    <i class="fas fa-database"></i>
                    <span>Electoral Intelligence</span>
                </div>
                <div class="api-loading" id="searchLoadingText">
                    <div class="mini-spinner"></div>
                    <div class="rotating-loading-content">
                        <div class="rotating-loading-icon">
                            <i class="fas fa-landmark"></i>
                        </div>
                        <span class="rotating-loading-text">Searching Electoral Commission Records...</span>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            startRotatingLoadingText('searchLoadingText');
        }, 100);
    }

    suggestionsBox.innerHTML = html;
    suggestionsBox.classList.add('active');

    attachResultClickHandlers(localResults, apiResults);
}

function generateLocalResultCard(result, index, searchTerm) {
            let icon = 'fa-map-pin';
            let subtitle = result.state || '';
            let badgeClass = 'badge-constituency';
            let badgeText = 'Constituency';

            if (result.type === 'mp') {
                icon = 'fa-landmark';
                subtitle = `${result.party} • ${result.constituency}`;
                badgeClass = 'badge-mp';
                badgeText = 'Lok Sabha';
            } else if (result.type === 'mla') {
                icon = 'fa-user-tie';
                subtitle = `${result.party} • ${result.assembly}`;
                badgeClass = 'badge-mla';
                badgeText = 'MLA';
            }

            const highlightedName = highlightText(result.name, searchTerm);

            return `
            <div class="suggestion-item local-result" data-index="${index}" data-source="local">
                <div class="suggestion-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="suggestion-content">
                    <div class="suggestion-name">${highlightedName}</div>
                    <div class="suggestion-state">${subtitle}</div>
                </div>
                <span class="suggestion-type-badge ${badgeClass}">${badgeText}</span>
            </div>
        `;
        }

        function generateAPIResultCard(result, index, searchTerm) {
            const typeInfo = detectMemberType(result.type);
            const highlightedName = highlightText(result.name, searchTerm);
            const criminalBadge = result.criminal ? '<span class="criminal-badge"><i class="fas fa-exclamation-triangle"></i></span>' : '';

            return `
            <div class="suggestion-item api-result" data-index="${index}" data-source="api">
                ${result.image ? `
                    <div class="suggestion-image">
                        <img src="${result.image}" alt="${result.name}" onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><i class=\\'fas fa-user\\'></i></div>'">
                    </div>
                ` : `
                    <div class="suggestion-image">
                        <div class="image-placeholder">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                `}
                <div class="suggestion-content">
                    <div class="suggestion-name">
                        ${highlightedName}
                        ${criminalBadge}
                    </div>
                    <div class="suggestion-state">
                        <i class="fas fa-flag"></i> ${result.party}
                    </div>
                    <div class="suggestion-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${result.constituency}</span>
                        <span class="election-badge">${result.election}</span>
                    </div>
                </div>
                <span class="suggestion-type-badge ${typeInfo.class}">${typeInfo.label}</span>
            </div>
        `;
        }

        function detectMemberType(typeString) {
            const lower = typeString.toLowerCase();

            if (lower.includes('lok sabha') || lower.includes('mp (lok sabha)')) {
                return { type: 'MP', class: 'badge-mp', label: 'Lok Sabha' };
            } else if (lower.includes('rajya sabha') || lower.includes('mp (rajya sabha)')) {
                return { type: 'MP', class: 'badge-mp', label: 'Rajya Sabha' };
            } else if (lower.includes('mla')) {
                return { type: 'MLA', class: 'badge-mla', label: 'MLA' };
            } else {
                return { type: 'MLA', class: 'badge-mla', label: 'Assembly' };
            }
        }

        function highlightText(text, query) {
            if (!query) return text;

            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        }

        function attachResultClickHandlers(localResults, apiResults) {
            document.querySelectorAll('.suggestion-item.local-result').forEach((item, index) => {
                item.addEventListener('click', () => {
                    const result = localResults[index];
                    if (result.type === 'constituency') {
                        selectSearchResult(result);
                    } else {
                        const memberType = result.type === 'mp' ? 'MP' : 'MLA';
                        navigateToMember(result.name, memberType, result.constituency || '', result.party || '');
                    }
                });
            });

            document.querySelectorAll('.suggestion-item.api-result').forEach((item, index) => {
                item.addEventListener('click', () => {
                    const result = apiResults[index];
                    console.log("Result", result);
                    const typeInfo = detectMemberType(result.type);

                    let meow = '';
                    let bhaw = '';

                    if (result.link) {
                        try {
                            const url = new URL(result.link);

                            const params = new URLSearchParams(url.search);
                            meow = params.get('candidate_id') || '';

                            const pathParts = url.pathname.split('/');
                            const stateIndex = pathParts.findIndex(part => part && part !== '');
                            if (stateIndex !== -1) {
                                bhaw = pathParts[stateIndex];
                            }
                        } catch (error) {
                            console.error('Error parsing URL:', error);
                        }
                    }

                    console.log('meow:', meow);
                    console.log('bhaw:', bhaw); 
console.log("Result",result);
console.log("typeInfo",typeInfo)
                    navigateToMember(result.name, typeInfo.type, result.constituency || '', result.party || '', meow, bhaw);
                });
            });
        }

        function selectSearchResult(result) {
            suggestionsBox.classList.remove('active');
            searchBox.value = result.name;
            clearHighlightedLayers();

            if (result.feature) {
                geojsonLayer.eachLayer(function (layer) {
                    if (layer.feature === result.feature) {
                        const bounds = layer.getBounds();
                        const center = bounds.getCenter();

                        map.flyTo(center, 9, {
                            duration: 2,
                            easeLinearity: 0.25
                        });

                        setTimeout(() => {
                            if (selectedLayer && selectedLayer !== layer) {
                                selectedLayer.setStyle(defaultStyle());
                            }
                            layer.setStyle(highlightStyle());
                            selectedLayer = layer;
                            showConstituencyDetails(result.feature);
                        }, 2100);
                    }
                });
            }
        }

        // ==================== RESET VIEW ====================

        function resetView() {
            searchBox.value = '';
            suggestionsBox.classList.remove('active');
            clearHighlightedLayers();

            if (selectedLayer) {
                selectedLayer.setStyle(defaultStyle());
                selectedLayer = null;
            }

            document.getElementById('detailPanel').classList.remove('active');

            map.flyTo([22.9734, 78.6569], 5, {
                duration: 1.5,
                easeLinearity: 0.5
            });
        }

        // ==================== EVENT LISTENERS ====================

        searchBox.addEventListener('keydown', function (e) {
            const items = document.querySelectorAll('.suggestion-item');
            const activeItem = document.querySelector('.suggestion-item.keyboard-active');

            if (e.key === 'Escape') {
                searchBox.value = '';
                suggestionsBox.classList.remove('active');
                clearHighlightedLayers();
                return;
            }

            if (!items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!activeItem) {
                    items[0].classList.add('keyboard-active');
                    items[0].scrollIntoView({ block: 'nearest' });
                } else {
                    const next = activeItem.nextElementSibling;
                    if (next && next.classList.contains('suggestion-item')) {
                        activeItem.classList.remove('keyboard-active');
                        next.classList.add('keyboard-active');
                        next.scrollIntoView({ block: 'nearest' });
                    }
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeItem) {
                    const prev = activeItem.previousElementSibling;
                    if (prev && prev.classList.contains('suggestion-item')) {
                        activeItem.classList.remove('keyboard-active');
                        prev.classList.add('keyboard-active');
                        prev.scrollIntoView({ block: 'nearest' });
                    }
                }
            } else if (e.key === 'Enter' && activeItem) {
                e.preventDefault();
                activeItem.click();
            }
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.search-container')) {
                suggestionsBox.classList.remove('active');
                clearHighlightedLayers();
            }
        });

        setInterval(() => {
            if (apiCache.size > 50) {
                apiCache.clear();
                console.log('🗑️ Search cache cleared');
            }
        }, 300000);

        // ==================== PRODUCTION SECURITY MEASURES ====================

        if (window.IS_PRODUCTION) {
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);

            document.addEventListener('mousedown', function(e) {
                if (e.button === 2) { 
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }, true);

            document.addEventListener('keydown', function(e) {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const ctrlOrCmd = e.ctrlKey || (isMac && e.metaKey);

                if (e.keyCode === 123) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.shiftKey && e.keyCode === 73) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.shiftKey && e.keyCode === 74) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.shiftKey && e.keyCode === 67) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.keyCode === 85) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.shiftKey && e.keyCode === 75) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (e.keyCode === 122) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                if (ctrlOrCmd && e.shiftKey && e.keyCode === 46) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }, true);

            let devtools = {
                open: false,
                methods: {
                    size: false,
                    debugger: false,
                    performance: false
                }
            };

            const checkWindowSize = () => {
                const threshold = 200;
                const sizeOpen = window.outerHeight - window.innerHeight > threshold ||
                               window.outerWidth - window.innerWidth > threshold;
                devtools.methods.size = sizeOpen;
            };

            const checkDebugger = () => {
                const start = performance.now();
                debugger; 
                const end = performance.now();
                devtools.methods.debugger = end - start > 100;
            };

            const checkPerformance = () => {
                const start = performance.now();
                for (let i = 0; i < 1000; i++) {
                }
                const end = performance.now();
                devtools.methods.performance = end - start > 50;
            };

            const checkDevTools = () => {
                checkWindowSize();
                checkDebugger();
                checkPerformance();

                const wasOpen = devtools.open;
                devtools.open = devtools.methods.size || devtools.methods.debugger || devtools.methods.performance;

                if (devtools.open && !wasOpen) {
                    console.clear();
                    console.log('%c🚫 Developer tools detected. Access restricted.', 'color: red; font-size: 18px; font-weight: bold;');
                    console.log('%cThis action violates our terms of service.', 'color: orange; font-size: 14px;');

                    showSecurityWarning();
                } else if (!devtools.open && wasOpen) {
                    hideSecurityWarning();
                }
            };

            const showSecurityWarning = () => {
                let warning = document.getElementById('security-warning');
                if (!warning) {
                    warning = document.createElement('div');
                    warning.id = 'security-warning';
                    warning.innerHTML = `
                        <div style="
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0,0,0,0.9);
                            color: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 999999;
                            font-family: Arial, sans-serif;
                            text-align: center;
                        ">
                            <div>
                                <h2 style="color: #ff4444; margin-bottom: 20px;">⚠️ Security Alert</h2>
                                <p style="font-size: 16px; margin-bottom: 20px;">Developer tools detected. This action is not permitted.</p>
                                <p style="font-size: 14px; color: #ccc;">Please close developer tools to continue.</p>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(warning);
                }
                warning.style.display = 'flex';
            };

            const hideSecurityWarning = () => {
                const warning = document.getElementById('security-warning');
                if (warning) {
                    warning.style.display = 'none';
                }
            };

            setInterval(checkDevTools, 100);

            const originalConsole = {
                log: console.log,
                warn: console.warn,
                error: console.error,
                info: console.info,
                debug: console.debug,
                clear: console.clear
            };

            const createSecureConsole = () => ({
                log: function(...args) {
                    if (devtools.open) {
                        originalConsole.log('%c[SECURE] Console access restricted', 'color: red; font-weight: bold;');
                        return;
                    }
                    originalConsole.log.apply(console, args);
                },
                warn: function(...args) {
                    if (devtools.open) {
                        return;
                    }
                    originalConsole.warn.apply(console, args);
                },
                error: function(...args) {
                    if (devtools.open) {
                        return;
                    }
                    originalConsole.error.apply(console, args);
                },
                info: function(...args) {
                    if (devtools.open) {
                        return;
                    }
                    originalConsole.info.apply(console, args);
                },
                debug: function(...args) {
                    if (devtools.open) {
                        return;
                    }
                    originalConsole.debug.apply(console, args);
                },
                clear: function() {
                    if (devtools.open) {
                        return;
                    }
                    originalConsole.clear.apply(console, []);
                }
            });

            Object.defineProperty(window, 'console', {
                get: function() {
                    return devtools.open ? createSecureConsole() : originalConsole;
                },
                set: function() {}
            });

            window.eval = function() {
                throw new Error('eval() is disabled for security reasons');
            };

            document.addEventListener('selectstart', function(e) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);

            document.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);

            document.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);

            document.addEventListener('copy', function(e) {
                if (devtools.open) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);

            document.addEventListener('paste', function(e) {
                if (devtools.open) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);

            console.clear();
            console.log('%c🔒 Enhanced Production Security Active', 'color: green; font-size: 16px; font-weight: bold;');
            console.log('%c⚠️ Developer tools are monitored and restricted', 'color: orange; font-size: 14px;');
        }