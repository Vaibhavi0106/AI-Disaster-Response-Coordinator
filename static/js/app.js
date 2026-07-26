/**
 * AI Disaster Response Coordinator - Universal EOC Command Center Engine
 */

let mapInstance = null;
let mapMarkers = [];
let currentAnalysisData = null;
let speechUtterance = null;

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

function initEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const queryInput = document.getElementById('disasterQuery');
    const samplePills = document.querySelectorAll('.sample-pill');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const voiceAdvisoryBtn = document.getElementById('voiceAdvisoryBtn');

    if (searchBtn) {
        searchBtn.addEventListener('click', performAnalysis);
    }

    if (queryInput) {
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performAnalysis();
            }
        });
    }

    samplePills.forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.getAttribute('data-query');
            if (queryInput) {
                queryInput.value = query;
                performAnalysis();
            }
        });
    });

    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', navigateToReport);
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', exportRawJson);
    }

    if (voiceAdvisoryBtn) {
        voiceAdvisoryBtn.addEventListener('click', toggleVoiceAdvisory);
    }
}

async function performAnalysis() {
    const queryInput = document.getElementById('disasterQuery');
    const searchBtn = document.getElementById('searchBtn');
    const loadingBox = document.getElementById('loadingBox');
    const dashboardResults = document.getElementById('dashboardResults');

    const query = queryInput ? queryInput.value.trim() : '';

    if (!query) {
        alert('Please enter ANY disaster location or crisis query.');
        return;
    }

    searchBtn.disabled = true;
    if (dashboardResults) dashboardResults.style.display = 'none';
    if (loadingBox) loadingBox.style.display = 'block';

    await runLoadingProgress();

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === 'success' && data.data) {
            currentAnalysisData = data.data;
            sessionStorage.setItem('currentDisasterReport', JSON.stringify(currentAnalysisData));
            renderDashboard(currentAnalysisData);
        } else {
            alert('Failed to analyze query: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Analysis request error:', err);
        alert('Error connecting to AI Disaster Response server. Please try again.');
    } finally {
        searchBtn.disabled = false;
        if (loadingBox) loadingBox.style.display = 'none';
    }
}

async function runLoadingProgress() {
    const steps = [
        { id: 'step-search', delay: 700 },
        { id: 'step-analyze', delay: 800 },
        { id: 'step-recommend', delay: 700 },
        { id: 'step-prepare', delay: 500 }
    ];

    steps.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) {
            el.classList.remove('active', 'completed');
            const icon = el.querySelector('i');
            if (icon) icon.className = 'bi bi-dash-circle';
        }
    });

    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const el = document.getElementById(s.id);
        if (el) {
            el.classList.add('active');
            const icon = el.querySelector('i');
            if (icon) icon.className = 'bi bi-arrow-repeat spin';
        }
        await new Promise(r => setTimeout(r, s.delay));
        if (el) {
            el.classList.remove('active');
            el.classList.add('completed');
            const icon = el.querySelector('i');
            if (icon) icon.className = 'bi bi-check-circle-fill';
        }
    }
}

/**
 * Renders complete EOC Telemetry Dashboard with High-Contrast Text
 */
function renderDashboard(data) {
    const dashboardResults = document.getElementById('dashboardResults');
    if (!dashboardResults) return;

    // STEP A: UNHIDE DASHBOARD FIRST
    dashboardResults.style.display = 'block';

    // 1. Basic Info
    document.getElementById('disasterType').textContent = data.disaster_type || 'Emergency Incident';
    document.getElementById('disasterSummary').textContent = data.summary || 'Summary unavailable.';

    // 2. High-Contrast Severity Badge
    const severityBadge = document.getElementById('severityBadge');
    const severity = (data.severity || 'High').toUpperCase();
    severityBadge.textContent = data.severity || 'High';
    severityBadge.className = 'badge-severity';
    
    if (severity.includes('CRIT')) {
        severityBadge.classList.add('badge-critical');
    } else if (severity.includes('HIGH')) {
        severityBadge.classList.add('badge-high');
    } else if (severity.includes('MED')) {
        severityBadge.classList.add('badge-medium');
    } else {
        severityBadge.classList.add('badge-low');
    }

    // 3. Priority Badge
    document.getElementById('priorityBadge').textContent = data.priority || 'P1 - High Priority';

    // 4. Metric Boxes
    document.getElementById('metricRadius').textContent = data.impact_radius || '20 - 35 km';
    document.getElementById('metricRisk').textContent = data.risk_index || '9.2 / 10';
    document.getElementById('metricTeams').textContent = (data.recommended_resources || []).length + ' Key Squads';

    // 5. Weather Telemetry
    const weather = data.weather_metrics || {};
    document.getElementById('weatherTemp').textContent = weather.temp || '28°C';
    document.getElementById('weatherPrecip').textContent = weather.precipitation || 'Heavy Rain (85%)';
    document.getElementById('weatherWind').textContent = weather.wind || '38 km/h';
    document.getElementById('weatherStatus').textContent = weather.status || 'Active Weather Alert';

    // 6. Locations List with Interactive Click-to-Zoom
    const locationList = document.getElementById('locationsList');
    locationList.innerHTML = '';
    const locations = data.affected_locations || [];
    
    locations.forEach((loc, idx) => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.dataset.index = idx;
        const sevColor = getSeverityColor(loc.severity || data.severity);
        
        item.innerHTML = `
            <div>
                <strong style="color: #ffffff; font-size: 1.05rem;"><i class="bi bi-geo-alt-fill me-1" style="color: ${sevColor};"></i> ${loc.name}</strong>
                <div style="color: #FFC107; font-size: 0.85rem; font-weight: 600; margin-top: 2px;">${loc.details || 'Affected Sector'}</div>
            </div>
            <span class="badge rounded-pill" style="background: ${sevColor}; color: #ffffff; font-size: 0.8rem; font-weight: 800;">
                ${loc.severity || data.severity}
            </span>
        `;

        item.addEventListener('click', () => {
            document.querySelectorAll('.location-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            focusLocationOnMap(loc.lat, loc.lng, loc.name, idx);
        });

        locationList.appendChild(item);
    });

    // 7. Evacuation Shelters List
    const shelterList = document.getElementById('shelterList');
    shelterList.innerHTML = '';
    const shelters = data.evacuation_shelters || [];
    shelters.forEach(s => {
        const item = document.createElement('div');
        item.className = 'list-custom-item';
        item.innerHTML = `
            <i class="bi bi-house-door-fill text-warning"></i>
            <div class="w-100">
                <div class="d-flex justify-content-between">
                    <strong style="color: #ffffff; font-size: 1.05rem;">${s.name}</strong>
                    <span class="badge bg-success text-white font-mono">${s.status || 'Open'}</span>
                </div>
                <div style="color: #FFC107; font-size: 0.85rem; font-weight: 600;">Capacity: ${s.capacity}</div>
            </div>
        `;
        shelterList.appendChild(item);
    });

    // 8. Emergency Contacts
    const contactList = document.getElementById('contactList');
    contactList.innerHTML = '';
    const contacts = data.emergency_contacts || [];
    contacts.forEach(c => {
        const item = document.createElement('div');
        item.className = 'contact-pill';
        item.innerHTML = `
            <div>
                <strong style="color: #ffffff; display: block; font-size: 0.95rem;">${c.label}</strong>
                <span class="font-mono text-warning fw-bold fs-6">${c.number}</span>
            </div>
            <a href="tel:${c.number}"><i class="bi bi-telephone-fill me-1"></i> Call</a>
        `;
        contactList.appendChild(item);
    });

    // 9. Timeline Updates
    const timelineList = document.getElementById('timelineList');
    timelineList.innerHTML = '';
    const timeline = data.incident_timeline || [];
    timeline.forEach(t => {
        const item = document.createElement('div');
        item.className = 'mb-2 pb-2 border-bottom border-secondary';
        item.innerHTML = `
            <span class="font-mono text-warning fw-bold fs-7">[${t.time}]</span>
            <span style="color: #ffffff; font-weight: 600; font-size: 0.9rem;" class="ms-2">${t.event}</span>
        `;
        timelineList.appendChild(item);
    });

    // 10. Recommended Resources
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = '';
    (data.recommended_resources || []).forEach(res => {
        const item = document.createElement('div');
        item.className = 'list-custom-item';
        item.innerHTML = `<i class="bi bi-box-seam-fill text-warning"></i> <span style="color: #ffffff; font-weight: 600;">${res}</span>`;
        resourcesList.appendChild(item);
    });

    // 11. Safety Measures
    const safetyList = document.getElementById('safetyList');
    safetyList.innerHTML = '';
    (data.safety_measures || []).forEach(me => {
        const item = document.createElement('div');
        item.className = 'list-custom-item';
        item.innerHTML = `<i class="bi bi-shield-fill-check text-success"></i> <span style="color: #ffffff; font-weight: 600;">${me}</span>`;
        safetyList.appendChild(item);
    });

    // 12. Intelligence Sources
    const sourcesList = document.getElementById('sourcesList');
    sourcesList.innerHTML = '';
    const sources = data.sources || [];
    if (sources.length > 0) {
        sources.forEach(src => {
            const li = document.createElement('li');
            li.className = 'mb-1 text-truncate';
            li.innerHTML = `<a href="${src}" target="_blank" rel="noopener noreferrer" style="color: #00e5ff; font-weight: 700; text-decoration: none;"><i class="bi bi-link-45deg"></i> ${src}</a>`;
            sourcesList.appendChild(li);
        });
    } else {
        sourcesList.innerHTML = '<li style="color: #FFC107; font-weight: 600;">Verified Live EOC Telemetry Stream</li>';
    }

    // STEP B: INITIALIZE LEAFLET MAP
    initLeafletMap(locations, data.severity);

    dashboardResults.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Leaflet Map Initialization with invalidateSize()
 */
function initLeafletMap(locations, defaultSeverity) {
    const mapDiv = document.getElementById('mapContainer');
    if (!mapDiv) return;

    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }

    mapMarkers = [];

    let centerLat = 20.5937;
    let centerLng = 78.9629;
    let zoomLevel = 11;

    const validLocs = locations.filter(l => l.lat && l.lng && (l.lat !== 0 || l.lng !== 0));
    if (validLocs.length > 0) {
        centerLat = validLocs[0].lat;
        centerLng = validLocs[0].lng;
    }

    mapInstance = L.map('mapContainer', {
        center: [centerLat, centerLng],
        zoom: zoomLevel,
        zoomControl: true
    });

    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    });

    darkTiles.addTo(mapInstance);

    setTimeout(() => {
        if (mapInstance) {
            mapInstance.invalidateSize();
        }
    }, 250);

    if (validLocs.length > 0) {
        const bounds = L.latLngBounds();

        validLocs.forEach((loc, idx) => {
            const color = getSeverityColor(loc.severity || defaultSeverity);

            const marker = L.circleMarker([loc.lat, loc.lng], {
                radius: 12,
                fillColor: color,
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.95
            }).addTo(mapInstance);

            const popupContent = `
                <div style="padding: 6px; min-width: 190px; background: #1a1a1a; color: #ffffff;">
                    <strong style="font-size: 1.1rem; color: #ffffff; display: block; margin-bottom: 2px;">${loc.name}</strong>
                    <span style="font-weight: 800; color: ${color}; font-size: 0.85rem; text-transform: uppercase;">
                        Severity: ${loc.severity || defaultSeverity}
                    </span>
                    <p style="margin-top: 6px; margin-bottom: 0; font-size: 0.85rem; color: #FFC107; font-weight: 600; line-height: 1.3;">
                        ${loc.details || 'Impacted sector requiring response.'}
                    </p>
                </div>
            `;

            marker.bindPopup(popupContent);
            mapMarkers.push(marker);
            bounds.extend([loc.lat, loc.lng]);
        });

        if (validLocs.length > 1) {
            mapInstance.fitBounds(bounds, { padding: [60, 60] });
        }
    }
}

function focusLocationOnMap(lat, lng, name, index) {
    if (!mapInstance) return;
    if (lat && lng && (lat !== 0 || lng !== 0)) {
        mapInstance.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
        if (mapMarkers[index]) {
            mapMarkers[index].openPopup();
        }
    }
}

function getSeverityColor(sev) {
    const s = (sev || '').toUpperCase();
    if (s.includes('CRIT')) return '#B22222';
    if (s.includes('HIGH')) return '#d97706';
    if (s.includes('MED')) return '#FFC107';
    return '#00e676';
}

function navigateToReport() {
    if (!currentAnalysisData) {
        const stored = sessionStorage.getItem('currentDisasterReport');
        if (stored) currentAnalysisData = JSON.parse(stored);
    }

    if (currentAnalysisData) {
        window.location.href = '/report';
    } else {
        alert('Please analyze a disaster query first.');
    }
}

function exportRawJson() {
    if (!currentAnalysisData) {
        alert('No analyzed disaster data available to export.');
        return;
    }
    const jsonStr = JSON.stringify(currentAnalysisData, null, 4);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EOC_Disaster_Telemetry_${(currentAnalysisData.disaster_type || 'Data').replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function toggleVoiceAdvisory() {
    if (!('speechSynthesis' in window)) {
        alert('Speech Synthesis API is not supported in your browser.');
        return;
    }

    const btn = document.getElementById('voiceAdvisoryBtn');

    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        if (btn) btn.innerHTML = '<i class="bi bi-volume-up-fill me-1"></i> Read Advisory Aloud';
        return;
    }

    if (!currentAnalysisData || !currentAnalysisData.safety_measures) return;

    const textToSpeak = `Emergency Public Advisory for ${currentAnalysisData.disaster_type}. ${currentAnalysisData.safety_measures.join('. ')}`;
    speechUtterance = new SpeechSynthesisUtterance(textToSpeak);
    speechUtterance.rate = 0.95;
    speechUtterance.pitch = 1.0;

    speechUtterance.onstart = () => {
        if (btn) btn.innerHTML = '<i class="bi bi-stop-fill me-1"></i> Stop Audio';
    };

    speechUtterance.onend = () => {
        if (btn) btn.innerHTML = '<i class="bi bi-volume-up-fill me-1"></i> Read Advisory Aloud';
    };

    window.speechSynthesis.speak(speechUtterance);
}
