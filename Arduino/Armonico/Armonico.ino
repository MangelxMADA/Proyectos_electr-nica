#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

// ── Configuración pantalla ──────────────────────────────────────────
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1
#define OLED_ADDR    0x3C

// Pines I2C del ESP32
#define PIN_SDA 21
#define PIN_SCL 22

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

/*
* Modo de uso
A:15        → Amplitud de 15 píxeles (onda más pequeña)
A:28        → Amplitud máxima

F:0.5       → Media oscilación por segundo (onda lenta)
F:3         → 3 oscilaciones por segundo (onda rápida)

P:1.57      → Fase de π/2 (la onda empieza en el pico)
P:3.14      → Fase de π (la onda empieza invertida)

B:0.2       → Amortiguamiento leve (la onda se va apagando)
B:1.0       → Amortiguamiento fuerte (se apaga rápido)
B:0         → Sin amortiguamiento (oscilación perpetua)

?           → Ver todos los valores actuales
R           → Resetear todo a valores iniciales
*/
// ── Parámetros del MHS ──────────────────────────────────────────────
float amplitud    = 25.0;   // píxeles (máx ~28 para que quepa)
float frecuencia  = 1.0;    // Hz
float fase        = 0.0;    // radianes
float amort       = 0.0;    // coeficiente de amortiguamiento (0 = sin amort.)

// ── Variables internas ──────────────────────────────────────────────
float tiempoOffset = 0.0;
unsigned long tAnterior = 0;
bool nuevosParametros = false;
String inputBuffer = "";

// ── Prototipos ──────────────────────────────────────────────────────
void procesarSerial();
void mostrarParametros();
void dibujarGrafica();
float calcY(float t);

// ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  // Inicializar I2C con pines específicos del ESP32
  Wire.begin(PIN_SDA, PIN_SCL);

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("ERROR: No se encontró la pantalla SSD1306.");
    Serial.println("Verifica conexiones: SDA=21, SCL=22, VCC=3.3V");
    while (true) delay(100);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.println("  MHS ESP32");
  display.setCursor(10, 35);
  display.println("Iniciando...");
  display.display();
  delay(1500);

  mostrarParametros();
  tAnterior = millis();

  Serial.println("========================================");
  Serial.println("  Movimiento Armonico Simple - ESP32");
  Serial.println("========================================");
  Serial.println("Comandos (escribe y presiona Enter):");
  Serial.println("  A:<valor>   Amplitud en pixeles (1-28)");
  Serial.println("  F:<valor>   Frecuencia en Hz (0.1-10)");
  Serial.println("  P:<valor>   Fase en radianes (0-6.28)");
  Serial.println("  B:<valor>   Amortiguamiento (0.0-2.0)");
  Serial.println("  R           Reset parametros");
  Serial.println("  ?           Mostrar parametros actuales");
  Serial.println("Ejemplo:  A:20  o  F:2.5");
  Serial.println("========================================");
  mostrarParametrosSerial();
}

// ────────────────────────────────────────────────────────────────────
void loop() {
  procesarSerial();

  unsigned long ahora = millis();
  float dt = (ahora - tAnterior) / 1000.0;
  tAnterior = ahora;
  tiempoOffset += dt;

  // Re-dibujar a ~30 FPS
  static unsigned long ultimoDibujo = 0;
  if (ahora - ultimoDibujo >= 33) {
    ultimoDibujo = ahora;
    dibujarGrafica();
  }
}

// ── Lectura del puerto serial ────────────────────────────────────────
void procesarSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        inputBuffer.trim();
        inputBuffer.toUpperCase();

        if (inputBuffer == "R") {
          amplitud   = 25.0;
          frecuencia = 1.0;
          fase       = 0.0;
          amort      = 0.0;
          tiempoOffset = 0.0;
          Serial.println(">> Parametros reseteados.");
          mostrarParametrosSerial();

        } else if (inputBuffer == "?") {
          mostrarParametrosSerial();

        } else if (inputBuffer.startsWith("A:")) {
          float val = inputBuffer.substring(2).toFloat();
          if (val >= 1 && val <= 28) {
            amplitud = val;
            Serial.print(">> Amplitud = ");
            Serial.print(amplitud, 1);
            Serial.println(" px");
          } else {
            Serial.println(">> Error: Amplitud debe ser 1-28");
          }

        } else if (inputBuffer.startsWith("F:")) {
          float val = inputBuffer.substring(2).toFloat();
          if (val >= 0.1 && val <= 10.0) {
            frecuencia = val;
            tiempoOffset = 0.0;
            Serial.print(">> Frecuencia = ");
            Serial.print(frecuencia, 2);
            Serial.println(" Hz");
          } else {
            Serial.println(">> Error: Frecuencia debe ser 0.1-10 Hz");
          }

        } else if (inputBuffer.startsWith("P:")) {
          float val = inputBuffer.substring(2).toFloat();
          if (val >= 0 && val <= 6.29) {
            fase = val;
            Serial.print(">> Fase = ");
            Serial.print(fase, 2);
            Serial.println(" rad");
          } else {
            Serial.println(">> Error: Fase debe ser 0-6.28 rad");
          }

        } else if (inputBuffer.startsWith("B:")) {
          float val = inputBuffer.substring(2).toFloat();
          if (val >= 0 && val <= 2.0) {
            amort = val;
            tiempoOffset = 0.0;
            Serial.print(">> Amortiguamiento = ");
            Serial.println(amort, 3);
          } else {
            Serial.println(">> Error: Amortiguamiento debe ser 0.0-2.0");
          }

        } else {
          Serial.println(">> Comando no reconocido. Escribe ? para ayuda.");
        }
        inputBuffer = "";
      }
    } else {
      inputBuffer += c;
    }
  }
}

// ── Calcular posición Y del MHS en tiempo t ──────────────────────────
float calcY(float t) {
  float omega = 2.0 * PI * frecuencia;
  float decay = exp(-amort * t);
  return amplitud * decay * sin(omega * t + fase);
}

// ── Dibujar gráfica en pantalla OLED ────────────────────────────────
void dibujarGrafica() {
  display.clearDisplay();

  int cx = SCREEN_HEIGHT / 2;   // centro vertical = 32

  // Eje horizontal
  display.drawFastHLine(0, cx, SCREEN_WIDTH, SSD1306_WHITE);

  // Eje vertical
  display.drawFastVLine(4, 0, SCREEN_HEIGHT, SSD1306_WHITE);

  // Título
  display.setTextSize(1);
  display.setCursor(7, 1);
  display.print("MHS");

  // Parámetros compactos (parte superior derecha)
  display.setTextSize(1);
  display.setCursor(30, 1);
  display.print("A:");
  display.print((int)amplitud);
  display.print(" f:");
  display.print(frecuencia, 1);

  // Ventana temporal: muestra 2 periodos completos
  float periodo  = 1.0 / frecuencia;
  float ventana  = 2.0 * periodo;
  int pixStart   = 6;   // primer pixel X de la gráfica
  int pixEnd     = SCREEN_WIDTH - 2;
  int numPix     = pixEnd - pixStart;

  // Dibujar curva punto a punto
  int yPrev = 0;
  for (int px = 0; px < numPix; px++) {
    float tPlot = tiempoOffset + (float)px / numPix * ventana;
    float yVal  = calcY(tPlot);

    // Escalar: centro=32, hacia arriba negativo
    int yScreen = cx - (int)yVal;
    yScreen = constrain(yScreen, 1, SCREEN_HEIGHT - 1);

    int xScreen = pixStart + px;

    if (px == 0) {
      display.drawPixel(xScreen, yScreen, SSD1306_WHITE);
    } else {
      // Conectar con línea vertical para suavizar
      int y1 = yPrev, y2 = yScreen;
      if (y1 > y2) { int tmp = y1; y1 = y2; y2 = tmp; }
      for (int yy = y1; yy <= y2; yy++) {
        display.drawPixel(xScreen, yy, SSD1306_WHITE);
      }
    }
    yPrev = yScreen;
  }

  // Punto en tiempo actual (marcador)
  float yActual = calcY(tiempoOffset);
  int yDot = cx - (int)yActual;
  yDot = constrain(yDot, 2, SCREEN_HEIGHT - 2);
  display.fillCircle(pixStart, yDot, 2, SSD1306_WHITE);

  // Valor numérico actual abajo a la derecha
  display.setCursor(90, SCREEN_HEIGHT - 9);
  display.print("y=");
  display.print(yActual, 1);

  // Si hay amortiguamiento, mostrar indicador
  if (amort > 0.01) {
    display.setCursor(7, SCREEN_HEIGHT - 9);
    display.print("b:");
    display.print(amort, 2);
  }

  display.display();
}

// ── Mostrar parámetros en Serial Monitor ────────────────────────────
void mostrarParametrosSerial() {
  Serial.println("---- Parametros actuales ----");
  Serial.print("  Amplitud    (A): "); Serial.print(amplitud, 1);    Serial.println(" px");
  Serial.print("  Frecuencia  (F): "); Serial.print(frecuencia, 2);  Serial.println(" Hz");
  Serial.print("  Fase        (P): "); Serial.print(fase, 2);         Serial.println(" rad");
  Serial.print("  Amortiguam. (B): "); Serial.println(amort, 3);
  Serial.println("-----------------------------");
}

// ── Mostrar parámetros en OLED brevemente ───────────────────────────
void mostrarParametros() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);  display.print("A: "); display.print(amplitud,1);  display.println(" px");
  display.setCursor(0, 12); display.print("f: "); display.print(frecuencia,2); display.println(" Hz");
  display.setCursor(0, 24); display.print("phi: "); display.print(fase,2);     display.println(" rad");
  display.setCursor(0, 36); display.print("b: "); display.println(amort,3);
  display.display();
}