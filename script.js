/**
 * AI Legal Assistant - Web client
 * Fix: script.js was corrupted (duplicate code blocks / broken comment markers), which prevented sending messages.
 * This version contains a single, consistent implementation.
 */

const WEBHOOK_URL = 'http://localhost:5678/webhook/affc9aac-955a-4858-a671-006aed3be42a';

const i18n = {
  ar: {
    appTitle: "المساعد القانوني الذكي",
    statusText: "متصل",
    startIntake: "بدء استشارة / معالج",
    docsTitle: "المستندات",
    dropText: "اسحب وأفلت ملف PDF/TXT أو انقر للرفع",
    statsTitle: "إحصائيات الجلسة",
    msgsLabel: "الأسئلة المطروحة:",
    disclaimerTitle: "تنبيه:",
    disclaimerText: "هذا المساعد لأغراض معلوماتية فقط ولا يعتبر استشارة قانونية ملزمة.",
    emptyTitle: "كيف يمكنني مساعدتك اليوم؟",
    emptySub: "يمكنني تحليل المستندات القانونية، صياغة الردود، أو الإجابة على الاستفسارات.",
    suggestions: ["لخص المستند المرفق", "ما هي حقوقي كمستأجر؟", "صياغة اتفاقية عدم إفشاء", "شرح الإخلال بالعقد"],

    wizardTitle: "المستشار القانوني المبدئي",
    wizardStep1Title: "اختر صفتك",
    wizardRoleOpt0: "-- اختر الصفة --",
    wizardRoleOpt1: "الشاكي / المدعي",
    wizardRoleOpt2: "المدعى عليه",
    wizardRoleOpt3: "شاهد",
    wizardStep2Title: "تفاصيل الواقعة",
    wizardDetailsPlaceholder: "صف ما حدث بالتفصيل...",
    wizardStep3Title: "النتيجة المرجوة",
    wizardOutcomePlaceholder: "ما الذي تسعى لتحقيقه؟",
    wizardBack: "السابق",
    wizardNext: "التالي",
    wizardSubmit: "إرسال الاستشارة",

    composerPlaceholder: "اكتب سؤالك هنا... (Shift+Enter لسطر جديد)",

    sourcesTitle: "المصادر المرجعية",
    viewSources: "عرض المصادر",

    stepText: (current, total) => `الخطوة ${current} من ${total}`,

    errorMsg: "عذراً، حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
    emptyResponse: "تمت معالجة الطلب ولكن لم يتم استلام نص للإجابة.",

    intakeReportTitle: "تقرير تقييم الاستشارة:\n\n",
    submittedIntake: (r, d, o) => `نموذج استشارة مرسل:\nالصفة: ${r}\nالتفاصيل: ${d}\nالنتيجة المرجوة: ${o}`
  },
  en: {
    appTitle: "AI Legal Assistant",
    statusText: "Connected",
    startIntake: "Start Intake / Advisor",
    docsTitle: "Documents",
    dropText: "Drag & drop PDF/TXT or click to upload",
    statsTitle: "Session Stats",
    msgsLabel: "Questions Asked:",
    disclaimerTitle: "Disclaimer:",
    disclaimerText: "This assistant is for informational purposes only and is not binding legal advice.",
    emptyTitle: "How can I assist you today?",
    emptySub: "I can help analyze legal documents, draft responses, or answer queries.",
    suggestions: ["Summarize attached document", "What are my tenant rights?", "Draft a basic NDA", "Explain breach of contract"],

    wizardTitle: "Initial Legal Advisor",
    wizardStep1Title: "Select your role",
    wizardRoleOpt0: "-- Choose Role --",
    wizardRoleOpt1: "Complainant / Plaintiff",
    wizardRoleOpt2: "Respondent / Defendant",
    wizardRoleOpt3: "Witness",
    wizardStep2Title: "Incident Details",
    wizardDetailsPlaceholder: "Describe what happened in detail...",
    wizardStep3Title: "Desired Outcome",
    wizardOutcomePlaceholder: "What are you seeking to achieve?",
    wizardBack: "Back",
    wizardNext: "Next",
    wizardSubmit: "Submit Intake",

    composerPlaceholder: "Type your question here... (Shift+Enter for newline)",

    sourcesTitle: "Reference Sources",
    viewSources: "View Sources",

    stepText: (current, total) => `Step ${current} of ${total}`,

    errorMsg: "Sorry, an error occurred connecting to the server. Please try again.",
    emptyResponse: "Request processed but no text response received.",

    intakeReportTitle: "Intake Evaluation Report:\n\n",
    submittedIntake: (r, d, o) => `Submitted Intake Form:\nRole: ${r}\nDetails: ${d}\nOutcome: ${o}`
  }
};

// --- DOM ---
const htmlRoot = document.getElementById('html-root');
const langToggleBtn = document.getElementById('lang-toggle');

const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const chatThread = document.getElementById('chat-thread');
const emptyState = document.getElementById('empty-state');
const statMsgs = document.getElementById('stat-msgs');

const sourcesPanel = document.getElementById('sources-panel');
const closeSourcesBtn = document.getElementById('close-sources');
const sourcesContent = document.getElementById('sources-content');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');

const startIntakeBtn = document.getElementById('start-intake-btn');
const wizardCard = document.getElementById('intake-wizard');
const closeWizardBtn = document.getElementById('close-wizard');
const wizardSteps = [
  document.getElementById('step-1'),
  document.getElementById('step-2'),
  document.getElementById('step-3')
];
const wizardNextBtn = document.getElementById('wizard-next');
const wizardBackBtn = document.getElementById('wizard-back');
const wizardSubmitBtn = document.getElementById('wizard-submit');
const wizardProgressFill = document.getElementById('wizard-progress-fill');
const wizardStepText = document.getElementById('wizard-step-text');
const wizardRole = document.getElementById('wizard-role');
const wizardDetails = document.getElementById('wizard-details');
const wizardOutcome = document.getElementById('wizard-outcome');

// --- State ---
let messageCount = 0;
let isWaitingForResponse = false;
let currentWizardStep = 0;
let uploadedFile = null;
let currentSources = [];
let currentLang = 'ar';

// --- Utils ---
function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '<',
    '>': '>',
    "'": '&#39;',
    '"': '"'
  }[ch]));
}

function updateMessageCount() {
  messageCount++;
  statMsgs.textContent = messageCount;
}

function scrollToBottom() {
  chatThread.scrollTop = chatThread.scrollHeight;
}

function extractAnswer(data) {
  if (Array.isArray(data)) {
    return data.map(item => {
      if (typeof item === 'string') return item;
      return item.output || item.response || item.answer || item.text || item.message || JSON.stringify(item);
    }).join('\n\n');
  }

  if (typeof data === 'object' && data !== null) {
    const text = data.output || data.response || data.answer || data.text || data.message;
    if (text) return text;
    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

// --- i18n ---
function applyTranslations(lang) {
  const t = i18n[lang];

  document.getElementById('app-title').textContent = t.appTitle;
  document.getElementById('status-text').textContent = t.statusText;
  langToggleBtn.textContent = t.langBtn ?? (lang === 'ar' ? 'English' : 'عربي');

  document.getElementById('start-intake-btn').textContent = t.startIntake;
  document.getElementById('docs-title').textContent = t.docsTitle;
  document.getElementById('drop-text').textContent = t.dropText;
  document.getElementById('stats-title').textContent = t.statsTitle;
  document.getElementById('msgs-label').textContent = t.msgsLabel;
  document.getElementById('disclaimer-title').textContent = t.disclaimerTitle;
  document.getElementById('disclaimer-text').textContent = t.disclaimerText;

  document.getElementById('empty-title').textContent = t.emptyTitle;
  document.getElementById('empty-sub').textContent = t.emptySub;

  const chips = document.querySelectorAll('.suggestion-chip');
  chips.forEach((chip, i) => chip.textContent = t.suggestions[i]);

  document.getElementById('wizard-title').textContent = t.wizardTitle;
  document.getElementById('wizard-step1-title').textContent = t.wizardStep1Title;
  document.getElementById('wizard-role-opt0').textContent = t.wizardRoleOpt0;
  document.getElementById('wizard-role-opt1').textContent = t.wizardRoleOpt1;
  document.getElementById('wizard-role-opt2').textContent = t.wizardRoleOpt2;
  document.getElementById('wizard-role-opt3').textContent = t.wizardRoleOpt3;
  document.getElementById('wizard-step2-title').textContent = t.wizardStep2Title;
  document.getElementById('wizard-details').placeholder = t.wizardDetailsPlaceholder;
  document.getElementById('wizard-step3-title').textContent = t.wizardStep3Title;
  document.getElementById('wizard-outcome').placeholder = t.wizardOutcomePlaceholder;

  wizardBackBtn.textContent = t.wizardBack;
  wizardNextBtn.textContent = t.wizardNext;
  wizardSubmitBtn.textContent = t.wizardSubmit;

  messageInput.placeholder = t.composerPlaceholder;

  document.getElementById('sources-title').textContent = t.sourcesTitle;

  wizardStepText.textContent = t.stepText(currentWizardStep + 1, wizardSteps.length);

  document.querySelectorAll('.toggle-sources-btn').forEach(btn => {
    btn.textContent = `📚 ${t.viewSources}`;
  });
}

langToggleBtn.addEventListener('click', () => {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  htmlRoot.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  htmlRoot.setAttribute('lang', currentLang);
  applyTranslations(currentLang);
});

// --- Suggestions ---
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    messageInput.value = chip.textContent;
    messageInput.dispatchEvent(new Event('input'));
    handleSend();
  });
});

// --- Composer input ---
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
  sendBtn.disabled = messageInput.value.trim() === '' || isWaitingForResponse;
});

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) handleSend();
  }
});

// --- Upload ---
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
    alert('Only PDF and TXT files are supported.');
    return;
  }

  uploadedFile = {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified
  };

  renderFileList();
  fileInput.value = '';
}

function renderFileList() {
  fileList.innerHTML = '';
  if (!uploadedFile) return;

  const chip = document.createElement('div');
  chip.className = 'file-chip glass-card';
  chip.innerHTML = `
    <span>📄 ${escapeHTML(uploadedFile.name)}</span>
    <button type="button" onclick="removeFile()">✕</button>
  `;
  fileList.appendChild(chip);
}

window.removeFile = function () {
  uploadedFile = null;
  renderFileList();
};

// --- Sources panel ---
closeSourcesBtn.addEventListener('click', () => {
  sourcesPanel.classList.add('hidden');
});

function addSourcesToggle(msgId) {
  const bubble = document.getElementById(msgId)?.querySelector('.bubble');
  if (!bubble) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn-secondary toggle-sources-btn';
  toggleBtn.textContent = `📚 ${i18n[currentLang].viewSources}`;
  toggleBtn.onclick = () => renderSourcesPanel(currentSources);
  bubble.appendChild(toggleBtn);
}

function renderSourcesPanel(sources) {
  sourcesContent.innerHTML = '';
  (sources || []).forEach((src, idx) => {
    const card = document.createElement('div');
    card.className = 'source-card glass-card';
    card.innerHTML = `
      <div class="source-card-header">
        <span>[${idx + 1}] ${escapeHTML(src.id || 'Source')}</span>
        <span>${src.page ? 'Pg. ' + escapeHTML(src.page) : ''}</span>
      </div>
      <div class="source-snippet">"${escapeHTML(src.snippet || '')}"</div>
    `;
    sourcesContent.appendChild(card);
  });

  sourcesPanel.classList.remove('hidden');
}

// --- Interactive elements ({{ or <<input:...>> style) ---
// Minimal implementation to support basic turn into inputs/choices rendered by the backend.
// It scans assistant message text for markers like: <<input:id=demo_name|type=text|placeholder=...|label=...|required=1>>
// and turns them into real HTML inputs.

function parseInteractiveMarkers(rawText) {
  if (rawText === undefined || rawText === null) return { text: '', elements: [] };

  let text = String(rawText);
  const elements = [];

  // Include leading spaces/newlines in case backend inserts formatting
  const markerRegex = /<<([a-zA-Z]+):([^>]+)>>/g;

  let match;
  while ((match = markerRegex.exec(text)) !== null) {
    const type = match[1].toLowerCase();
    const paramsStr = match[2];
    const params = {};

    paramsStr.split('|').forEach(pair => {
      const [k, v] = pair.split('=');
      if (!k) return;
      params[k.trim().toLowerCase()] = v ? v.trim() : '';
    });

    elements.push({ type, params });
  }

  // Remove markers from text
  text = text.replace(markerRegex, '').trim();

  return { text, elements };
}

let currentInteractiveSession = {
  active: false,
  // key -> value
  values: {},
  // map param.id -> DOM element
  elements: {},
};

function getInputValueFromDOM() {
  const values = {};
  for (const [key, el] of Object.entries(currentInteractiveSession.elements)) {
    if (!el) continue;
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox' || el.type === 'radio') {
        // For choice inputs we store value only when checked
        if (el.checked) values[key] = el.value;
      } else {
        values[key] = el.value;
      }
    }
  }
  currentInteractiveSession.values = values;
  return values;
}

function renderInteractiveElement(el) {
  const { type, params } = el;

  if (type === 'input') {
    const id = params.id || ('input_' + Math.random().toString(16).slice(2));
    const inputType = (params.type || 'text').toLowerCase();

    const wrapper = document.createElement('div');
    wrapper.className = 'interactive-form-card glass-card';

    const label = document.createElement('div');
    label.className = 'interactive-label';
    label.textContent = params.label || '';

    const input = document.createElement('input');
    input.className = 'interactive-field';
    input.id = id;
    input.type = inputType;

    // Make input text visible on dark background
    input.style.color = '#f8fafc';
    input.style.caretColor = '#f8fafc';
    input.style.background = 'rgba(0,0,0,0.3)';

    if (params.placeholder) input.placeholder = params.placeholder;
    if (params.required === '1' || params.required === 'true') input.required = true;

    // Track value
    currentInteractiveSession.elements[params.id || id] = input;
    input.addEventListener('input', () => {
      const v = {};
      v[params.id || id] = input.value;
      currentInteractiveSession.values = { ...currentInteractiveSession.values, ...v };
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return wrapper;
  }


  if (type === 'choices') {
    const container = document.createElement('div');
    container.className = 'interactive-form-card glass-card';

    const label = document.createElement('div');
    label.className = 'interactive-label';
    label.textContent = params.label || '';
    container.appendChild(label);

    const options = (params.options || '').split(';').map(s => s.trim()).filter(Boolean);
    const groupName = params.id || ('choices_' + Math.random().toString(16).slice(2));

    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'interactive-choices';

    // single vs multi
    const mode = (params.mode || 'single').toLowerCase();

    options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'interactive-btn';
      btn.textContent = opt;
      btn.style.color = '#f8fafc';
      btn.style.background = 'rgba(255,255,255,0.05)';


      const input = document.createElement('input');
      input.type = mode === 'single' ? 'radio' : 'checkbox';
      input.name = groupName;
      input.value = opt;
      input.style.display = 'none';
      input.id = groupName + '_' + idx;

      btn.addEventListener('click', () => {
        input.checked = !input.checked;
        // For single: uncheck others
        if (mode === 'single') {
          container.querySelectorAll('input[name="' + groupName + '"]').forEach(r => {
            if (r !== input) r.checked = false;
          });
        }
        // update UI state
        container.querySelectorAll('.interactive-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });

      // When input changes (if user clicks native)
      input.addEventListener('change', () => {
        btn.classList.toggle('selected', input.checked);
      });

      choicesWrap.appendChild(input);
      choicesWrap.appendChild(btn);
    });

    container.appendChild(choicesWrap);
    return container;
  }

  if (type === 'flow') {
    // Basic support: show a disabled card describing current step
    const wrapper = document.createElement('div');
    wrapper.className = 'interactive-form-card glass-card';

    const label = document.createElement('div');
    label.className = 'interactive-label';
    label.textContent = params.label || 'Flow';
    wrapper.appendChild(label);

    const step = params.step ? params.step : '';
    const stepText = document.createElement('div');
    stepText.className = 'source-snippet';
    stepText.textContent = step ? ('Step: ' + step) : '';
    wrapper.appendChild(stepText);

    return wrapper;
  }

  // Unknown
  const fallback = document.createElement('div');
  fallback.className = 'source-snippet';
  fallback.textContent = `Unsupported interactive: ${type}`;
  return fallback;
}

function formatAssistantText(raw) {
  if (raw === undefined || raw === null) return '';
  let text = String(raw);

  // Convert escaped newlines
  text = text.replace(/\\n/g, '\n');

  // Escape HTML first (prevents XSS)
  text = escapeHTML(text);

  // Convert **bold** and remove the asterisks
  // After escapeHTML, '*' remains '*' so regex still works.
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="ai-strong">$1</strong>');

  // Convert real newlines to <br>
  text = text.replace(/\n/g, '<br>');

  return text;
}

function renderAssistantContent(rawText, parentBubble) {
  const { text, elements } = parseInteractiveMarkers(rawText);

  // Reset interactive session for this assistant message
  currentInteractiveSession.active = elements.length > 0;
  currentInteractiveSession.values = {};
  currentInteractiveSession.elements = {};

  // Base text
  if (text) {
    const content = document.createElement('div');
    content.className = 'bubble-text';
    content.innerHTML = formatAssistantText(text);
    parentBubble.appendChild(content);
  }

  if (elements.length) {
    const wrap = document.createElement('div');
    wrap.className = 'interactive-container';

    elements.forEach(el => {
      wrap.appendChild(renderInteractiveElement(el));
    });

    // Add a submit button under AI-rendered interactive inputs
    const buttonWrap = document.createElement('div');
    buttonWrap.className = 'interactive-form-controls form-controls-wrapper';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'interactive-submit-btn btn-primary master-submit';
    submitBtn.textContent = (i18n[currentLang]?.wizardSubmit) ? i18n[currentLang].wizardSubmit : (currentLang === 'ar' ? 'إرسال' : 'Submit');

    submitBtn.addEventListener('click', () => {
      submitActiveInteractiveForm();
    });

    buttonWrap.appendChild(submitBtn);
    wrap.appendChild(buttonWrap);

    parentBubble.appendChild(wrap);
  }
}


function renderUserMessage(text) {
  updateMessageCount();
  const id = 'msg-' + Date.now();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message user';
  msgDiv.id = id;
  msgDiv.innerHTML = `
    <div class="avatar">U</div>
    <div class="bubble">${escapeHTML(text)}</div>
  `;

  chatThread.appendChild(msgDiv);
  return id;
}

function renderAssistantMessage(text) {
  updateMessageCount();
  const id = 'msg-' + Date.now();

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message assistant';
  msgDiv.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = '⚖️';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  // Render plain text + interactive markers
  renderAssistantContent(text, bubble);

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  chatThread.appendChild(msgDiv);
  return id;
}

function renderLoading() {
  const id = 'loading-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message assistant';
  msgDiv.id = id;
  msgDiv.innerHTML = `
    <div class="avatar">⚖️</div>
    <div class="bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chatThread.appendChild(msgDiv);
  return id;
}

function renderError() {
  const errDiv = document.createElement('div');
  errDiv.className = 'error-card glass-card';
  errDiv.textContent = i18n[currentLang].errorMsg;
  chatThread.appendChild(errDiv);
}

// --- Webhook ---
async function callWebhook(payload) {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('Network error');

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
}

// --- Send ---
sendBtn.addEventListener('click', handleSend);

function hasActiveInteractiveFlow() {
  // active when last assistant message contained markers
  return currentInteractiveSession.active;
}

function buildInteractiveSubmissionPrompt(userText) {
  const values = getInputValueFromDOM();
  const extras = [];
  if (Object.keys(values).length) {
    extras.push('interactive_values=' + JSON.stringify(values));
  }
  if (userText) extras.push('user_text=' + userText);
  return extras.length ? extras.join('\n') : userText;
}

function formatInteractiveValuesForUser(values) {
  if (!values || typeof values !== 'object') return '';

  const entries = Object.entries(values);
  if (!entries.length) return '';

  // Keep it readable and “user-like”: "primary_legal_query: sgs"
  // and join multi values on one line.
  return entries
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

async function submitActiveInteractiveForm() {
  // Submits active <<input>>/<<choices>>/<<flow>> values to the AI
  if (!hasActiveInteractiveFlow()) return;
  if (isWaitingForResponse) return;

  // build payload text (must include interactive_values=...)
  const composed = buildInteractiveSubmissionPrompt('');
  if (!composed || composed.trim() === '') return;

  // show a cleaned version to the user (do not show "interactive_values=...")
  const values = getInputValueFromDOM();
  const userVisibleText = formatInteractiveValuesForUser(values);

  emptyState.classList.add('hidden');
  chatThread.classList.remove('hidden');
  wizardCard.classList.add('hidden');

  renderUserMessage(userVisibleText || 'تم إرسال الخيارات/المدخلات.');

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  const loadingId = renderLoading();
  scrollToBottom();
  isWaitingForResponse = true;

  try {
    const payload = { message: composed };
    if (uploadedFile) {
      payload.document = uploadedFile.name;
      payload.file = uploadedFile;
    }

    const responseData = await callWebhook(payload);
    document.getElementById(loadingId)?.remove();

    if (typeof responseData === 'object') {
      const answerText = extractAnswer(responseData);
      const msgId = renderAssistantMessage(answerText);

      if (responseData.sources?.length) {
        currentSources = responseData.sources;
        addSourcesToggle(msgId);
      }
    } else {
      renderAssistantMessage(responseData);
    }
  } catch (err) {
    document.getElementById(loadingId)?.remove();
    renderError();
  } finally {
    isWaitingForResponse = false;
    sendBtn.disabled = messageInput.value.trim() === '';
    scrollToBottom();
  }
}

async function handleSend() {
  const text = messageInput.value.trim();
  if (isWaitingForResponse) return;

  // If we have an active interactive form, submit its values regardless of textarea content
  if (hasActiveInteractiveFlow()) {
    const composed = buildInteractiveSubmissionPrompt(text);
    if (!composed || composed.trim() === '') return;

    // Send composed prompt
    emptyState.classList.add('hidden');
    chatThread.classList.remove('hidden');
    wizardCard.classList.add('hidden');

    renderUserMessage(composed);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    const loadingId = renderLoading();
    scrollToBottom();
    isWaitingForResponse = true;

    try {
      const payload = { message: composed };
      if (uploadedFile) {
        payload.document = uploadedFile.name;
        payload.file = uploadedFile;
      }

      const responseData = await callWebhook(payload);
      document.getElementById(loadingId)?.remove();

      if (typeof responseData === 'object') {
        const answerText = extractAnswer(responseData);
        const msgId = renderAssistantMessage(answerText);

        // If assistant response contains interactive markers, activate again
        // (done in renderAssistantContent)
        if (responseData.sources?.length) {
          currentSources = responseData.sources;
          addSourcesToggle(msgId);
        }
      } else {
        renderAssistantMessage(responseData);
      }
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      renderError();
    } finally {
      isWaitingForResponse = false;
      sendBtn.disabled = messageInput.value.trim() === '';
      scrollToBottom();
    }

    return;
  }

  // Normal mode
  if (!text) return;


  emptyState.classList.add('hidden');
  chatThread.classList.remove('hidden');
  wizardCard.classList.add('hidden');

  renderUserMessage(text);

  messageInput.value = '';
  messageInput.style.height = 'auto';
  sendBtn.disabled = true;

  const loadingId = renderLoading();
  scrollToBottom();
  isWaitingForResponse = true;

  try {
    const payload = { message: text };
    if (uploadedFile) {
      payload.document = uploadedFile.name;
      payload.file = uploadedFile;
    }

    if (text.toLowerCase() === 'demo') {
      const demoResponse = {
        output: [
          { output: "**تجربة عرضية**\\nهذا نص تجريبي لإظهار التنسيقات: **عنوان مهم**." },
          { output: "يرجى إدخال اسمك:\\n<<input:id=demo_name|type=text|placeholder=اكتب هنا...|label=الاسم|required=1|submit=manual>>" },
          { output: "اختر نوع القضية:\\n<<choices:id=demo_case|mode=single|label=اختر نوعاً|options=عقاري;تجاري;أحوال شخصية;أخرى>>" },
          { output: "مرحلة المعالج:\\n<<flow:id=demo_flow|step=1|label=ما تاريخ الواقعة؟|type=date|required=1>>" }
        ],
        sources: [{ id: 'DemoDoc', page: 1, snippet: 'هذا مقتطف تجريبي من المصدر لعرض اللوحة الجانبية.' }]
      };

      document.getElementById(loadingId)?.remove();
      const answerText = extractAnswer(demoResponse);
      const msgId = renderAssistantMessage(answerText);

      if (demoResponse.sources?.length) {
        currentSources = demoResponse.sources;
        addSourcesToggle(msgId);
      }

      return;
    }

    const responseData = await callWebhook(payload);
    document.getElementById(loadingId)?.remove();

    if (typeof responseData === 'object') {
      const answerText = extractAnswer(responseData);
      const msgId = renderAssistantMessage(answerText);

      if (responseData.sources?.length) {
        currentSources = responseData.sources;
        addSourcesToggle(msgId);
      }
    } else {
      renderAssistantMessage(responseData);
    }

  } catch (err) {
    document.getElementById(loadingId)?.remove();
    renderError();
  } finally {
    isWaitingForResponse = false;
    sendBtn.disabled = messageInput.value.trim() === '';
    scrollToBottom();
  }
}

// --- Intake wizard ---
startIntakeBtn.addEventListener('click', startWizard);
closeWizardBtn.addEventListener('click', () => wizardCard.classList.add('hidden'));

wizardNextBtn.addEventListener('click', () => {
  if (validateWizardStep(currentWizardStep)) {
    currentWizardStep++;
    renderWizardStep();
  }
});

wizardBackBtn.addEventListener('click', () => {
  currentWizardStep--;
  renderWizardStep();
});

wizardSubmitBtn.addEventListener('click', submitWizard);

function startWizard() {
  emptyState.classList.add('hidden');
  chatThread.classList.remove('hidden');
  wizardCard.classList.remove('hidden');

  currentWizardStep = 0;
  wizardRole.value = '';
  wizardDetails.value = '';
  wizardOutcome.value = '';

  renderWizardStep();
  scrollToBottom();
}

function validateWizardStep(stepIndex) {
  if (stepIndex === 0 && !wizardRole.value) {
    alert(currentLang === 'ar' ? 'الرجاء اختيار صفتك.' : 'Please select your role.');
    return false;
  }
  if (stepIndex === 1 && !wizardDetails.value.trim()) {
    alert(currentLang === 'ar' ? 'الرجاء كتابة تفاصيل الواقعة.' : 'Please provide incident details.');
    return false;
  }
  if (stepIndex === 2 && !wizardOutcome.value.trim()) {
    alert(currentLang === 'ar' ? 'الرجاء كتابة النتيجة المرجوة.' : 'Please provide the desired outcome.');
    return false;
  }
  return true;
}

function renderWizardStep() {
  wizardSteps.forEach((stepEl, idx) => {
    stepEl.classList.toggle('active', idx === currentWizardStep);
  });

  wizardStepText.textContent = i18n[currentLang].stepText(currentWizardStep + 1, wizardSteps.length);

  wizardProgressFill.style.width = `${((currentWizardStep + 1) / wizardSteps.length) * 100}%`;

  wizardBackBtn.classList.toggle('hidden', currentWizardStep === 0);
  wizardNextBtn.classList.toggle('hidden', currentWizardStep === wizardSteps.length - 1);
  wizardSubmitBtn.classList.toggle('hidden', currentWizardStep !== wizardSteps.length - 1);

  scrollToBottom();
}

async function submitWizard() {
  if (!validateWizardStep(currentWizardStep)) return;

  const wizardData = {
    role: wizardRole.options[wizardRole.selectedIndex].text,
    details: wizardDetails.value,
    outcome: wizardOutcome.value
  };

  wizardCard.classList.add('hidden');

  const userText = i18n[currentLang].submittedIntake(wizardData.role, wizardData.details, wizardData.outcome);
  renderUserMessage(userText);

  const loadingId = renderLoading();
  scrollToBottom();
  isWaitingForResponse = true;

  try {
    const payload = {
      message: 'Analyze this intake form: ' + JSON.stringify(wizardData)
    };

    if (uploadedFile) {
      payload.document = uploadedFile.name;
      payload.file = uploadedFile;
    }

    const responseData = await callWebhook(payload);
    document.getElementById(loadingId)?.remove();

    if (typeof responseData === 'object') {
      const answerText = extractAnswer(responseData);
      renderAssistantMessage(i18n[currentLang].intakeReportTitle + answerText);
    } else {
      renderAssistantMessage(i18n[currentLang].intakeReportTitle + responseData);
    }

  } catch (err) {
    document.getElementById(loadingId)?.remove();
    renderError();
  } finally {
    isWaitingForResponse = false;
    scrollToBottom();
  }
}

// Initial
applyTranslations(currentLang);
// ensure composer height
messageInput.dispatchEvent(new Event('input'));

