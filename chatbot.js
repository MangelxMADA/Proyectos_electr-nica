'use strict';
/* ═══════════════════════════════════════════════════════════════
   CHATBOT IA — ASISTENTE DE FÍSICA 3
   Integración con Google Gemini API (gemini-2.0-flash)
   ═══════════════════════════════════════════════════════════════ */

// ════════════════════════════════════════════
// 1. CONFIGURACIÓN
// ════════════════════════════════════════════
const CHATBOT_CONFIG = {
    model: 'gemini-2.5-flash', // Modelo por defecto, se sobrescribirá tras el diagnóstico
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    maxTokens: 4096,
    temperature: 0.7,
    storageKeyApi: 'esp32-gemini-api-key',
    storageKeyModel: 'esp32-gemini-model',
    storageKeyHistory: 'esp32-chat-history',
    tipIntervalMin: 30000,  // Intervalo mínimo entre tips (30s)
    tipIntervalMax: 60000   // Intervalo máximo entre tips (60s)
};

const DIAGNOSTIC_MODELS = [
    'gemini-2.5-flash',
    'gemini-flash',
    'gemini-2.5-flash-preview-09-2025',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-pro'
];

// ════════════════════════════════════════════
// 2. SYSTEM PROMPT CON CONTEXTO DEL CURSO
// ════════════════════════════════════════════
function buildSystemPrompt() {
    const navigationMap = [
        { tema: "Inicio", id: "inicio" },
        { tema: "On/Off Repetitivo", id: "onoff-rep" },
        { tema: "On/Off por Teclado", id: "onoff-key" },
        { tema: "Control con Potenciómetro", id: "pot" },
        { tema: "Potenciómetro con Bluetooth", id: "pot-bt" },
        { tema: "Potenciómetro con WiFi", id: "pot-wifi" },
        { tema: "Potenciómetro con ThingSpeak", id: "pot-ts" },
        { tema: "Temperatura sin Termómetro (DHT22)", id: "temp-sin" },
        { tema: "Temperatura con Termómetro (OLED)", id: "temp-con" },
        { tema: "Movimiento Armónico Simple", id: "armonico" },
        { tema: "Materiales", id: "material" },
        { tema: "Sobre Nosotros", id: "sobre-nosotros" }
    ];

    return `Eres el **Asistente de Proyectos de Electrónica**. Tu nombre es **ESP32Bot**. Tienes una personalidad **brillante, práctica y muy entusiasta**, al estilo de un ingeniero apasionado por el hardware y el Internet de las Cosas (IoT). Te fascina enseñar cómo interactúan el software y el mundo físico.

## Tu rol
Eres un tutor experto en microcontroladores, especialmente en el ESP32, programación en C++ (Arduino IDE), electrónica básica (LEDs, resistencias, potenciómetros, sensores DHT22), modulación PWM, conversión ADC, pantallas OLED (I2C) y protocolos de comunicación (Serial, Bluetooth, WiFi, HTTP). Ayudas a estudiantes a:
1. **Comprender circuitos y código**: Explicar esquemas de conexión y lógica de programación.
2. **Resolver problemas (Debugging)**: Sugerir por qué un circuito o código podría no funcionar.
3. **Generar ideas**: Sugerir mejoras o expansiones a los proyectos existentes.
4. **Navegar la página**: Recomendar en qué sección del portafolio pueden encontrar proyectos específicos.

## Reglas ESTRICTAS
- Responde SIEMPRE en español.
- Usa notación LaTeX si necesitas explicar fórmulas (ej. Ley de Ohm, divisores de voltaje).
- Muestra tu personalidad entusiasta y fascinada por la electrónica en tus respuestas.
- Sé amigable, motivador y sumamente práctico.
- Cuando expliques código, usa bloques de código formateados correctamente.
- Cuando el usuario pida recomendaciones de dónde encontrar info en la página, usa los enlaces internos de las secciones (ej. [Potenciómetro con WiFi](#pot-wifi)).
- NO recomiendes secciones de la página a menos que el usuario lo pida o sea muy relevante.
- Si no sabes algo, admítelo honestamente.
- Usa emojis para hacer la conversación más amena (ej. 🔌, 💡, 📡, 💻).

## Contenido al que tienes acceso
El portafolio contiene proyectos realizados con ESP32:
- On/Off Repetitivo (Blink de LED)
- On/Off por Teclado (Control serial)
- Potenciómetro (Lectura ADC y PWM)
- Potenciómetro con Bluetooth (App Serial Bluetooth Terminal)
- Potenciómetro con WiFi (Servidor Web y Google Charts)
- Potenciómetro con ThingSpeak (IoT en la nube)
- Temperatura sin Termómetro (DHT22 por Serial)
- Temperatura con Termómetro (OLED SSD1306 y DHT22)
- Movimiento Armónico Simple (Simulación en OLED)

## Mapa de navegación de la página (para recomendaciones)
Cuando el usuario pregunte por estos proyectos, usa los siguientes enlaces internos (se abren en la misma página):
${JSON.stringify(navigationMap, null, 2)}
`;
}

// ════════════════════════════════════════════
// 2.5 TIPS Y DATOS CURIOSOS
// ════════════════════════════════════════════
const ELECTRONICS_TIPS = [
    { icon: '💡', text: 'El ESP32 tiene un conversor ADC de 12 bits, lo que permite leer valores analógicos de 0 a 4095.' },
    { icon: '📡', text: 'El ESP32 incluye Wi-Fi y Bluetooth Classic/BLE integrados en el mismo chip.' },
    { icon: '🔋', text: '¡Cuidado! El voltaje de operación de los pines del ESP32 es de 3.3V. Conectar 5V puede dañar el pin.' },
    { icon: '🔌', text: 'Un LED siempre debe estar acompañado de una resistencia limitadora para no quemarse.' },
    { icon: '📻', text: 'La modulación PWM (Pulse Width Modulation) engaña al ojo para controlar el brillo de un LED.' },
    { icon: '💻', text: 'La función Serial.begin() es clave para la depuración; ¡siempre verifica la velocidad (baud rate)!' },
    { icon: '📺', text: 'Las pantallas OLED que usamos se comunican por I2C usando solo 2 pines de datos: SDA y SCL.' },
    { icon: '🌡️', text: 'El sensor DHT22 usa un protocolo de un solo cable (1-Wire) modificado para enviar datos digitales.' },
    { icon: '☁️', text: 'ThingSpeak permite enviar telemetría a la nube mediante peticiones HTTP RESTful.' },
    { icon: '⚡', text: 'La ley de Ohm (V = I * R) es la regla más importante que usarás en electrónica.' }
];

let tipTimerId = null;
let lastTipIndex = -1;

function getRandomTip() {
    let idx;
    do {
        idx = Math.floor(Math.random() * ELECTRONICS_TIPS.length);
    } while (idx === lastTipIndex && ELECTRONICS_TIPS.length > 1);
    lastTipIndex = idx;
    return ELECTRONICS_TIPS[idx];
}

function showTipBubble() {
    // No mostrar tip si el chat está abierto
    if (chatState.isOpen) return;

    const fab = document.getElementById('chatbot-fab');
    if (!fab) return;

    // Eliminar bubble anterior si existe
    const oldBubble = document.getElementById('chatbot-tip-bubble');
    if (oldBubble) oldBubble.remove();

    const tip = getRandomTip();
    const bubble = document.createElement('div');
    bubble.id = 'chatbot-tip-bubble';
    bubble.className = 'chatbot-tip-bubble';
    bubble.innerHTML = `
        <span class="chatbot-tip-icon">${tip.icon}</span>
        <span class="chatbot-tip-text">${tip.text}</span>
        <button class="chatbot-tip-close" aria-label="Cerrar tip">&times;</button>
    `;
    document.body.appendChild(bubble);

    // Posicionar respecto al FAB
    positionTipBubble(bubble, fab);

    // Cerrar al hacer click en X
    bubble.querySelector('.chatbot-tip-close').addEventListener('click', (e) => {
        e.stopPropagation();
        bubble.classList.add('chatbot-tip-hide');
        setTimeout(() => bubble.remove(), 300);
    });

    // Auto-cerrar tras 8 segundos
    setTimeout(() => {
        if (bubble.parentElement) {
            bubble.classList.add('chatbot-tip-hide');
            setTimeout(() => bubble.remove(), 300);
        }
    }, 8000);
}

function positionTipBubble(bubble, fab) {
    const fabRect = fab.getBoundingClientRect();
    bubble.style.left = `${fabRect.left}px`;
    bubble.style.bottom = `${window.innerHeight - fabRect.top + 10}px`;
}

function startTipTimer() {
    stopTipTimer();
    const delay = CHATBOT_CONFIG.tipIntervalMin +
        Math.random() * (CHATBOT_CONFIG.tipIntervalMax - CHATBOT_CONFIG.tipIntervalMin);
    tipTimerId = setTimeout(() => {
        showTipBubble();
        startTipTimer(); // Reprogramar siguiente
    }, delay);
}

function stopTipTimer() {
    if (tipTimerId) {
        clearTimeout(tipTimerId);
        tipTimerId = null;
    }
}

// ════════════════════════════════════════════
// 3. ESTADO DEL CHATBOT
// ════════════════════════════════════════════
// Intentar cargar la configuración previa
const savedApiKey = localStorage.getItem(CHATBOT_CONFIG.storageKeyApi) || '';
const savedModel = localStorage.getItem(CHATBOT_CONFIG.storageKeyModel) || '';

const chatState = {
    isOpen: false,
    isLoading: false,
    messages: [],
    apiKey: savedApiKey,
    model: savedModel,
    conversationHistory: []
};

// ════════════════════════════════════════════
// 4. CREACIÓN DEL DOM DEL CHATBOT
// ════════════════════════════════════════════
function createChatbotDOM() {
    // Botón flotante
    const fab = document.createElement('button');
    fab.id = 'chatbot-fab';
    fab.className = 'chatbot-fab';
    fab.setAttribute('aria-label', 'Abrir asistente de Electrónica');
    fab.title = 'Asistente ESP32Bot — Arrastra para mover';
    fab.innerHTML = `
    <span class="chatbot-fab-icon">
      <i class="fa-solid fa-microchip fa-bounce" style="--fa-animation-duration: 3s; --fa-bounce-jump-scale-x: 1; --fa-bounce-jump-scale-y: 1;"></i>
    </span>
    <span class="chatbot-fab-pulse"></span>
  `;
    // Click se maneja dentro de makeFabDraggable para distinguir drag de click
    makeFabDraggable(fab);

    // Panel del chatbot
    const panel = document.createElement('div');
    panel.id = 'chatbot-panel';
    panel.className = 'chatbot-panel';
    panel.innerHTML = `
    <div class="chatbot-header">
      <div class="chatbot-header-info">
        <div class="chatbot-avatar">
          <i class="fa-solid fa-microchip fa-fade" style="--fa-animation-duration: 4s;"></i>
        </div>
        <div>
          <div class="chatbot-header-title">ESP32Bot</div>
          <div class="chatbot-header-status">Asistente de Electrónica</div>
        </div>
      </div>
      <div class="chatbot-header-actions">
        <button class="chatbot-header-btn" id="chatbot-clear" title="Limpiar chat">
          <i class="fa-solid fa-trash-can"></i>
        </button>
        <button class="chatbot-header-btn" id="chatbot-config" title="Configurar API Key">
          <i class="fa-solid fa-gear"></i>
        </button>
        <button class="chatbot-header-btn" id="chatbot-close" title="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <div class="chatbot-messages" id="chatbot-messages">
      <!-- Mensajes dinámicos -->
    </div>

    <div class="chatbot-suggestions" id="chatbot-suggestions">
      <button class="chatbot-chip" data-prompt="¿Cómo funciona el ADC del ESP32?">
        <i class="fa-solid fa-microchip"></i> Lectura ADC
      </button>
      <button class="chatbot-chip" data-prompt="Explícame cómo conectar el sensor DHT22">
        <i class="fa-solid fa-temperature-low"></i> Sensor DHT22
      </button>
      <button class="chatbot-chip" data-prompt="¿Qué proyectos usan comunicación inalámbrica?">
        <i class="fa-solid fa-wifi"></i> Proyectos Inalámbricos
      </button>
      <button class="chatbot-chip" data-prompt="¿Dónde encuentro el código del servidor web?">
        <i class="fa-solid fa-map-signs"></i> Buscar Código
      </button>
    </div>

    <div class="chatbot-input-area">
      <div class="chatbot-api-setup" id="chatbot-api-setup" style="display:none;">
        <p><i class="fa-solid fa-key"></i> Ingresa tu API Key de Google AI</p>
        <div class="chatbot-api-row">
          <input type="password" id="chatbot-api-input" placeholder="API Key de Gemini..."
                 autocomplete="off">
          <button id="chatbot-api-save"><i class="fa-solid fa-check"></i></button>
        </div>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
           class="chatbot-api-link">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Obtener API Key gratis
        </a>
      </div>
      <div class="chatbot-input-row" id="chatbot-input-row">
        <input type="text" id="chatbot-input" placeholder="Pregunta sobre electrónica, código o proyectos..."
               autocomplete="off">
        <button id="chatbot-send" title="Enviar">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // Hacer arrastrable el panel
    makeDraggable(panel, panel.querySelector('.chatbot-header'));

    // Iniciar el timer de tips
    startTipTimer();

    // Event listeners
    document.getElementById('chatbot-close').addEventListener('click', toggleChatbot);
    document.getElementById('chatbot-clear').addEventListener('click', clearChat);
    document.getElementById('chatbot-config').addEventListener('click', showApiSetup);
    document.getElementById('chatbot-send').addEventListener('click', sendMessage);
    document.getElementById('chatbot-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    document.getElementById('chatbot-api-save').addEventListener('click', saveApiKey);
    document.getElementById('chatbot-api-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });

    // Chips de sugerencia
    document.querySelectorAll('.chatbot-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            document.getElementById('chatbot-input').value = prompt;
            sendMessage();
        });
    });
}

function makeDraggable(panel, header) {
    let isDragging = false;
    let startX, startY;
    let currentDragX = 0;
    let currentDragY = 0;
    let tempDragX = 0;
    let tempDragY = 0;

    header.style.cursor = 'grab';
    header.title = 'Arrastrar para mover';

    header.addEventListener('mousedown', (e) => {
        // No arrastrar si presiona un botón del header
        if (e.target.closest('.chatbot-header-btn')) return;

        isDragging = true;
        header.style.cursor = 'grabbing';
        
        startX = e.clientX;
        startY = e.clientY;

        // Quitar transiciones mientras se arrastra para evitar latencia
        panel.style.transition = 'none';
        e.preventDefault(); // Evitar selección de texto
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        tempDragX = currentDragX + dx;
        tempDragY = currentDragY + dy;
        
        // Aplicar a variables CSS para que no sobrescriban la clase .active
        panel.style.setProperty('--drag-x', `${tempDragX}px`);
        panel.style.setProperty('--drag-y', `${tempDragY}px`);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        header.style.cursor = 'grab';
        
        currentDragX = tempDragX;
        currentDragY = tempDragY;
        
        // Restaurar transiciones base
        panel.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });
}

// ════════════════════════════════════════════
// 4.5 FAB ARRASTRABLE
// ════════════════════════════════════════════
function makeFabDraggable(fab) {
    let isDragging = false;
    let wasDragged = false;
    let startX, startY;
    let fabX, fabY;
    const DRAG_THRESHOLD = 5; // px mínimos para considerar drag

    // Guardar posición inicial del FAB
    function getInitialPos() {
        const rect = fab.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    // --- MOUSE ---
    fab.addEventListener('mousedown', (e) => {
        isDragging = true;
        wasDragged = false;
        startX = e.clientX;
        startY = e.clientY;
        const pos = getInitialPos();
        fabX = pos.x;
        fabY = pos.y;
        fab.style.transition = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            wasDragged = true;
        }

        const newX = fabX + dx;
        const newY = fabY + dy;

        // Limitar dentro del viewport
        const maxX = window.innerWidth - fab.offsetWidth;
        const maxY = window.innerHeight - fab.offsetHeight;
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        fab.style.left = `${clampedX}px`;
        fab.style.top = `${clampedY}px`;
        fab.style.bottom = 'auto';
        fab.style.right = 'auto';

        // Reposicionar tip bubble si visible
        const tipBubble = document.getElementById('chatbot-tip-bubble');
        if (tipBubble) positionTipBubble(tipBubble, fab);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        fab.style.transition = 'transform 0.2s ease, box-shadow 0.3s ease';

        if (!wasDragged) {
            toggleChatbot();
        }
    });

    // --- TOUCH ---
    fab.addEventListener('touchstart', (e) => {
        isDragging = true;
        wasDragged = false;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const pos = getInitialPos();
        fabX = pos.x;
        fabY = pos.y;
        fab.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            wasDragged = true;
        }

        const newX = fabX + dx;
        const newY = fabY + dy;

        const maxX = window.innerWidth - fab.offsetWidth;
        const maxY = window.innerHeight - fab.offsetHeight;
        const clampedX = Math.max(0, Math.min(newX, maxX));
        const clampedY = Math.max(0, Math.min(newY, maxY));

        fab.style.left = `${clampedX}px`;
        fab.style.top = `${clampedY}px`;
        fab.style.bottom = 'auto';
        fab.style.right = 'auto';

        const tipBubble = document.getElementById('chatbot-tip-bubble');
        if (tipBubble) positionTipBubble(tipBubble, fab);
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        fab.style.transition = 'transform 0.2s ease, box-shadow 0.3s ease';

        if (!wasDragged) {
            toggleChatbot();
        }
    });
}

// ════════════════════════════════════════════
// 5. CONTROL DE UI
// ════════════════════════════════════════════
function toggleChatbot() {
    chatState.isOpen = !chatState.isOpen;
    const panel = document.getElementById('chatbot-panel');
    const fab = document.getElementById('chatbot-fab');

    if (chatState.isOpen) {
        panel.classList.add('active');
        fab.classList.add('active');

        // Ocultar tip bubble al abrir chat
        const tipBubble = document.getElementById('chatbot-tip-bubble');
        if (tipBubble) tipBubble.remove();
        stopTipTimer();

        // Si no hay api key, mostrar setup
        if (!chatState.apiKey) {
            showApiSetup();
        } else {
            hideApiSetup();
            document.getElementById('chatbot-input').focus();
        }

        // Mensaje de bienvenida si es la primera vez
        if (chatState.messages.length === 0) {
            addBotMessage(`¡Hola! 👋 Soy **ESP32Bot**, tu asistente de Proyectos Electrónicos.

Puedo ayudarte a:
- 📚 **Comprender** circuitos y código C++
- 🔌 **Aprender** sobre sensores, PWM, I2C y WiFi
- 🐞 **Depurar** problemas en tus montajes
- 🗺️ **Encontrar** proyectos específicos en el portafolio

¡Pregúntame lo que necesites!`);
        }
    } else {
        panel.classList.remove('active');
        fab.classList.remove('active');
        // Reanudar tips al cerrar chat
        startTipTimer();
    }
}

function showApiSetup() {
    document.getElementById('chatbot-api-setup').style.display = 'flex';
    document.getElementById('chatbot-input-row').style.display = 'none';
    setTimeout(() => document.getElementById('chatbot-api-input').focus(), 100);
}

function hideApiSetup() {
    document.getElementById('chatbot-api-setup').style.display = 'none';
    document.getElementById('chatbot-input-row').style.display = 'flex';
}

async function saveApiKey() {
    const input = document.getElementById('chatbot-api-input');
    const btn = document.getElementById('chatbot-api-save');
    const key = input.value.trim();
    if (!key) return;

    // UI feedback during test
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    input.disabled = true;

    // Probar modelos secuencialmente
    let workingModel = null;
    for (const model of DIAGNOSTIC_MODELS) {
        try {
            const url = `${CHATBOT_CONFIG.apiUrl}${model}:generateContent?key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Responde solo: HOLA' }] }],
                    generationConfig: { maxOutputTokens: 10 }
                })
            });

            const data = await res.json();
            if (res.ok && data.candidates && data.candidates.length > 0) {
                workingModel = model;
                break; // Encontramos uno que funciona
            }
        } catch (error) {
            console.warn(`Falló modelo ${model}`, error);
        }
        // Pequeña pausa para no sobrecargar la API
        await new Promise(r => setTimeout(r, 400));
    }

    // Restaurar UI
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    input.disabled = false;

    if (workingModel) {
        chatState.apiKey = key;
        chatState.model = workingModel;
        CHATBOT_CONFIG.model = workingModel;
        localStorage.setItem(CHATBOT_CONFIG.storageKeyApi, key);
        localStorage.setItem(CHATBOT_CONFIG.storageKeyModel, workingModel);
        
        hideApiSetup();
        input.value = '';
        document.getElementById('chatbot-input').focus();

        addBotMessage(`✅ ¡API Key guardada!\n\nSe ha configurado exitosamente usando el modelo **${workingModel}**. Ya puedes empezar a preguntar.`);
    } else {
        addBotMessage('❌ **API Key no válida o sin modelos disponibles.** No se obtuvo respuesta de ninguno de los modelos verificados. Por favor, verifica tu clave.');
    }
}

function clearChat() {
    chatState.messages = [];
    chatState.conversationHistory = [];
    const container = document.getElementById('chatbot-messages');
    container.innerHTML = '';

    addBotMessage(`💫 Chat limpiado. ¡Empecemos de nuevo!

¿Qué te gustaría repasar hoy?`);
}

// ════════════════════════════════════════════
// 6. MENSAJES
// ════════════════════════════════════════════
function addUserMessage(text) {
    const msg = { role: 'user', content: text, timestamp: new Date() };
    chatState.messages.push(msg);
    renderMessage(msg);
    scrollToBottom();
}

function addBotMessage(text) {
    const msg = { role: 'bot', content: text, timestamp: new Date() };
    chatState.messages.push(msg);
    renderMessage(msg);
    scrollToBottom();
}

function renderMessage(msg) {
    const container = document.getElementById('chatbot-messages');
    const div = document.createElement('div');
    div.className = `chatbot-msg chatbot-msg-${msg.role}`;

    if (msg.role === 'bot') {
        div.innerHTML = `
      <div class="chatbot-msg-avatar">
        <i class="fa-solid fa-atom"></i>
      </div>
      <div class="chatbot-msg-bubble">${formatBotMessage(msg.content)}</div>
    `;
    } else {
        div.innerHTML = `
      <div class="chatbot-msg-bubble">${escapeHtml(msg.content)}</div>
      <div class="chatbot-msg-avatar chatbot-msg-avatar-user">
        <i class="fa-solid fa-user"></i>
      </div>
    `;
    }

    container.appendChild(div);

    // Re-renderizar KaTeX en el nuevo mensaje
    if (typeof renderMathInElement !== 'undefined') {
        const bubble = div.querySelector('.chatbot-msg-bubble');
        renderMathInElement(bubble, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
            ],
            throwOnError: false
        });
    }

    // Activar links internos de navegación
    div.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = link.getAttribute('href').substring(1);
            if (typeof navigate === 'function') {
                navigate(hash);
            } else {
                location.hash = hash;
            }
        });
    });

    // Ocultar sugerencias después del primer mensaje
    if (chatState.messages.length > 1) {
        const suggestions = document.getElementById('chatbot-suggestions');
        if (suggestions) suggestions.style.display = 'none';
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chatbot-messages');
    const indicator = document.createElement('div');
    indicator.id = 'chatbot-typing';
    indicator.className = 'chatbot-msg chatbot-msg-bot chatbot-typing';
    indicator.innerHTML = `
    <div class="chatbot-msg-avatar">
      <i class="fa-solid fa-atom fa-spin" style="--fa-animation-duration: 2s;"></i>
    </div>
    <div class="chatbot-msg-bubble chatbot-typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
    container.appendChild(indicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('chatbot-typing');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chatbot-messages');
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

// ════════════════════════════════════════════
// 7. FORMATEO DE MENSAJES
// ════════════════════════════════════════════
function formatBotMessage(text) {
    // Primero proteger los bloques LaTeX para que no se afecten por markdown
    const latexBlocks = [];
    let processed = text;

    // Proteger bloques $$ ... $$
    processed = processed.replace(/\$\$([^$]+?)\$\$/g, (match) => {
        latexBlocks.push(match);
        return `%%LATEX_BLOCK_${latexBlocks.length - 1}%%`;
    });

    // Proteger inline \( ... \)
    processed = processed.replace(/\\\((.+?)\\\)/g, (match) => {
        latexBlocks.push(match);
        return `%%LATEX_BLOCK_${latexBlocks.length - 1}%%`;
    });

    // Markdown básico
    // Negrita
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Cursiva
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Links internos [texto](#hash)
    processed = processed.replace(/\[([^\]]+)\]\(#([^)]+)\)/g, '<a href="#$2" class="chatbot-link">$1</a>');
    // Links externos [texto](url)
    processed = processed.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="chatbot-link-ext">$1 ↗</a>');
    // Listas con números
    processed = processed.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="chatbot-list-num">$2</li>');
    // Listas con guion
    processed = processed.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
    // Envolver <li> consecutivos en <ul>
    processed = processed.replace(/((<li[^>]*>.*?<\/li>\s*)+)/g, '<ul class="chatbot-list">$1</ul>');
    // Párrafos (saltos de línea dobles)
    processed = processed.replace(/\n\n/g, '</p><p>');
    // Saltos de línea simples
    processed = processed.replace(/\n/g, '<br>');

    // Restaurar bloques LaTeX
    latexBlocks.forEach((block, i) => {
        processed = processed.replace(`%%LATEX_BLOCK_${i}%%`, block);
    });

    return `<p>${processed}</p>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ════════════════════════════════════════════
// 8. ENVÍO DE MENSAJES A GEMINI
// ════════════════════════════════════════════
async function sendMessage() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text || chatState.isLoading) return;

    // Verificar API key
    if (!chatState.apiKey) {
        showApiSetup();
        return;
    }

    // Mostrar mensaje del usuario
    addUserMessage(text);
    input.value = '';
    input.focus();

    // Agregar al historial de conversación
    chatState.conversationHistory.push({
        role: 'user',
        parts: [{ text: text }]
    });

    // Mostrar indicador de carga
    chatState.isLoading = true;
    showTypingIndicator();
    document.getElementById('chatbot-send').disabled = true;

    try {
        const response = await callGeminiAPI(text);
        removeTypingIndicator();
        addBotMessage(response);

        // Agregar respuesta al historial
        chatState.conversationHistory.push({
            role: 'model',
            parts: [{ text: response }]
        });

    } catch (error) {
        removeTypingIndicator();
        console.error('Chatbot error:', error);

        if (error.message.includes('API key')) {
            addBotMessage('⚠️ **API Key inválida o expirada.** Por favor, verifica tu clave haciendo clic en el ícono de ⚙️ configuración.');
            chatState.apiKey = '';
            localStorage.removeItem(CHATBOT_CONFIG.storageKeyApi);
        } else if (error.message.includes('quota') || error.message.includes('429')) {
            addBotMessage('⏳ **Se alcanzó el límite de solicitudes.** Espera unos segundos e intenta de nuevo. La API gratuita tiene un límite de solicitudes por minuto.');
        } else {
            addBotMessage(`❌ **Error al obtener respuesta:** ${error.message}\n\nIntenta de nuevo en unos momentos.`);
        }
    } finally {
        chatState.isLoading = false;
        document.getElementById('chatbot-send').disabled = false;
    }
}

async function callGeminiAPI(userMessage) {
    const systemPrompt = buildSystemPrompt();

    // Detectar contexto adicional: en qué vista está el usuario
    let contextExtra = '';
    if (typeof state !== 'undefined') {
        if (state.currentView === 'tema' && state.currentTopic) {
            contextExtra = `\n\n[CONTEXTO: El usuario está viendo actualmente el tema "${state.currentTopic.title}" (Tema ${state.currentTopic.number})]`;
        } else if (state.currentView === 'recursos') {
            contextExtra = '\n\n[CONTEXTO: El usuario está en la sección de Recursos]';
        } else if (state.currentView === 'inicio') {
            contextExtra = '\n\n[CONTEXTO: El usuario está en la página de inicio]';
        }
    }

    // Construir el cuerpo de la solicitud
    const body = {
        system_instruction: {
            parts: [{ text: systemPrompt + contextExtra }]
        },
        contents: chatState.conversationHistory.slice(-20), // Últimos 20 mensajes para contexto
        generationConfig: {
            temperature: CHATBOT_CONFIG.temperature,
            maxOutputTokens: CHATBOT_CONFIG.maxTokens,
            topP: 0.95,
            topK: 40
        }
    };

    const activeModel = chatState.model || CHATBOT_CONFIG.model;
    const url = `${CHATBOT_CONFIG.apiUrl}${activeModel}:generateContent?key=${chatState.apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;

        if (response.status === 400 && errorMsg.toLowerCase().includes('api key')) {
            throw new Error('API key inválida');
        }
        if (response.status === 429) {
            throw new Error('quota exceeded (429)');
        }
        throw new Error(errorMsg);
    }

    const data = await response.json();

    // Extraer texto de la respuesta
    const candidates = data?.candidates;
    if (!candidates || candidates.length === 0) {
        throw new Error('No se recibió respuesta del modelo');
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
        throw new Error('Respuesta vacía del modelo');
    }

    return parts.map(p => p.text).join('');
}

// ════════════════════════════════════════════
// 9. INICIALIZACIÓN
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    createChatbotDOM();
});
