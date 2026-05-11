const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

const getIcon = (text) => {
  text = text.toLowerCase();
  if (text.includes('esp32')) return '<i class=\"fas fa-microchip\" style=\"font-size:1.5em; color:var(--accent-cyan)\"></i>';
  if (text.includes('protoboard')) return '<i class=\"fas fa-border-all\" style=\"font-size:1.5em; color:#ccc\"></i>';
  if (text.includes('usb')) return '<i class=\"fab fa-usb\" style=\"font-size:1.5em; color:#999\"></i>';
  if (text.includes('jumper') || text.includes('cable')) return '<i class=\"fas fa-random\" style=\"font-size:1.5em; color:var(--accent-green)\"></i>';
  if (text.includes('led')) return '<i class=\"fas fa-lightbulb\" style=\"font-size:1.5em; color:#ff4444\"></i>';
  if (text.includes('resistencia')) return '<i class=\"fas fa-wave-square\" style=\"font-size:1.5em; color:#eab308\"></i>';
  if (text.includes('potenciometro') || text.includes('potenciómetro')) return '<i class=\"fas fa-sliders-h\" style=\"font-size:1.5em; color:#aaa\"></i>';
  if (text.includes('dht22')) return '<i class=\"fas fa-temperature-low\" style=\"font-size:1.5em; color:var(--accent-cyan)\"></i>';
  if (text.includes('oled')) return '<i class=\"fas fa-tv\" style=\"font-size:1.5em; color:var(--accent-gold)\"></i>';
  if (text.includes('servo')) return '<i class=\"fas fa-cogs\" style=\"font-size:1.5em; color:#ff8800\"></i>';
  if (text.includes('fuente')) return '<i class=\"fas fa-plug\" style=\"font-size:1.5em; color:#00ff88\"></i>';
  return '<i class=\"fas fa-box\" style=\"font-size:1.5em; color:#777\"></i>';
};

// Update global material table
html = html.replace(
  /<table class=\"data-table material-visual-table\">[\s\S]*?<\/table>/,
  \<table class=\"data-table material-visual-table\">
<thead>
<tr><th style=\"width:80px;text-align:center\">Aspecto</th><th>Componente</th><th>Cant. Total</th><th>Proyectos donde se utiliza</th></tr>
</thead>
<tbody>
<tr><td style=\"text-align:center\">\</td><td>ESP32 Dev Module</td><td>1</td><td>Todos</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Protoboard 830 puntos</td><td>1</td><td>Todos</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Cable USB (Micro USB o Tipo C)</td><td>1</td><td>Todos</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Cables Jumper (M-M, M-H)</td><td>Varios</td><td>Todos</td></tr>
<tr><td style=\"text-align:center\">\</td><td>LED (Varios colores)</td><td>1 - 3</td><td>On/Off, Potenciometro (variantes)</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Resistencia 220 Ohm</td><td>1 - 3</td><td>On/Off, Potenciometro (variantes)</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Potenciometro 10k Ohm</td><td>1</td><td>Potenciometro, BT, WiFi, ThingSpeak</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Sensor DHT22</td><td>1</td><td>Temperatura (ambas variantes)</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Resistencia 10k Ohm (Pull-up)</td><td>1</td><td>Temperatura (ambas variantes)</td></tr>
<tr><td style=\"text-align:center\">\</td><td>Pantalla OLED SSD1306 128x64</td><td>1</td><td>Temp. con termómetro, Mov. Armónico</td></tr>
</tbody>
</table>\
);

// Update all project tables
let inTable = false;
let lines = html.split('\n');
let newLines = [];

for (let i=0; i<lines.length; i++) {
  let line = lines[i];
  
  if (line.includes('<div class=\"table-wrap\"><table class=\"data-table\"><thead><tr><th>Cant.</th><th>Componente')) {
    line = line.replace('<th>Cant.</th><th>Componente', '<th style=\"text-align:center; width:60px\">Aspecto</th><th>Cant.</th><th>Componente');
    inTable = true;
  }
  else if (inTable && line.includes('</tbody></table>')) {
    inTable = false;
  }
  else if (inTable && line.match(/<tr><td>/)) {
    let match = line.match(/<tr><td>.*?<\/td><td>(.*?)<\/td>/);
    if (match) {
      let compName = match[1];
      let icon = getIcon(compName);
      line = line.replace('<tr><td>', \<tr><td style=\"text-align:center\">\</td><td>\);
    }
  }
  
  newLines.push(line);
}

fs.writeFileSync('index.html', newLines.join('\n'));
console.log('Tables updated with vector icons!');
