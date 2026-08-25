/**
 * Offline AI Survival Assistant (Transformers.js SmolLM2-360M-Instruct)
 * 100% Client-Side In-Browser Inference Grounded on Verified FIRST_AID_GUIDE Data
 */

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct';
let generator = null;

/**
 * Pre-download & Cache Model for Offline Browser Use
 */
async function prepareOfflineAssistant(onProgress) {
    if (!window.__transformersPipeline) {
        throw new Error('Transformers.js library CDN script has not loaded yet.');
    }

    // Graceful hardware detection (WebGPU preferred, WASM fallback)
    const device = (navigator.gpu) ? 'webgpu' : 'wasm';
    console.log(`[Offline Bot] Initializing model '${MODEL_ID}' on device: ${device}`);

    generator = await window.__transformersPipeline('text-generation', MODEL_ID, {
        device,
        dtype: 'q4', // Quantized for low memory & small download (~250MB)
        progress_callback: (p) => {
            if (p.status === 'progress' && typeof onProgress === 'function') {
                const percent = Math.round(p.progress || 0);
                const file = p.file || 'model.onnx';
                onProgress(percent, file);
            }
        },
    });

    localStorage.setItem('offline_assistant_ready', 'true');
    return true;
}

function isOfflineAssistantReady() {
    return localStorage.getItem('offline_assistant_ready') === 'true' && generator !== null;
}

/**
 * Retrieval Grounding over FIRST_AID_GUIDE Knowledge Base
 */
function retrieveRelevantEntries(userQuestion, maxResults = 2) {
    if (typeof FIRST_AID_GUIDE === 'undefined') return [];

    const terms = userQuestion.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    if (terms.length === 0) return [];

    const scored = [];

    // Search Medical Categories
    if (Array.isArray(FIRST_AID_GUIDE.categories)) {
        for (const cat of FIRST_AID_GUIDE.categories) {
            const haystack = (cat.label + ' ' + (cat.steps || []).join(' ')).toLowerCase();
            const score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
            if (score > 0) {
                scored.push({ label: cat.label, steps: cat.steps || [], score });
            }
        }
    }

    // Search Disaster Survival Tips
    if (FIRST_AID_GUIDE.by_disaster && typeof FIRST_AID_GUIDE.by_disaster === 'object') {
        for (const [disaster, tips] of Object.entries(FIRST_AID_GUIDE.by_disaster)) {
            const haystack = (disaster.replace(/_/g, ' ') + ' ' + (tips || []).join(' ')).toLowerCase();
            const score = terms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
            if (score > 0) {
                const label = disaster.replace(/_/g, ' ').toUpperCase() + ' SURVIVAL';
                scored.push({ label, steps: tips || [], score });
            }
        }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Grounded Q&A Generation
 */
async function askOfflineAssistant(userQuestion) {
    const matches = retrieveRelevantEntries(userQuestion);

    // Grounding Check: If no relevant first-aid entry matches the question, DECLINE!
    if (matches.length === 0) {
        return "I don't have verified guidance on that in my offline first-aid database. " +
               "If this is an emergency, use the SOS button or call the emergency hotlines above.";
    }

    // Fallback: If AI model is not downloaded/ready, return retrieved first-aid steps verbatim
    if (!isOfflineAssistantReady()) {
        const verbatimText = matches.map(m => `[${m.label}]\n` + m.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')).join('\n\n');
        return `*(Offline Search Result — Model not downloaded)*\n\n${verbatimText}`;
    }

    // Model Grounded Generation
    try {
        const context = matches.map(m => `${m.label}: ${m.steps.join(' ')}`).join('\n');
        const systemPrompt =
            "You are an offline emergency first-aid assistant. ONLY use the reference " +
            "information given below to answer. Do not add steps, dosages, or medical " +
            "details that are not in the reference. Keep the answer short and calm. If the " +
            "reference doesn't fully cover the question, say so plainly and recommend " +
            "calling emergency services.\n\nReference:\n" + context;

        const output = await generator([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuestion },
        ], { max_new_tokens: 200, temperature: 0.3 });

        if (Array.isArray(output) && output[0] && output[0].generated_text) {
            const gen = output[0].generated_text;
            if (Array.isArray(gen)) {
                return gen.at(-1).content;
            } else if (typeof gen === 'string') {
                return gen;
            }
        }
        
        return matches.map(m => `[${m.label}]\n` + m.steps.join('\n')).join('\n\n');
    } catch (e) {
        console.error('[Offline Bot] Model generation error, falling back to retrieval:', e);
        return matches.map(m => `[${m.label}]\n` + m.steps.join('\n')).join('\n\n');
    }
}

/**
 * UI Event Handling & Chat Message Renderer
 */
document.addEventListener('DOMContentLoaded', () => {
    initOfflineBotUI();
});

function initOfflineBotUI() {
    const prepareBtn = document.getElementById('prepareOfflineModelBtn');
    const progressContainer = document.getElementById('modelProgressContainer');
    const progressBar = document.getElementById('modelProgressBar');
    const progressText = document.getElementById('modelProgressText');
    const badgeContainer = document.getElementById('modelStatusBadgeContainer');

    const chatMessages = document.getElementById('offlineChatMessages');
    const chatInput = document.getElementById('offlineChatInput');
    const chatSendBtn = document.getElementById('offlineChatSendBtn');

    // Update status badge on page load
    updateBotStatusBadge();

    if (prepareBtn) {
        prepareBtn.addEventListener('click', async () => {
            prepareBtn.disabled = true;
            if (progressContainer) progressContainer.classList.remove('d-none');
            if (progressText) progressText.textContent = 'Connecting to Hugging Face CDN...';

            try {
                await prepareOfflineAssistant((percent, file) => {
                    if (progressBar) {
                        progressBar.style.width = `${percent}%`;
                        progressBar.textContent = `${percent}%`;
                    }
                    if (progressText) {
                        progressText.textContent = `Downloading ${file}: ${percent}%`;
                    }
                });

                if (progressText) progressText.textContent = '✅ Model cached successfully for offline use!';
                if (progressBar) progressBar.className = 'progress-bar bg-success';
                updateBotStatusBadge();
            } catch (err) {
                console.error('Offline model download error:', err);
                if (progressText) progressText.textContent = `⚠️ Download failed: ${err.message || 'Network error'}`;
                prepareBtn.disabled = false;
            }
        });
    }

    if (chatSendBtn && chatInput) {
        const handleSend = async () => {
            const text = chatInput.value.trim();
            if (!text) return;

            chatInput.value = '';
            appendChatMessage('user', text);

            // Show typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.id = 'botTypingIndicator';
            typingDiv.className = 'p-2 rounded bg-secondary bg-opacity-25 text-info border border-secondary font-mono fs-7';
            typingDiv.innerHTML = '<i class="bi bi-arrow-repeat spin me-1"></i> Assistant processing...';
            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const responseText = await askOfflineAssistant(text);

            const indicator = document.getElementById('botTypingIndicator');
            if (indicator) indicator.remove();

            appendChatMessage('bot', responseText);
        };

        chatSendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
}

function updateBotStatusBadge() {
    const badgeContainer = document.getElementById('modelStatusBadgeContainer');
    const prepareBtn = document.getElementById('prepareOfflineModelBtn');
    if (!badgeContainer) return;

    if (localStorage.getItem('offline_assistant_ready') === 'true') {
        badgeContainer.innerHTML = '<span class="badge bg-success font-mono fs-8"><i class="bi bi-check-circle-fill me-1"></i> Offline Assistant Ready</span>';
        if (prepareBtn) prepareBtn.textContent = '🔄 Re-download / Update Model (~250MB)';
    } else {
        badgeContainer.innerHTML = '<span class="badge bg-secondary font-mono fs-8">Not Downloaded (Keyword Search Only)</span>';
    }
}

function appendChatMessage(sender, text) {
    const chatMessages = document.getElementById('offlineChatMessages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    if (sender === 'user') {
        msgDiv.className = 'p-2 rounded bg-primary bg-opacity-25 text-white border border-primary align-self-end w-75';
        msgDiv.innerHTML = `<strong class="text-info d-block fs-8"><i class="bi bi-person-fill me-1"></i> You:</strong> ${escapeHtml(text)}`;
    } else {
        msgDiv.className = 'p-2 rounded bg-secondary bg-opacity-25 text-white border border-secondary align-self-start w-100';
        msgDiv.innerHTML = `
            <strong class="text-info d-block fs-8"><i class="bi bi-robot me-1"></i> Emergency AI Assistant:</strong>
            <div class="mt-1">${formatChatMessageText(text)}</div>
            <div class="mt-2 text-warning fs-8 border-top border-secondary pt-1">
                ⚠️ Offline assistant — for a real emergency, use SOS or call the hotlines above.
            </div>
        `;
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatChatMessageText(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}
