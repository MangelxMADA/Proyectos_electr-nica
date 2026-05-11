/*
 * ════════════════════════════════════════════════════
 *  Control de LED por teclado Serial - ESP32
 *  Tecla 'a' → Enciende el LED
 *  Tecla 'b' → Apaga el LED
 *  Autor : Msc. Néstor Fabio Montoya Palacios
 *  Fecha : 2026
 *  Board : ESP32 Dev Module
 * ════════════════════════════════════════════════════
 */

const int PIN_LED = 4;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  Serial.println("Presiona 'a' para encender el LED");
  Serial.println("Presiona 'b' para apagar el LED");
}

void loop() {

  if (Serial.available() > 0) {

    char tecla = Serial.read();

    if (tecla == 'a' || tecla == 'A') {
      digitalWrite(PIN_LED, HIGH);
      Serial.println("LED ENCENDIDO");

    } else if (tecla == 'b' || tecla == 'B') {
      digitalWrite(PIN_LED, LOW);
      Serial.println("LED APAGADO");
    }
  }
}