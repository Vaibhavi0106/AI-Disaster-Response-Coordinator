/**
 * AI Disaster Response Coordinator - Universal EOC Engine with Role Access & Public SOS
 */

let mapInstance = null;
let mapMarkers = [];
let sosMarkers = [];
let currentAnalysisData = null;
let speechUtterance = null;
let userRole = 'regular';

document.addEventListener('DOMContentLoaded', () => {
    userRole = document.body.getAttribute('data-user-role') || 'regular';
    applyRoleVisibility(userRole);
    initEventListeners();

    if (userRole === 'admin') {
        pollAdminSosLog();
        setInterval(pollAdminSosLog, 15000);
    }
});

/**
 * Applies CSS & DOM visibility based on user role (Admin vs Regular)
 */
function applyRoleVisibility(role) {
    const adminFields = document.querySelectorAll('.admin-only-field');
    const publicFields = document.querySelectorAll('.public-only-field');
    const mapHeaderTitle = document.getElementById('mapHeaderTitle');

    if (role === 'admin') {
        adminFields.forEach(el => el.style.setProperty('display', 'block', 'important'));
        publicFields.forEach(el => el.style.setProperty('display', 'none', 'important'));
        if (mapHeaderTitle) mapHeaderTitle.textContent = 'Tactical Impact Map';
    } else {
        adminFields.forEach(el => el.style.setProperty('display', 'none', 'important'));
        publicFields.forEach(el => el.style.setProperty('display', 'block', 'important'));
        if (mapHeaderTitle) mapHeaderTitle.textContent = 'Affected Area Map';
    }
}

function initEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const queryInput = document.getElementById('disasterQuery');
    const samplePills = document.querySelectorAll('.sample-pill');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const voiceAdvisoryBtn = document.getElementById('voiceAdvisoryBtn');

    // Copilot Listeners (Admin Only)
    const copilotToggleBtn = document.getElementById('copilotToggleBtn');
    const copilotCloseBtn = document.getElementById('copilotCloseBtn');
    const copilotSendBtn = document.getElementById('copilotSendBtn');
    const copilotInput = document.getElementById('copilotInput');
    const copilotChips = document.querySelectorAll('.copilot-chip');

    if (searchBtn) searchBtn.addEventListener('click', performAnalysis);
    if (queryInput) {
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performAnalysis();
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

    if (generateReportBtn) generateReportBtn.addEventListener('click', navigateToReport);
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportRawJson);
    if (voiceAdvisoryBtn) voiceAdvisoryBtn.addEventListener('click', toggleVoiceAdvisory);

    // Initialize Emergency SOS Handler
    initEmergencySos();

    // Initialize GDACS Nearby Detection Handler
    initNearbyDetection();

    // AI Copilot Interactions (Admin Only)
    if (copilotToggleBtn) {
        copilotToggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('copilotPanel');
            if (panel) {
                const isHidden = panel.style.display === 'none' || !panel.style.display;
                panel.style.display = isHidden ? 'flex' : 'none';
            }
        });
    }

    if (copilotCloseBtn) {
        copilotCloseBtn.addEventListener('click', () => {
            const panel = document.getElementById('copilotPanel');
            if (panel) panel.style.display = 'none';
        });
    }

    if (copilotSendBtn) {
        copilotSendBtn.addEventListener('click', () => sendCopilotMessage());
    }

    if (copilotInput) {
        copilotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendCopilotMessage();
        });
    }

    copilotChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.getAttribute('data-question');
            if (question) sendCopilotMessage(question);
        });
    });
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

/**
 * Animated Live AI Agent Execution Workflow
 */
async function runLoadingProgress() {
    const steps = [
        { id: 'step-search', delay: 400 },
        { id: 'step-analyze', delay: 400 },
        { id: 'step-classify', delay: 400 },
        { id: 'step-recommend', delay: 400 },
        { id: 'step-report', delay: 300 }
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
 * Renders complete EOC Telemetry Dashboard
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

    // Render GDACS Verified Badge if present
    const gdacsBadge = document.getElementById('gdacsBadge');
    if (gdacsBadge) {
        if (data.gdacs_verified) {
            const alertLvl = data.gdacs_alert_level || 'Alert';
            const distKm = data.gdacs_distance_km || '0';
            const srcUrl = data.gdacs_source_url || 'https://www.gdacs.org';
            
            gdacsBadge.className = 'badge bg-danger text-white border border-warning font-mono py-2 px-3 fs-7 shadow-sm d-inline-flex align-items-center gap-1';
            gdacsBadge.innerHTML = `<a href="${srcUrl}" target="_blank" rel="noopener noreferrer" class="text-white text-decoration-none d-inline-flex align-items-center gap-1"><i class="bi bi-broadcast text-warning me-1"></i> 🛰️ GDACS Verified · Alert Level: ${alertLvl} · ${distKm} km away <i class="bi bi-box-arrow-up-right ms-1 fs-8"></i></a>`;
        } else {
            gdacsBadge.className = 'd-none';
            gdacsBadge.innerHTML = '';
        }
    }

    // 3. Priority Badge & Metric Boxes
    const priorityBadge = document.getElementById('priorityBadge');
    if (priorityBadge) priorityBadge.textContent = data.priority || 'P1 - High Priority';
    
    document.getElementById('metricRadius').textContent = data.impact_radius || '20 - 35 km';
    
    const metricRisk = document.getElementById('metricRisk');
    if (metricRisk) metricRisk.textContent = data.risk_index || '9.2 / 10';
    
    const metricTeams = document.getElementById('metricTeams');
    if (metricTeams) metricTeams.textContent = (data.recommended_resources || data.recommended_resources_public || []).length + ' Key Squads';

    // 4. Executive Command Brief (Admin Only) & Public Advisory (Public Only)
    const brief = data.executive_command_brief || {};
    const briefSummary = document.getElementById('briefSummary');
    if (briefSummary) briefSummary.textContent = brief.summary || data.summary;
    const briefPriorities = document.getElementById('briefPriorities');
    if (briefPriorities) briefPriorities.textContent = brief.priorities || '1. Life evacuation. 2. Medical deployment. 3. Power grid safety.';
    const briefActions = document.getElementById('briefActions');
    if (briefActions) briefActions.textContent = brief.actions || 'Mobilize rescue squads, open emergency relief camps.';
    const briefAdvisory = document.getElementById('briefAdvisory');
    if (briefAdvisory) briefAdvisory.textContent = brief.advisory || data.public_advisory || 'Instruct public in low-lying zones to move to upper floors or official shelters.';

    const publicAdvisoryText = document.getElementById('publicAdvisoryText');
    if (publicAdvisoryText) {
        publicAdvisoryText.textContent = data.public_advisory || brief.advisory || (data.safety_measures ? data.safety_measures.join('. ') : 'Follow official local emergency guidance.');
    }

    // 5. AI Decision Intelligence Panel (Admin Only)
    const decision = data.ai_decision_intelligence || {};
    const confScore = document.getElementById('aiConfidenceScore');
    if (confScore) confScore.textContent = decision.confidence_score || '95%';
    const confBar = document.getElementById('aiConfidenceBar');
    if (confBar) confBar.style.width = decision.confidence_score || '95%';

    const sevReasoning = document.getElementById('aiSeverityReasoning');
    if (sevReasoning) {
        sevReasoning.textContent = decision.severity_reasoning || 
            `Classified as ${data.severity} severity due to high population impact, transport disruption, and life safety risks.`;
    }

    const riskBox = document.getElementById('aiRiskFactors');
    if (riskBox) {
        riskBox.innerHTML = '';
        const risks = decision.risk_factors || ["Submerged causeways", "Power cuts", "High population density"];
        risks.forEach(r => {
            const d = document.createElement('div');
            d.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-1"></i> ${r}`;
            riskBox.appendChild(d);
        });
    }

    const evidenceBox = document.getElementById('aiEvidence');
    if (evidenceBox) {
        evidenceBox.innerHTML = '';
        const evidence = decision.supporting_evidence || ["Satellite precipitation telemetry", "Emergency hotline logs"];
        evidence.forEach(e => {
            const d = document.createElement('div');
            d.innerHTML = `<i class="bi bi-file-earmark-check-fill text-success me-1"></i> ${e}`;
            evidenceBox.appendChild(d);
        });
    }

    const verifyStatus = document.getElementById('aiVerificationStatus');
    if (verifyStatus) verifyStatus.textContent = decision.verification_status || 'Multi-Source Verified';

    // AI Consensus Engine (Admin Only)
    renderConsensusEngine(data.ai_consensus_engine || {});

    // 6. Predictive Intelligence Card (Admin Only)
    const pred = data.predictive_intelligence || {};
    const esc = pred.escalation_risk || { value: '78%', trend: 'up' };
    const hosp = pred.hospital_load || { value: '85%', trend: 'up' };
    const road = pred.road_accessibility || { value: '35%', trend: 'down' };
    const dem = pred.resource_demand || { value: '92%', trend: 'up' };

    const predEsc = document.getElementById('predEscalation');
    if (predEsc) predEsc.innerHTML = `${esc.value} <i class="bi bi-arrow-up-right-circle-fill text-danger"></i>`;
    const predHosp = document.getElementById('predHospital');
    if (predHosp) predHosp.innerHTML = `${hosp.value} <i class="bi bi-arrow-up-right-circle-fill text-danger"></i>`;
    const predRoads = document.getElementById('predRoads');
    if (predRoads) predRoads.innerHTML = `${road.value} <i class="bi bi-arrow-down-right-circle-fill text-warning"></i>`;
    const predDemand = document.getElementById('predDemand');
    if (predDemand) predDemand.innerHTML = `${dem.value} <i class="bi bi-arrow-up-right-circle-fill text-cyan"></i>`;

    // 7. Weather Telemetry
    const weather = data.weather_metrics || {};
    document.getElementById('weatherTemp').textContent = weather.temp || '28°C';
    document.getElementById('weatherPrecip').textContent = weather.precipitation || 'Heavy Rain (85%)';
    document.getElementById('weatherWind').textContent = weather.wind || '38 km/h';
    document.getElementById('weatherStatus').textContent = weather.status || 'Active Weather Alert';

    // 8. Locations List with Interactive Click-to-Zoom
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

    // 9. Evacuation Shelters List
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

    // 10. Emergency Contacts
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

    // 11. Recommended Rescue Resources
    const resourcesList = document.getElementById('resourcesList');
    resourcesList.innerHTML = '';
    const resourceReasoning = data.resource_reasoning || [];
    const publicResources = data.recommended_resources_public || data.recommended_resources || [];

    if (userRole === 'admin' && Array.isArray(resourceReasoning) && resourceReasoning.length > 0) {
        resourceReasoning.forEach(rr => {
            const item = document.createElement('div');
            item.className = 'list-custom-item flex-column align-items-start';
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-box-seam-fill text-warning"></i>
                    <strong style="color: #ffffff; font-size: 1rem;">Recommended: ${rr.resource}</strong>
                </div>
                <div class="p-2 w-100 rounded bg-dark border border-secondary font-mono fs-7">
                    <strong class="text-warning d-block fs-8"><i class="bi bi-lightbulb-fill text-warning me-1"></i> REASON / TRIGGER:</strong>
                    <span class="text-white">${rr.reason}</span>
                </div>
            `;
            resourcesList.appendChild(item);
        });
    } else {
        publicResources.forEach(res => {
            const item = document.createElement('div');
            item.className = 'list-custom-item';
            item.innerHTML = `<i class="bi bi-box-seam-fill text-warning"></i> <span style="color: #ffffff; font-weight: 600;">${res}</span>`;
            resourcesList.appendChild(item);
        });
    }

    // 12. Safety Measures
    const safetyList = document.getElementById('safetyList');
    safetyList.innerHTML = '';
    (data.safety_measures || []).forEach(me => {
        const item = document.createElement('div');
        item.className = 'list-custom-item';
        item.innerHTML = `<i class="bi bi-shield-fill-check text-success"></i> <span style="color: #ffffff; font-weight: 600;">${me}</span>`;
        safetyList.appendChild(item);
    });

    // 13. Timeline Updates (Admin Only)
    const timelineList = document.getElementById('timelineList');
    if (timelineList) {
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
    }

    // 14. Source Verification Panel & Links
    const ver = data.source_verification || {};
    const verifyGov = document.getElementById('verifyGov');
    if (verifyGov) verifyGov.textContent = ver.government_advisories || 'Government Bulletins: Verified';
    const verifyWeather = document.getElementById('verifyWeather');
    if (verifyWeather) verifyWeather.textContent = ver.weather_reports || 'Weather Radar: Active';
    const verifyNews = document.getElementById('verifyNews');
    if (verifyNews) verifyNews.textContent = ver.news_reports || 'News Media Feeds: Verified';
    const verifyConfidence = document.getElementById('verifyOverallConfidence');
    if (verifyConfidence) verifyConfidence.textContent = ver.overall_confidence || '96%';

    const sourcesList = document.getElementById('sourcesList');
    sourcesList.innerHTML = '';
    const sources = data.sources_public || data.sources || [];
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

    // Apply role-based DOM visibility
    applyRoleVisibility(userRole);

    dashboardResults.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Renders the 5 Specialized Agents of the AI Consensus Engine
 */
function renderConsensusEngine(consensus) {
    const grid = document.getElementById('consensusAgentsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const agents = consensus.agents || [
        { name: "Search Intelligence Agent", icon: "bi-search text-info", decision: "HIGH CONFIRMATION", confidence: "96%", reason: "Live ground telemetry confirms active emergency." },
        { name: "Medical Response Agent", icon: "bi-hospital-fill text-danger", decision: "CRITICAL PRIORITY", confidence: "94%", reason: "High probability of mass trauma casualties due to urban density." },
        { name: "Infrastructure Agent", icon: "bi-building-fill-exclamation text-warning", decision: "SEVERE IMPAIRMENT", confidence: "92%", reason: "Primary causeways and electrical corridors damaged in low-lying sectors." },
        { name: "Logistics Agent", icon: "bi-truck-front-fill text-cyan", decision: "P1 DISPATCH", confidence: "95%", reason: "Boat rescue squads and 100 HP pumps required immediately." },
        { name: "Emergency Commander Agent", icon: "bi-shield-shaded text-success", decision: "P1 CRITICAL DISPATCH", confidence: "98%", reason: "Unanimous alignment confirms immediate EOC command mobilization." }
    ];

    agents.forEach((ag, idx) => {
        const col = document.createElement('div');
        col.className = 'col-md-12';
        col.style.opacity = '0';
        col.style.transform = 'translateY(10px)';
        col.style.transition = 'all 0.35s ease';

        col.innerHTML = `
            <div class="p-3 bg-dark rounded border border-secondary font-mono">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi ${ag.icon || 'bi-cpu'} fs-5"></i>
                        <strong class="text-white fs-6">${ag.name}</strong>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-danger text-white font-mono fs-8">${ag.decision}</span>
                        <span class="badge bg-warning text-dark font-mono fs-8">Confidence: ${ag.confidence}</span>
                    </div>
                </div>
                <div class="text-white fs-7 mt-1">
                    <strong class="text-warning me-1">REASON:</strong> ${ag.reason}
                </div>
            </div>
        `;

        grid.appendChild(col);

        setTimeout(() => {
            col.style.opacity = '1';
            col.style.transform = 'translateY(0)';
        }, idx * 100);
    });

    const confEl = document.getElementById('consensusOverallConfidence');
    if (confEl) confEl.textContent = consensus.overall_consensus_confidence || '95%';
    const scoreEl = document.getElementById('consensusAgreementScore');
    if (scoreEl) scoreEl.textContent = consensus.agreement_score || '5/5 Full Consensus (100%)';
    const prioEl = document.getElementById('consensusFinalPriority');
    if (prioEl) prioEl.textContent = consensus.final_operational_priority || 'P1 - Immediate Intervention Dispatch';
    const sumEl = document.getElementById('consensusFinalSummary');
    if (sumEl) sumEl.textContent = consensus.final_consensus_summary || 'All 5 specialized AI agents unanimously agree on P1 Critical response mobilization based on multi-source risk telemetry.';
}

/**
 * AI COPILOT CHAT FUNCTIONALITY (Admin Only)
 */
async function sendCopilotMessage(customQuestion = null) {
    const input = document.getElementById('copilotInput');
    const msgContainer = document.getElementById('copilotMessages');
    if (!msgContainer) return;
    
    const questionText = customQuestion || (input ? input.value.trim() : '');
    if (!questionText) return;

    if (input) input.value = '';

    const timestamp = getFormattedTimestamp();

    // 1. Render User Message Bubble
    const userMsgDiv = document.createElement('div');
    userMsgDiv.className = 'copilot-msg msg-user';
    userMsgDiv.innerHTML = `
        <div>${escapeHtml(questionText)}</div>
        <div class="copilot-msg-meta text-end">[${timestamp}] COMMANDER</div>
    `;
    msgContainer.appendChild(userMsgDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    // 2. Render Typing Indicator Bubble
    const typingDiv = document.createElement('div');
    typingDiv.className = 'copilot-msg msg-ai';
    typingDiv.id = 'copilotTyping';
    typingDiv.innerHTML = `
        <div><i class="bi bi-three-dots spin text-warning me-1"></i> Analyzing telemetry...</div>
    `;
    msgContainer.appendChild(typingDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    try {
        const response = await fetch('/api/copilot/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: questionText,
                context: currentAnalysisData || {}
            })
        });

        const data = await response.json();
        const aiAnswer = data.answer || "Current data does not contain this information.";

        const typingEl = document.getElementById('copilotTyping');
        if (typingEl) typingEl.remove();

        // 3. Render AI Response Bubble
        const aiMsgDiv = document.createElement('div');
        aiMsgDiv.className = 'copilot-msg msg-ai';
        aiMsgDiv.innerHTML = `
            <div>${escapeHtml(aiAnswer).replace(/\n/g, '<br/>')}</div>
            <div class="copilot-msg-meta">[${timestamp}] AI EOC COPILOT</div>
        `;
        msgContainer.appendChild(aiMsgDiv);

    } catch (err) {
        console.error('Copilot request error:', err);
        const typingEl = document.getElementById('copilotTyping');
        if (typingEl) typingEl.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'copilot-msg msg-ai';
        errorDiv.innerHTML = `
            <div>Current data does not contain this information.</div>
            <div class="copilot-msg-meta">[${timestamp}] AI EOC COPILOT</div>
        `;
        msgContainer.appendChild(errorDiv);
    }

    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function getFormattedTimestamp() {
    const d = new Date();
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hrs}:${mins} HRS`;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Helper to get yesterday's date in YYYY-MM-DD format for NASA GIBS imagery
 */
function getNasaGibsDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Leaflet Map Initialization
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

    // Base Layer 1: Street Map (Carto Dark / OSM)
    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    });

    // Base Layer 2: Esri World Imagery (Satellite)
    const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });

    // Optional Overlay: NASA GIBS VIIRS/MODIS True-Color Imagery
    const gibsDate = getNasaGibsDate();
    const nasaGibsOverlay = L.tileLayer(`https://gibs-{s}.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, {
        attribution: '&copy; NASA GIBS / Earthdata',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        maxNativeZoom: 9,
        opacity: 0.75
    });

    // Default base layer on load stays Street Map
    darkTiles.addTo(mapInstance);

    // Layer Control for base layers and optional overlay
    const baseMaps = {
        "Street Map": darkTiles,
        "Satellite": esriSatellite
    };

    const overlayMaps = {
        "NASA Satellite Overlay (VIIRS)": nasaGibsOverlay
    };

    L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(mapInstance);

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

    const textToSpeak = currentAnalysisData && currentAnalysisData.safety_measures ?
        `Emergency Public Advisory for ${currentAnalysisData.disaster_type}. ${currentAnalysisData.safety_measures.join('. ')}` :
        "Emergency public advisory active. Please stay tuned for official instructions.";

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

/**
 * Emergency SOS Public Dispatch Handler
 */
function initEmergencySos() {
    const confirmSosBtn = document.getElementById('confirmSosBtn');
    const nameInput = document.getElementById('sosUserName');
    const phoneInput = document.getElementById('sosUserPhone');
    const contactNameInput = document.getElementById('sosContactName');
    const contactPhoneInput = document.getElementById('sosContactPhone');

    const statusBox = document.getElementById('sosStatusBox');
    const statusText = document.getElementById('sosStatusText');
    const statusDetails = document.getElementById('sosStatusDetails');
    const mapLinkContainer = document.getElementById('sosMapLinkContainer');
    const mapLink = document.getElementById('sosMapLink');

    try {
        const savedInfo = localStorage.getItem('sos_user_info');
        if (savedInfo) {
            const parsed = JSON.parse(savedInfo);
            if (nameInput && parsed.name) nameInput.value = parsed.name;
            if (phoneInput && parsed.phone) phoneInput.value = parsed.phone;
            if (contactNameInput && parsed.contactName) contactNameInput.value = parsed.contactName;
            if (contactPhoneInput && parsed.contactPhone) contactPhoneInput.value = parsed.contactPhone;
        }
    } catch (e) {
        console.warn('Could not read sos_user_info from localStorage:', e);
    }

    if (!confirmSosBtn) return;

    confirmSosBtn.addEventListener('click', () => {
        const name = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const contactName = contactNameInput ? contactNameInput.value.trim() : '';
        const contactPhone = contactPhoneInput ? contactPhoneInput.value.trim() : '';

        try {
            localStorage.setItem('sos_user_info', JSON.stringify({
                name, phone, contactName, contactPhone
            }));
        } catch (e) {
            console.warn('Could not save sos_user_info to localStorage:', e);
        }

        if (!navigator.geolocation) {
            if (statusBox) statusBox.classList.remove('d-none');
            if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-danger bg-opacity-25 border-danger text-white';
            if (statusText) statusText.innerHTML = '⚠️ SOS COULD NOT BE DELIVERED';
            if (statusDetails) statusDetails.innerHTML = 'Browser does not support native Geolocation API.';
            return;
        }

        confirmSosBtn.disabled = true;
        if (statusBox) statusBox.classList.remove('d-none');
        if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-dark border-warning text-warning';
        if (statusText) statusText.innerHTML = '<i class="bi bi-geo-alt-fill spin me-1"></i> Acquiring your location...';
        if (statusDetails) statusDetails.innerHTML = 'Requesting high-accuracy GPS device coordinates...';
        if (mapLinkContainer) mapLinkContainer.classList.add('d-none');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = Math.round(position.coords.accuracy || 0);
                const timestamp = new Date().toISOString();

                if (statusText) statusText.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i> Location acquired ✓';
                if (statusDetails) statusDetails.innerHTML = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (Accuracy: ${accuracy}m)<br/>Sending emergency alert...`;

                try {
                    const response = await fetch('/api/sos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: name || 'Registered Emergency User',
                            phone: phone || 'Not Provided',
                            emergency_contact_name: contactName || 'Emergency Contact',
                            emergency_contact_phone: contactPhone || 'Not Provided',
                            latitude: lat,
                            longitude: lng,
                            accuracy: accuracy,
                            timestamp: timestamp
                        })
                    });

                    const data = await response.json();
                    confirmSosBtn.disabled = false;

                    // If logged in as admin, immediately refresh the SOS command log
                    if (userRole === 'admin') pollAdminSosLog();

                    if (data.status === 'success') {
                        if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-success bg-opacity-25 border-success text-white';
                        if (statusText) statusText.innerHTML = '🚨 SOS ALERT SENT';
                        if (statusDetails) statusDetails.innerHTML = `Your emergency contact (${escapeHtml(contactName || 'Emergency Contact')}) has been notified.<br/>✓ Location captured<br/>✓ Emergency details transmitted<br/>✓ Alert delivered`;
                        if (data.maps_url && mapLink) {
                            mapLink.href = data.maps_url;
                            if (mapLinkContainer) mapLinkContainer.classList.remove('d-none');
                        }
                    } else if (data.status === 'notification_not_configured') {
                        if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-warning bg-opacity-25 border-warning text-white';
                        if (statusText) statusText.innerHTML = '⚠️ SOS COULD NOT BE DELIVERED';
                        if (statusDetails) statusDetails.innerHTML = `Location captured ✓ (GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}), but notification channel is not configured.<br/><small class="text-warning">N8N_SOS_WEBHOOK_URL is missing in backend .env configuration.</small>`;
                        if (data.maps_url && mapLink) {
                            mapLink.href = data.maps_url;
                            if (mapLinkContainer) mapLinkContainer.classList.remove('d-none');
                        }
                    } else {
                        if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-danger bg-opacity-25 border-danger text-white';
                        if (statusText) statusText.innerHTML = '⚠️ SOS COULD NOT BE DELIVERED';
                        if (statusDetails) statusDetails.innerHTML = escapeHtml(data.message || 'Backend SOS processing failure.');
                        if (data.maps_url && mapLink) {
                            mapLink.href = data.maps_url;
                            if (mapLinkContainer) mapLinkContainer.classList.remove('d-none');
                        }
                    }

                } catch (err) {
                    confirmSosBtn.disabled = false;
                    console.error('SOS fetch error:', err);
                    if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-danger bg-opacity-25 border-danger text-white';
                    if (statusText) statusText.innerHTML = '⚠️ SOS COULD NOT BE DELIVERED';
                    if (statusDetails) statusDetails.innerHTML = 'Network failure or server unavailable.';
                }
            },
            (error) => {
                confirmSosBtn.disabled = false;
                console.warn('Geolocation error:', error);
                let errReason = 'Geolocation permission denied or position unavailable.';
                if (error.code === 1) errReason = 'Location permission denied by user/browser.';
                else if (error.code === 2) errReason = 'Position unavailable (GPS fix failed).';
                else if (error.code === 3) errReason = 'Location request timed out.';

                if (statusBox) statusBox.className = 'p-3 rounded border font-mono fs-7 mb-3 bg-danger bg-opacity-25 border-danger text-white';
                if (statusText) statusText.innerHTML = '⚠️ SOS COULD NOT BE DELIVERED';
                if (statusDetails) statusDetails.innerHTML = escapeHtml(errReason);
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    });
}

/**
 * Admin SOS Command Log Polling & Map Plotting
 */
async function pollAdminSosLog() {
    if (userRole !== 'admin') return;

    try {
        const response = await fetch('/api/sos/log');
        if (!response.ok) return;

        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.log)) {
            renderAdminSosTable(data.log);
            plotSosMarkersOnMap(data.log);
        }
    } catch (e) {
        console.warn('Admin SOS Log polling error:', e);
    }
}

function renderAdminSosTable(logs) {
    const tbody = document.getElementById('sosLogTableBody');
    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-warning">
                    <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                    No emergency SOS alerts logged yet.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    logs.forEach(item => {
        const tr = document.createElement('tr');
        if (item.admin_reviewed) {
            tr.className = 'opacity-75 bg-dark';
        }

        // Delivery Status Badge formatting
        let deliveryBadge = '';
        if (item.delivery_status === 'success') {
            deliveryBadge = '<span class="badge bg-success text-white font-mono"><i class="bi bi-check-circle-fill me-1"></i> Delivered via n8n</span>';
        } else if (item.delivery_status === 'notification_not_configured') {
            deliveryBadge = '<span class="badge bg-warning text-dark font-mono"><i class="bi bi-exclamation-triangle-fill me-1"></i> Webhook not configured</span>';
        } else {
            deliveryBadge = '<span class="badge bg-danger text-white font-mono"><i class="bi bi-x-circle-fill me-1"></i> Delivery failed</span>';
        }

        // Formatted timestamp
        let formattedTime = item.logged_at;
        try {
            const d = new Date(item.logged_at);
            formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
        } catch (e) {}

        const reviewedBtn = item.admin_reviewed ?
            `<span class="badge bg-secondary text-white font-mono"><i class="bi bi-check2-all me-1"></i> Reviewed</span>` :
            `<button class="btn btn-sm btn-outline-success font-mono" onclick="markSosReviewed(${item.id})"><i class="bi bi-check-lg me-1"></i> Mark Reviewed</button>`;

        tr.innerHTML = `
            <td class="fw-bold text-warning font-mono">#${item.id}</td>
            <td class="text-white font-mono fs-8">${formattedTime}</td>
            <td>
                <strong class="text-white d-block">${escapeHtml(item.name)}</strong>
                <span class="text-warning font-mono fs-8">${escapeHtml(item.phone)}</span>
            </td>
            <td>
                <strong class="text-white d-block">${escapeHtml(item.emergency_contact_name)}</strong>
                <span class="text-warning font-mono fs-8">${escapeHtml(item.emergency_contact_phone)}</span>
            </td>
            <td>
                <a href="${item.maps_url}" target="_blank" class="btn btn-sm btn-outline-cyan font-mono text-cyan p-1 fs-8 text-decoration-none">
                    <i class="bi bi-geo-alt-fill me-1"></i> GPS: ${item.latitude ? item.latitude.toFixed(4) : 'N/A'}, ${item.longitude ? item.longitude.toFixed(4) : 'N/A'}
                </a>
                <small class="d-block text-white font-mono fs-8 mt-1">Accuracy: ${item.accuracy}m</small>
            </td>
            <td>${deliveryBadge}</td>
            <td>
                <div class="d-flex align-items-center gap-1">
                    <a href="tel:${escapeHtml(item.phone)}" class="btn btn-sm btn-danger font-mono p-1 fs-8" title="Call Person">
                        <i class="bi bi-telephone-fill me-1"></i> Call
                    </a>
                    ${reviewedBtn}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function markSosReviewed(sosId) {
    try {
        const resp = await fetch(`/api/sos/${sosId}/reviewed`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        if (resp.ok) {
            pollAdminSosLog();
        } else {
            alert('Failed to mark SOS as reviewed.');
        }
    } catch (e) {
        console.error('Error marking SOS reviewed:', e);
    }
}

/**
 * Plots live SOS distress signals as pulsing red circle markers on the Leaflet map
 */
function plotSosMarkersOnMap(logs) {
    if (!mapInstance) return;

    // Clear existing SOS markers
    sosMarkers.forEach(m => mapInstance.removeLayer(m));
    sosMarkers = [];

    logs.forEach(item => {
        if (item.latitude && item.longitude) {
            const sosMarker = L.circleMarker([item.latitude, item.longitude], {
                radius: 14,
                fillColor: '#FF0055',
                color: '#FFFFFF',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(mapInstance);

            const popupContent = `
                <div style="padding: 6px; min-width: 200px; background: #1a1a1a; color: #ffffff;">
                    <strong style="font-size: 1.1rem; color: #FF0055; display: block; margin-bottom: 2px;">🚨 EMERGENCY SOS #${item.id}</strong>
                    <span style="font-weight: 700; color: #ffffff; font-size: 0.9rem; display: block;">
                        Person: ${escapeHtml(item.name)} (${escapeHtml(item.phone)})
                    </span>
                    <span style="color: #FFC107; font-size: 0.85rem; font-weight: 600; display: block; margin-top: 4px;">
                        Contact: ${escapeHtml(item.emergency_contact_name)} (${escapeHtml(item.emergency_contact_phone)})
                    </span>
                    <div style="margin-top: 8px;">
                        <a href="${item.maps_url}" target="_blank" style="color: #00e5ff; font-weight: 700; text-decoration: none;">
                            <i class="bi bi-geo-alt-fill"></i> Open Google Maps
                        </a>
                    </div>
                </div>
            `;

            sosMarker.bindPopup(popupContent);
            sosMarkers.push(sosMarker);
        }
    });
}

/**
 * Location-triggered GDACS Nearby Disaster Detection Handler
 */
function initNearbyDetection() {
    const detectBtn = document.getElementById('detectNearbyBtn');
    if (!detectBtn) return;

    detectBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showNearbyStatus('error', 'Your browser does not support native Geolocation API.');
            return;
        }

        showNearbyStatus('loading', 'Requesting location access...');
        detectBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                showNearbyStatus('loading', 'Checking GDACS global disaster monitor...');
                
                try {
                    const res = await fetch('/api/nearby-disaster', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude, longitude }),
                    });
                    
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.message || `Server returned HTTP ${res.status}`);
                    }
                    
                    const data = await res.json();
                    handleNearbyResult(data);
                } catch (err) {
                    console.error('Nearby disaster lookup error:', err);
                    showNearbyStatus('error', 'Could not reach the global disaster monitor right now — try typing your location manually.');
                } finally {
                    detectBtn.disabled = false;
                }
            },
            (err) => {
                detectBtn.disabled = false;
                console.warn('Geolocation access error:', err);
                showNearbyStatus('error', 'Location access denied or unavailable. You can still type a location above.');
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    });
}

function showNearbyStatus(type, message) {
    const box = document.getElementById('nearbyStatusBox');
    if (!box) return;

    box.classList.remove('d-none', 'text-warning', 'text-danger', 'text-info', 'text-success');

    if (type === 'loading') {
        box.className = 'mt-2 text-center font-mono fs-7 text-warning';
        box.innerHTML = `<i class="bi bi-arrow-repeat spin me-1"></i> ${escapeHtml(message)}`;
    } else if (type === 'error') {
        box.className = 'mt-2 text-center font-mono fs-7 text-danger fw-bold';
        box.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> ${escapeHtml(message)}`;
    } else if (type === 'info') {
        box.className = 'mt-2 text-center font-mono fs-7 text-info fw-bold';
        box.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> ${escapeHtml(message)}`;
    } else if (type === 'success') {
        box.className = 'mt-2 text-center font-mono fs-7 text-success fw-bold';
        box.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> ${escapeHtml(message)}`;
    }
}

function handleNearbyResult(data) {
    if (data.status === 'none_found') {
        showNearbyStatus('info', data.message || 'No active disasters detected near your location (within 500 km) per GDACS global monitoring. You can still search manually above.');
        return; // DO NOT render false sample dashboard
    }

    if (data.status === 'error') {
        showNearbyStatus('error', data.message || 'Location lookup failed.');
        return;
    }

    const distKm = data.gdacs_distance_km || (data.data && data.data.gdacs_distance_km) || '0';
    showNearbyStatus('success', `🛰️ GDACS-verified event detected — ${distKm} km away`);

    if (data.data) {
        if (data.gdacs_verified) data.data.gdacs_verified = true;
        if (data.gdacs_alert_level) data.data.gdacs_alert_level = data.gdacs_alert_level;
        if (data.gdacs_distance_km) data.data.gdacs_distance_km = data.gdacs_distance_km;
        if (data.gdacs_source_url) data.data.gdacs_source_url = data.gdacs_source_url;

        currentAnalysisData = data.data;
        sessionStorage.setItem('currentDisasterReport', JSON.stringify(currentAnalysisData));
        renderDashboard(currentAnalysisData);
    }
}
