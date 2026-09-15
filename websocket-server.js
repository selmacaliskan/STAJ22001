// npm install ws
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

console.log("CNC WebSocket Sunucusu 8080 portunda çalışıyor...");

wss.on('connection', (ws) => {
    console.log('Yeni bir istemci (Arayüz / CNC Cihazı) bağlandı.');

    ws.on('message', (message) => {
        console.log(`Gelen Veri: ${message}`);
        
        // Gelen veriyi (örneğin hatayı veya canlı gauge verisini) 
        // bağlı olan tüm arayüzlere anında ilet (Broadcast):
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('İstemci bağlantısı kesildi.');
    });
});