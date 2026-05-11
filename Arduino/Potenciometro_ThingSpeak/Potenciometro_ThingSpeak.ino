/* ═══════════════════════════════════════════════════════════════
 *   Práctica: ESP32 + ThingSpeak — Graficar voltaje y estado del LED
 *   ─────────────────────────────────────────────────────────────
 *   ¿Qué hace este programa?
 *   1) Conecta el ESP32 a una red WiFi
 *   2) Lee el potenciómetro (GPIO34) y calcula el voltaje (0–3.3 V)
 *   3) Cada 20 segundos, alterna el estado del LED (GPIO4)
 *      y enciende/apaga el LED físico
 *   4) Envía a ThingSpeak DOS valores en una sola petición:
 *         Field 1 → voltaje del potenciómetro
 *         Field 2 → estado del LED (1 = ON, 0 = OFF)
 *   5) ThingSpeak guarda los datos y los grafica automáticamente
 *      en la nube — entras a tu canal y ves el gauge y la lámpara
 *      desde cualquier celular o computador del mundo.
 *
 *   ¿Por qué cada 20 segundos y no más rápido?
 *   ThingSpeak (cuenta gratuita) acepta máximo 1 dato cada 15 s
 *   por canal. Usamos 20 s para tener un margen seguro.
 *
 *   Profesor: Msc. Néstor Fabio Montoya Palacios
 * ═══════════════════════════════════════════════════════════════ */


// ─── Librerías necesarias ────────────────────────────────────
// IMPORTANTE: hay que instalar la librería "ThingSpeak" de
// MathWorks desde el gestor de bibliotecas de Arduino IDE
// (Programa → Incluir librería → Administrar bibliotecas →
//  buscar "ThingSpeak" → Instalar la de MathWorks).
#include <WiFi.h>
#include <ThingSpeak.h>


// ─── 1. CONFIGURACIÓN DE WIFI (CAMBIAR AQUÍ) ─────────────────
const char* miSSID     = "";       // ← tu red WiFi (2.4 GHz)
const char* miPASSWORD = "";   // ← tu contraseña


// ─── 2. CONFIGURACIÓN DE THINGSPEAK (CAMBIAR AQUÍ) ───────────
//   Cómo obtener estos dos valores:
//   a) Crea una cuenta gratis en https://thingspeak.mathworks.com
//   b) Crea un canal nuevo (New Channel) con dos campos:
//        Field 1  →  Potenciometro
//        Field 2  →  Led
//   c) En la pestaña "API Keys" del canal copia:
//        - Channel ID    (un número, ej. 3366315)
//        - Write API Key (16 caracteres, ej. ZVIZQHL2XNXSRJFD)
unsigned long  idDelCanal     = 0;             // ← TU Channel ID
const char*    claveEscritura = "";  // ← TU Write API Key


// ─── 3. PINES UTILIZADOS ─────────────────────────────────────
const int pinPotenciometro = 34;   // GPIO34 → entrada analógica
const int pinLED           = 4;    // GPIO4  → salida digital


// ─── 4. INTERVALO DE ENVÍO ───────────────────────────────────
const unsigned long INTERVALO_MS = 20000;   // 20 segundos
unsigned long ultimoEnvio = 0;


// ─── 5. ESTADO DEL LED ───────────────────────────────────────
// Cada vez que enviamos datos a ThingSpeak, alternamos el LED
// para que la gráfica muestre cambios visibles. Empieza apagado.
bool ledEncendido = false;


// ─── 6. CLIENTE WIFI ─────────────────────────────────────────
//   La librería ThingSpeak necesita un objeto WiFiClient para
//   comunicarse por internet con los servidores de MathWorks.
WiFiClient cliente;


// ═══════════════════════════════════════════════════════════════
//   SETUP: se ejecuta una sola vez al encender el ESP32
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);

  // Configurar pines
  pinMode(pinPotenciometro, INPUT);
  pinMode(pinLED, OUTPUT);
  digitalWrite(pinLED, LOW);          // LED apagado al inicio


  // ─── Conectar a WiFi ───────────────────────────────────────
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


  // ─── Iniciar la comunicación con ThingSpeak ───────────────
  //   Esta línea le dice a la librería que use el cliente WiFi
  //   que acabamos de crear para hablar con la nube de MathWorks.
  ThingSpeak.begin(cliente);

  Serial.println("Listo: enviaré datos cada 20 segundos.");
  Serial.println("------------------------------------------");
}


// ═══════════════════════════════════════════════════════════════
//   LOOP: se ejecuta una y otra vez infinitamente
// ═══════════════════════════════════════════════════════════════
void loop() {

  // Solo entrar al envío cada INTERVALO_MS milisegundos.
  // Mientras tanto el loop sigue girando (sin delay bloqueante).
  unsigned long ahora = millis();
  if (ahora - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = ahora;


  // PASO 1: Leer el potenciómetro (valor entre 0 y 4095)
  int valorADC = analogRead(pinPotenciometro);

  // PASO 2: Convertir a voltaje (entre 0.00 V y 3.30 V)
  float voltaje = (valorADC * 3.3) / 4095.0;

  // PASO 3: Alternar el estado del LED (encender / apagar)
  ledEncendido = !ledEncendido;
  digitalWrite(pinLED, ledEncendido ? HIGH : LOW);

  // PASO 4: Mostrar por puerto serial
  Serial.print("Voltaje: "); Serial.print(voltaje, 2);
  Serial.print(" V   LED: ");
  Serial.print(ledEncendido ? "ON " : "OFF");
  Serial.print("   →  Enviando a ThingSpeak... ");


  // PASO 5: Preparar los dos campos antes de enviar
  //   setField(numeroDeCampo, valor) guarda el valor en una
  //   "memoria temporal". Cuando llamamos a writeFields() se
  //   envían TODOS los campos juntos en una sola petición HTTP.
  //   Esto es importante porque ThingSpeak limita a 1 petición
  //   cada 15 segundos, no 1 por cada campo.
  ThingSpeak.setField(1, voltaje);                 // → Field 1
  ThingSpeak.setField(2, ledEncendido ? 1 : 0);    // → Field 2


  // PASO 6: Enviar todos los campos a la nube
  //   writeFields devuelve 200 si todo salió bien.
  //   Otros códigos comunes:
  //     -301: no se pudo conectar (revisa WiFi)
  //     -401: API Key incorrecta
  //     -210: campo no válido
  int respuesta = ThingSpeak.writeFields(idDelCanal, claveEscritura);

  if (respuesta == 200) {
    Serial.println("✓ OK");
  } else {
    Serial.print("✗ Error  (código: ");
    Serial.print(respuesta);
    Serial.println(")");
  }
}