/* ═══════════════════════════════════════════════════════════════
 *   Práctica: ESP32 como servidor web — Control LED + Gauge
 *   ─────────────────────────────────────────────────────────────
 *   ¿Qué hace este programa?
 *   - Conecta el ESP32 a una red WiFi
 *   - Lee continuamente el potenciómetro (GPIO34)
 *   - Permite encender/apagar el LED (GPIO4) desde el navegador
 *   - Sirve una página web con interruptor + gauge de Google Charts
 *
 *   Profesor: Msc. Néstor Fabio Montoya Palacios
 * ═══════════════════════════════════════════════════════════════ */


// Librerías necesarias
#include <WiFi.h>
#include <WebServer.h>


// ─── CONFIGURACIÓN DE WIFI (CAMBIAR AQUÍ) ─────────────────────
const char* miSSID     = "";    // Reemplaza con el nombre real
const char* miPASSWORD = "";   // Reemplaza con la contraseña real

// Pines utilizados
const int pinPotenciometro = 34;   // GPIO34: entrada del potenciómetro
const int pinLED = 4;              // GPIO4:  salida digital para el LED

// Variables globales
bool ledEncendido = false;          // Estado actual del LED
WebServer servidor(80);             // Servidor web en el puerto 80


// ═══════════════════════════════════════════════════════════════
//   PÁGINA WEB (HTML + CSS + JavaScript)
// ═══════════════════════════════════════════════════════════════
const char paginaWeb[] PROGMEM = R"=====(
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 - Control y Monitor</title>

  <!-- Cargar Google Charts (para el gauge) -->
  <script src="https://www.gstatic.com/charts/loader.js"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #0A2540 0%, #1E3A8A 100%);
      min-height: 100vh;
      color: white;
      padding: 20px;
    }

    .contenedor {
      max-width: 900px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      font-size: 2rem;
      margin-bottom: 10px;
      color: #FEF3C7;
    }

    .subtitulo {
      text-align: center;
      font-style: italic;
      color: #DBEAFE;
      margin-bottom: 30px;
    }

    .paneles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 25px;
      margin-bottom: 25px;
    }

    @media (max-width: 700px) {
      .paneles { grid-template-columns: 1fr; }
    }

    .panel {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .panel h2 {
      color: #D4AF37;
      margin-bottom: 20px;
      text-align: center;
      font-size: 1.3rem;
    }

    /* ═══ Interruptor estilo industrial (Uiverse - Nawsome) ═══ */
    .switch-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px 0;
    }

    .switch {
      display: block;
      background-color: black;
      width: 150px;
      height: 195px;
      box-shadow: 0 0 10px 2px rgba(0, 0, 0, 0.2),
                  0 0 1px 2px black,
                  inset 0 2px 2px -2px white,
                  inset 0 0 2px 15px #47434c,
                  inset 0 0 2px 22px black;
      border-radius: 5px;
      padding: 20px;
      perspective: 700px;
    }

    .switch input { display: none; }

    .switch input:checked + .button {
      transform: translateZ(20px) rotateX(25deg);
      box-shadow: 0 -10px 20px #ff1818;
    }

    .switch input:checked + .button .light {
      animation: flicker 0.2s infinite 0.3s;
    }

    .switch input:checked + .button .shine { opacity: 1; }
    .switch input:checked + .button .shadow { opacity: 0; }

    .switch .button {
      display: block;
      transition: all 0.3s cubic-bezier(1, 0, 1, 1);
      transform-origin: center center -20px;
      transform: translateZ(20px) rotateX(-25deg);
      transform-style: preserve-3d;
      background-color: #9b0621;
      height: 100%;
      position: relative;
      cursor: pointer;
      background: linear-gradient(#980000 0%, #6f0000 30%, #6f0000 70%, #980000 100%);
      background-repeat: no-repeat;
    }

    .switch .button::before {
      content: "";
      background: linear-gradient(rgba(255,255,255,0.8) 10%, rgba(255,255,255,0.3) 30%, #650000 75%, #320000) 50% 50%/97% 97%, #b10000;
      background-repeat: no-repeat;
      width: 100%;
      height: 50px;
      transform-origin: top;
      transform: rotateX(-90deg);
      position: absolute;
      top: 0;
    }

    .switch .button::after {
      content: "";
      background-image: linear-gradient(#650000, #320000);
      width: 100%;
      height: 50px;
      transform-origin: top;
      transform: translateY(50px) rotateX(-90deg);
      position: absolute;
      bottom: 0;
      box-shadow: 0 50px 8px 0px black, 0 80px 20px 0px rgba(0,0,0,0.5);
    }

    .switch .light {
      opacity: 0;
      animation: light-off 1s;
      position: absolute;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(#ffc97e, #ff1818 40%, transparent 70%);
    }

    .switch .dots {
      position: absolute;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(transparent 30%, rgba(101, 0, 0, 0.7) 70%);
      background-size: 10px 10px;
    }

    .switch .characters {
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(white, white) 50% 20%/5% 20%,
                  radial-gradient(circle, transparent 50%, white 52%, white 70%, transparent 72%) 50% 80%/33% 25%;
      background-repeat: no-repeat;
    }

    .switch .shine {
      transition: all 0.3s cubic-bezier(1, 0, 1, 1);
      opacity: 0.3;
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(white, transparent 3%) 50% 50%/97% 97%,
                  linear-gradient(rgba(255,255,255,0.5), transparent 50%, transparent 80%, rgba(255,255,255,0.5)) 50% 50%/97% 97%;
      background-repeat: no-repeat;
    }

    .switch .shadow {
      transition: all 0.3s cubic-bezier(1, 0, 1, 1);
      opacity: 1;
      position: absolute;
      width: 100%;
      height: 100%;
      background: linear-gradient(transparent 70%, rgba(0,0,0,0.8));
      background-repeat: no-repeat;
    }

    @keyframes flicker {
      0%   { opacity: 1; }
      80%  { opacity: 0.8; }
      100% { opacity: 1; }
    }

    @keyframes light-off {
      0%  { opacity: 1; }
      80% { opacity: 0; }
    }

    /* ═══ Estado del LED (texto bajo el switch) ═══ */
    .estado-led {
      text-align: center;
      margin-top: 15px;
      font-size: 1.1rem;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .estado-encendido { color: #FCA5A5; text-shadow: 0 0 10px #DC2626; }
    .estado-apagado   { color: #9CA3AF; }

    /* ═══ Gauge ═══ */
    #gauge {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    /* ═══ Datos numéricos ═══ */
    .datos {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 16px;
      padding: 25px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    @media (max-width: 600px) {
      .datos { grid-template-columns: 1fr; }
    }

    .dato {
      text-align: center;
    }

    .dato .etiqueta {
      font-size: 0.9rem;
      color: #DBEAFE;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .dato .valor {
      font-size: 2.2rem;
      font-weight: bold;
      color: #D4AF37;
      font-variant-numeric: tabular-nums;
    }

    .dato .unidad {
      font-size: 1rem;
      color: #9CA3AF;
      margin-left: 4px;
    }

    .pie {
      text-align: center;
      margin-top: 30px;
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <div class="contenedor">

    <h1>🔌 ESP32 — Control y Monitoreo</h1>
    <p class="subtitulo">Servidor web local con WiFi</p>

    <div class="paneles">

      <!-- Panel del interruptor del LED -->
      <div class="panel">
        <h2>Control del LED</h2>
        <div class="switch-wrapper">
          <label class="switch">
            <input type="checkbox" id="switchLED">
            <div class="button">
              <div class="light"></div>
              <div class="dots"></div>
              <div class="characters"></div>
              <div class="shine"></div>
              <div class="shadow"></div>
            </div>
          </label>
        </div>
        <div class="estado-led estado-apagado" id="estadoLED">LED APAGADO</div>
      </div>

      <!-- Panel del gauge -->
      <div class="panel">
        <h2>Lectura del Potenciómetro</h2>
        <div id="gauge"></div>
      </div>

    </div>

    <!-- Panel inferior con datos numéricos -->
    <div class="datos">
      <div class="dato">
        <div class="etiqueta">Valor ADC</div>
        <div class="valor"><span id="valorADC">0</span></div>
      </div>
      <div class="dato">
        <div class="etiqueta">Voltaje</div>
        <div class="valor"><span id="valorVoltaje">0.00</span><span class="unidad">V</span></div>
      </div>
      <div class="dato">
        <div class="etiqueta">Porcentaje</div>
        <div class="valor"><span id="valorPorcentaje">0</span><span class="unidad">%</span></div>
      </div>
    </div>

    <p class="pie">Msc. Néstor Fabio Montoya Palacios — iemauxicartago.edu.co/Fisica/</p>

  </div>


  <script>
    // ─── Variables globales del Gauge ───
    let gauge = null;
    let datosGauge = null;

    // ─── Inicializar Google Charts ───
    google.charts.load('current', { packages: ['gauge'] });
    google.charts.setOnLoadCallback(iniciarGauge);

    function iniciarGauge() {
      datosGauge = google.visualization.arrayToDataTable([
        ['Etiqueta', 'Valor'],
        ['Voltaje', 0]
      ]);

      const opciones = {
        width: 320, height: 320,
        min: 0, max: 3.3,
        redFrom: 2.7, redTo: 3.3,
        yellowFrom: 1.8, yellowTo: 2.7,
        greenFrom: 0, greenTo: 1.8,
        minorTicks: 5,
        majorTicks: ['0', '0.66', '1.32', '1.98', '2.64', '3.3']
      };

      gauge = new google.visualization.Gauge(document.getElementById('gauge'));
      gauge.draw(datosGauge, opciones);

      // Comenzar a leer datos cada 500 ms
      setInterval(actualizarDatos, 500);
    }

    // ─── Pedir datos al ESP32 cada 500 ms ───
    function actualizarDatos() {
      fetch('/datos')
        .then(respuesta => respuesta.json())
        .then(datos => {
          // Actualizar el gauge con el voltaje
          datosGauge.setValue(0, 1, datos.voltaje);
          gauge.draw(datosGauge);

          // Actualizar números
          document.getElementById('valorADC').textContent = datos.adc;
          document.getElementById('valorVoltaje').textContent = datos.voltaje.toFixed(2);
          document.getElementById('valorPorcentaje').textContent = datos.porcentaje;
        })
        .catch(error => console.error('Error al leer datos:', error));
    }

    // ─── Manejar el interruptor del LED ───
    document.getElementById('switchLED').addEventListener('change', function() {
      const encendido = this.checked;
      const estado = document.getElementById('estadoLED');

      // Enviar al ESP32 el nuevo estado
      fetch('/led?estado=' + (encendido ? 'on' : 'off'))
        .then(respuesta => respuesta.text())
        .then(() => {
          if (encendido) {
            estado.textContent = '⚡ LED ENCENDIDO';
            estado.className = 'estado-led estado-encendido';
          } else {
            estado.textContent = 'LED APAGADO';
            estado.className = 'estado-led estado-apagado';
          }
        })
        .catch(error => console.error('Error al cambiar LED:', error));
    });
  </script>
</body>
</html>
)=====";


// ═══════════════════════════════════════════════════════════════
//   FUNCIONES QUE RESPONDEN A LAS PETICIONES DEL NAVEGADOR
// ═══════════════════════════════════════════════════════════════

// Cuando el navegador pide la página principal "/"
void manejarPaginaPrincipal() {
  servidor.send(200, "text/html", paginaWeb);
}

// Cuando el navegador pide los datos del potenciómetro "/datos"
void manejarDatos() {
  int valorADC = analogRead(pinPotenciometro);
  float voltaje = (valorADC * 3.3) / 4095.0;
  int porcentaje = map(valorADC, 0, 4095, 0, 100);

  // Devolvemos los datos en formato JSON
  String json = "{";
  json += "\"adc\":" + String(valorADC) + ",";
  json += "\"voltaje\":" + String(voltaje, 2) + ",";
  json += "\"porcentaje\":" + String(porcentaje);
  json += "}";

  servidor.send(200, "application/json", json);
}

// Cuando el navegador pide encender/apagar el LED "/led?estado=on"
void manejarLED() {
  String estado = servidor.arg("estado");

  if (estado == "on") {
    digitalWrite(pinLED, HIGH);
    ledEncendido = true;
    Serial.println("LED encendido desde navegador");
  } else if (estado == "off") {
    digitalWrite(pinLED, LOW);
    ledEncendido = false;
    Serial.println("LED apagado desde navegador");
  }

  servidor.send(200, "text/plain", ledEncendido ? "ON" : "OFF");
}


// ═══════════════════════════════════════════════════════════════
//   SETUP: configuración inicial
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  // Configuración de pines
  pinMode(pinPotenciometro, INPUT);
  pinMode(pinLED, OUTPUT);
  digitalWrite(pinLED, LOW);   // LED apagado al inicio

  // ─── Conexión a WiFi ───
  Serial.println();
  Serial.print("Conectando a WiFi: ");
  Serial.println(miSSID);

  WiFi.begin(miSSID, miPASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("¡WiFi conectado!");
  Serial.print("Dirección IP del ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.println("→ Abre esta dirección en tu navegador");

  // ─── Configurar las rutas del servidor ───
  servidor.on("/", manejarPaginaPrincipal);
  servidor.on("/datos", manejarDatos);
  servidor.on("/led", manejarLED);

  // ─── Iniciar el servidor ───
  servidor.begin();
  Serial.println("Servidor web iniciado");
}


// ═══════════════════════════════════════════════════════════════
//   LOOP: atender peticiones del navegador
// ═══════════════════════════════════════════════════════════════
void loop() {
  servidor.handleClient();   // Atender peticiones entrantes
}