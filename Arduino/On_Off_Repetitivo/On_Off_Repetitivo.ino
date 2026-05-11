/*
 * ════════════════════════════════════════════════════
 *  Parpadeo de un LED conectado al pin D4 del ESP32
 *  Autor : Msc. Néstor Fabio Montoya Palacios
 *  Fecha : 2026
 *  Board : ESP32 Dev Module
 * ════════════════════════════════════════════════════
 */

// ── Configuración ──────────────────────────────────
const int PIN_LED        = 4;     // Pin GPIO donde está el LED
const int TIEMPO_ENCENDIDO  = 1000;  // Tiempo encendido  (ms)
const int TIEMPO_APAGADO    = 1000;  // Tiempo apagado    (ms)

// ── Setup ───────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("╔══════════════════════════════════╗");
  Serial.println("║  Parpadeo de LED con el ESP32    ║");
  Serial.println("╚══════════════════════════════════╝");

  // Establecemos el pin del LED como salida
  pinMode(PIN_LED, OUTPUT);

  // Apagamos el LED al iniciar
  digitalWrite(PIN_LED, LOW);
  Serial.println("► Sistema listo. Iniciando parpadeo...");
}

// ── Loop ────────────────────────────────────────────
void loop() {
  // Encendemos el LED
  digitalWrite(PIN_LED, HIGH);
  Serial.println("💡 LED: ENCENDIDO");
  delay(TIEMPO_ENCENDIDO);

  // Apagamos el LED   ← ¡esto faltaba en el código original!
  digitalWrite(PIN_LED, LOW);
  Serial.println("🌑 LED: APAGADO");
  delay(TIEMPO_APAGADO);
}