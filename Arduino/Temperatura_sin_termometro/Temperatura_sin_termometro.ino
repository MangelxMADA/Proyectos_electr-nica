#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

// ---------------------------
// Configuración de la OLED
// ---------------------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ---------------------------
// Configuración del DHT
// ---------------------------
#define DHTPIN 4        // Pin D4 del ESP32 = GPIO 4

// Cambia DHT11 por DHT22 si tu sensor es DHT22
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);

  // Inicia I2C con SDA=21 y SCL=22
  Wire.begin(21, 22);

  // Inicia pantalla OLED (dirección I2C típica: 0x3C)
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x7A)) {
    Serial.println("No se encontró la pantalla OLED");
    while (true);
  }

  // Inicia sensor DHT
  dht.begin();

  // Pantalla de inicio
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ESP32 + DHT + OLED");
  display.println("Iniciando...");
  display.display();

  delay(2000);
}

void loop() {
  // Espera entre lecturas del DHT
  delay(2000);

  float humedad = dht.readHumidity();
  float temperatura = dht.readTemperature(); // Celsius

  // Verifica si la lectura fallo
  if (isnan(humedad) || isnan(temperatura)) {
    Serial.println("Error al leer el sensor DHT");

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("Error al leer");
    display.println("el sensor DHT");
    display.display();
    return;
  }

  // Muestra en el monitor serial
  Serial.print("Temperatura: ");
  Serial.print(temperatura);
  Serial.println(" C");

  Serial.print("Humedad: ");
  Serial.print(humedad);
  Serial.println(" %");

  // Muestra en la OLED
  display.clearDisplay();

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Lectura ambiental");

  display.setTextSize(2);
  display.setCursor(0, 20);
  display.print(temperatura, 1);
  display.println(" C");

  display.setCursor(0, 45);
  display.print(humedad, 1);
  display.println(" %");

  display.display();
}