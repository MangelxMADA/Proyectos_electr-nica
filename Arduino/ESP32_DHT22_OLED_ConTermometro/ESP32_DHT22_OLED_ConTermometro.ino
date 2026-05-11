/*  ═══════════════════════════════════════════════════════════════════
    ESP32 + DHT22 (GPIO 4) + OLED SSD1306 (I2C, 0x3C)
    Termo-higrómetro con termómetro gráfico a la izquierda
    ───────────────────────────────────────────────────────────────────
    Autor base: Msc. Néstor Fabio Montoya Palacios
    Versión revisada: asistida por IA
    ───────────────────────────────────────────────────────────────────
    Librerías a instalar desde el Gestor de Bibliotecas del IDE:
        · Adafruit SSD1306
        · Adafruit GFX Library
        · DHT sensor library (by Adafruit)
        · Adafruit Unified Sensor

    Conexiones:
        ┌──────────┬───────────┬─────────────┐
        │ Módulo   │ Pin       │ ESP32       │
        ├──────────┼───────────┼─────────────┤
        │ OLED     │ GND       │ GND         │
        │ OLED     │ VDD       │ 3V3         │
        │ OLED     │ SCK (SCL) │ GPIO 22     │
        │ OLED     │ SDA       │ GPIO 21     │
        ├──────────┼───────────┼─────────────┤
        │ DHT22    │ +  (VCC)  │ 3V3         │
        │ DHT22    │ OUT       │ GPIO 4      │
        │ DHT22    │ -  (GND)  │ GND         │
        └──────────┴───────────┴─────────────┘

    Layout de la pantalla (128 x 64 px):

        ┌────────────────────────────────┐
        │   ███  Temperatura:            │
        │  █   █    25.6°C               │
        │  █   █                         │
        │  █▓▓▓█  Humedad:               │
        │  █▓▓▓█    62.3 %               │
        │  █▓▓▓█                         │
        │  █▓▓▓█                         │
        │   ▓▓▓                          │
        └────────────────────────────────┘
         Termómetro         Valores
         (0–40°C)         (tamaño x2)
    ═══════════════════════════════════════════════════════════════════ */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"


// ─── 1.  Configuración de la pantalla OLED ──────────────────────────
#define ANCHO      128
#define ALTO        64
#define DIR_OLED  0x3C   // si no inicia, prueba con 0x3D

Adafruit_SSD1306 oled(ANCHO, ALTO, &Wire, -1);


// ─── 2.  Configuración del sensor DHT22 ─────────────────────────────
#define PIN_DHT    4
#define TIPO_DHT   DHT22

/*  El "22" NO es el modelo del sensor: es un ajuste de temporización
    necesario para procesadores rápidos como el ESP32 (240 MHz). */
DHT dht(PIN_DHT, TIPO_DHT, 22);


// ─── 3.  Rango visual del termómetro ───────────────────────────────
/*  Define la escala del "mercurio".  Ajústalo al clima de tu zona:
    para Cartago (Valle) un rango 10–40°C representa mejor el rango
    útil que 0–40°C, porque nunca verás temperaturas bajo cero. */
const float T_MIN =  0.0;    // °C -> tubo vacío
const float T_MAX = 40.0;    // °C -> tubo lleno


// ─── 4.  Intervalo entre lecturas ──────────────────────────────────
/*  El DHT22 no soporta lecturas más rápidas que 1 cada 2 s. */
const uint32_t INTERVALO_MS = 2000;


// ─── 5.  Memoria del último valor válido ───────────────────────────
float ultimaT = NAN;
float ultimaH = NAN;



/* ════════════════════════════════════════════════════════════════════
   FUNCIÓN: dibujarTermometro(tempC)
   ────────────────────────────────────────────────────────────────────
   Pinta un termómetro clásico (tubo rectangular + bulbo redondo)
   en la esquina izquierda de la pantalla, con el "mercurio"
   proporcional a la temperatura recibida.
   ════════════════════════════════════════════════════════════════════ */
void dibujarTermometro(float tempC) {

    // (a) Recortar al rango visible
    if (tempC < T_MIN) tempC = T_MIN;
    if (tempC > T_MAX) tempC = T_MAX;

    // (b) Geometría del termómetro (todas las medidas en píxeles)
    const int x_tubo    =  4;   // borde izquierdo del tubo
    const int y_tubo    =  4;   // parte superior del tubo
    const int ancho     = 10;   // ancho del tubo
    const int alto_tubo = 42;   // altura del tubo (sin el bulbo)
    const int r_bulbo   =  7;   // radio del bulbo inferior

    int cx = x_tubo + ancho / 2;                 // centro X del bulbo
    int cy = y_tubo + alto_tubo + r_bulbo - 1;   // centro Y del bulbo

    // (c) Contorno del tubo y del bulbo (sólo líneas blancas)
    oled.drawRect  (x_tubo, y_tubo, ancho, alto_tubo, SSD1306_WHITE);
    oled.drawCircle(cx, cy, r_bulbo, SSD1306_WHITE);

    // (d) Tres marcas laterales: máximo, medio y mínimo
    int x_marca = x_tubo + ancho + 1;
    oled.drawFastHLine(x_marca, y_tubo,                 3, SSD1306_WHITE);
    oled.drawFastHLine(x_marca, y_tubo + alto_tubo/2,   3, SSD1306_WHITE);
    oled.drawFastHLine(x_marca, y_tubo + alto_tubo - 1, 3, SSD1306_WHITE);

    // (e) Calcular qué proporción del tubo llenar (0.0 a 1.0)
    float prop  = (tempC - T_MIN) / (T_MAX - T_MIN);
    int   nivel = (int)(prop * alto_tubo);
    int   y_niv = y_tubo + alto_tubo - nivel;   // arranque del mercurio

    // (f) Pintar el mercurio: bulbo siempre lleno + columna variable
    oled.fillCircle(cx, cy, r_bulbo - 2, SSD1306_WHITE);
    if (nivel > 0) {
        oled.fillRect(x_tubo + 2, y_niv, ancho - 4, nivel, SSD1306_WHITE);
    }
}



/* ════════════════════════════════════════════════════════════════════
   FUNCIÓN: mostrarDatos(t, h)
   ────────────────────────────────────────────────────────────────────
   Layout:
       · Termómetro gráfico a la izquierda  (x = 4..22)
       · Valores numéricos a la derecha     (x = 28..127)
   ════════════════════════════════════════════════════════════════════ */
void mostrarDatos(float t, float h) {

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    // ── Termómetro gráfico (lado izquierdo) ──
    dibujarTermometro(t);

    // ── Etiqueta de temperatura (pequeña) ──
    oled.setTextSize(1);
    oled.setCursor(30, 2);
    oled.print("Temperatura:");

    // ── Valor de temperatura (GRANDE) ──
    oled.setTextSize(2);
    oled.setCursor(30, 12);
    oled.print(t, 1);
    oled.print((char)248);      // símbolo ° (grado) en CP437
    oled.print("C");

    // ── Etiqueta de humedad (pequeña) ──
    oled.setTextSize(1);
    oled.setCursor(30, 36);
    oled.print("Humedad:");

    // ── Valor de humedad (GRANDE) ──
    oled.setTextSize(2);
    oled.setCursor(30, 46);
    oled.print(h, 1);
    oled.print(" %");

    // Enviar todo lo pintado a la pantalla
    oled.display();
}



/* ════════════════════════════════════════════════════════════════════
   setup()  —  se ejecuta UNA sola vez al encender o resetear
   ════════════════════════════════════════════════════════════════════ */
void setup() {

    Serial.begin(115200);
    delay(200);
    Serial.println("\n=== ESP32 + DHT22 + OLED (con termometro) ===");

    Wire.begin(21, 22);   // SDA=21, SCL=22

    if (!oled.begin(SSD1306_SWITCHCAPVCC, DIR_OLED)) {
        Serial.println("ERROR: OLED no detectada. Revisa cableado/direccion.");
        while (true) delay(10);
    }

    dht.begin();

    // Pantalla de bienvenida mientras el DHT se estabiliza
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setCursor(0, 16);
    oled.println("  ESP32 + DHT22");
    oled.println("");
    oled.println("  Leyendo sensor...");
    oled.display();
    delay(2000);
}



/* ════════════════════════════════════════════════════════════════════
   loop()  —  se ejecuta una y otra vez, para siempre
   ════════════════════════════════════════════════════════════════════ */
void loop() {

    // (1) Pedirle al sensor sus dos magnitudes
    float t = dht.readTemperature();   // °C
    float h = dht.readHumidity();      // %

    // (2) Verificar si la lectura fue válida
    if (isnan(t) || isnan(h)) {
        Serial.println("Lectura fallida, reintentando...");
    } else {
        ultimaT = t;
        ultimaH = h;
        Serial.print("T = ");  Serial.print(t, 1);  Serial.print(" C   ");
        Serial.print("H = ");  Serial.print(h, 1);  Serial.println(" %");
    }

    // (3) Redibujar la pantalla si ya tenemos al menos una lectura buena
    if (!isnan(ultimaT)) {
        mostrarDatos(ultimaT, ultimaH);
    }

    // (4) Esperar antes de la próxima lectura
    delay(INTERVALO_MS);
}
