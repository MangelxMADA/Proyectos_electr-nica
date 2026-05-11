/* ═══════════════════════════════════════════════════════════════
 *   Práctica: Potenciómetro + LED + Bluetooth con ESP32
 *   ─────────────────────────────────────────────────────────────
 *   ¿Qué hace este programa?
 *   - Lee el potenciómetro (valor entre 0 y 4095)
 *   - Convierte ese valor en voltaje (entre 0 y 3.3 V)
 *   - Enciende el LED con brillo proporcional al voltaje
 *   - Muestra los datos en el monitor serial (cable USB)
 *   - Envía los datos al celular vía Bluetooth
 *
 *   App en el celular: Serial Bluetooth Terminal
 *
 *   Profesor: Msc. Néstor Fabio Montoya Palacios
 * ═══════════════════════════════════════════════════════════════ */


// Librería para usar Bluetooth Serial
#include "BluetoothSerial.h"

// Creamos un objeto Bluetooth (lo llamamos "BT")
BluetoothSerial BT;


// Pines utilizados
const int pinPotenciometro = 34;   // GPIO34: entrada del potenciómetro
const int pinLED = 4;              // GPIO4:  salida PWM para el LED

// Configuración del PWM (para controlar el brillo)
const int frecuenciaPWM = 5000;    // 5000 Hz
const int resolucionPWM = 8;       // 8 bits → valores de 0 a 255


void setup() {
  // Iniciamos la comunicación con el computador
  Serial.begin(115200);

  // Iniciamos el Bluetooth con un nombre visible para el celular
  BT.begin("EQUIPO_MARAVILLA");

  // Configuramos el pin del potenciómetro como entrada
  pinMode(pinPotenciometro, INPUT);

  // ─────────────────────────────────────────────────────────────
  //   ¿Qué es esta línea?
  //   ledcAttach configura el pin del LED para usar PWM.
  //
  //   ¿Qué es PWM?
  //   PWM significa "Modulación por Ancho de Pulso" (en inglés:
  //   Pulse Width Modulation). Es una forma de simular voltajes
  //   intermedios encendiendo y apagando el LED muy rápido.
  //
  //   ¿Cómo logra cambiar el brillo?
  //   - Si el LED está encendido el 100% del tiempo → brillo máximo
  //   - Si está encendido el 50% del tiempo → brillo medio
  //   - Si está encendido el 0% del tiempo → apagado
  //   Como el ojo humano no percibe el parpadeo (es muy rápido),
  //   vemos un brillo continuo.
  //
  //   ¿Qué significan los tres parámetros?
  //   1) pinLED         → en qué pin queremos usar PWM (GPIO4)
  //   2) frecuenciaPWM  → cuántas veces por segundo se prende y
  //                       apaga el LED (5000 veces por segundo)
  //   3) resolucionPWM  → cuántos niveles de brillo distintos
  //                       podemos tener (8 bits = 256 niveles,
  //                       de 0 hasta 255)
  //
  //   ¿Y "ledc"? ¿Qué significa?
  //   "LEDC" es el nombre del módulo de hardware del ESP32 que
  //   genera la señal PWM. Significa "LED Controller" porque se
  //   diseñó originalmente para controlar LEDs, pero también
  //   sirve para motores, servos, parlantes, etc.
  // ─────────────────────────────────────────────────────────────
  ledcAttach(pinLED, frecuenciaPWM, resolucionPWM);

  // Mensaje de bienvenida
  Serial.println("¡Comenzamos la práctica!");
  Serial.println("Bluetooth listo: conéctate desde tu celular");
  Serial.println("--------------------------------------------");
}


void loop() {

  // PASO 1: Leer el potenciómetro
  // El ESP32 nos da un número entre 0 y 4095
  int valor = analogRead(pinPotenciometro);

  // PASO 2: Convertir el valor leído a voltaje (0 a 3.3 V)
  float voltaje = (valor * 3.3) / 4095.0;

  // PASO 3: Calcular el brillo del LED (entre 0 y 255)
  int brillo = map(valor, 0, 4095, 0, 255);

  // PASO 4: Encender el LED con ese brillo
  ledcWrite(pinLED, brillo);

  // PASO 5: Preparar el mensaje con los datos
  String mensaje = "Valor: " + String(valor) +
                   "   Voltaje: " + String(voltaje, 2) + " V" +
                   "   Brillo: " + String(brillo);

  // PASO 6: Enviar el mensaje por el cable USB
  Serial.println(mensaje);

  // PASO 7: Enviar el mismo mensaje por Bluetooth al celular
  BT.println(mensaje);

  // Pequeña pausa para no saturar el monitor
  delay(300);
}
