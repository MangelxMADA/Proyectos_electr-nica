/* ═══════════════════════════════════════════════════════════════
 *   Práctica: Controlar el brillo de un LED con un potenciómetro
 *   ─────────────────────────────────────────────────────────────
 *   ¿Qué hace este programa?
 *   - Lee la posición del potenciómetro: 0 a 4095
 *   - Convierte ese valor en voltaje: 0 a 3.3 V
 *   - Cambia el brillo del LED mediante PWM
 *   - Muestra los datos en el monitor serial
 *
 *   Profesor: Msc. Néstor Fabio Montoya Palacios
 * ═══════════════════════════════════════════════════════════════ */


// Pines utilizados
const int pinPotenciometro = 34;   // GPIO34: entrada analógica (ADC1_CH6)
const int pinLED = 4;              // GPIO4:  salida PWM para el LED

// Configuración PWM para ESP32
const int frecuenciaPWM = 5000;    // Frecuencia PWM en Hz
const int resolucionPWM = 8;       // Resolución de 8 bits: valores de 0 a 255


void setup() {
  // Iniciamos la comunicación serial
  Serial.begin(115200);

  // El pin del potenciómetro será entrada
  pinMode(pinPotenciometro, INPUT);

  // Configuramos PWM en el pin del LED
  ledcAttach(pinLED, frecuenciaPWM, resolucionPWM);

  // Mensaje inicial
  Serial.println("¡Comenzamos la práctica!");
  Serial.println("-------------------------");
}


void loop() {

  // PASO 1: Leer el potenciómetro
  // El ESP32 entrega un valor entre 0 y 4095
  int valor = analogRead(pinPotenciometro);

  // PASO 2: Convertir el valor leído a voltaje
  // 4095 equivale aproximadamente a 3.3 V
  float voltaje = (valor * 3.3) / 4095.0;

  // PASO 3: Convertir el valor analógico a brillo PWM
  // Potenciómetro: 0 a 4095
  // PWM LED:       0 a 255
  int brillo = map(valor, 0, 4095, 0, 255);

  // Limitamos el valor por seguridad
  brillo = constrain(brillo, 0, 255);

  // PASO 4: Aplicar el brillo al LED
  // A mayor valor del potenciómetro, mayor brillo
  ledcWrite(pinLED, brillo);

  // PASO 5: Mostrar datos en el monitor serial
  Serial.print("Valor: ");
  Serial.print(valor);

  Serial.print("   Voltaje: ");
  Serial.print(voltaje, 2);

  Serial.print(" V   Brillo PWM: ");
  Serial.println(brillo);

  // Pequeña pausa para no saturar el monitor serial
  delay(300);
}