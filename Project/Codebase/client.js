const net = require('net');
const tls = require('tls');
const readline = require('readline');
const { URL } = require('url');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

async function buildAndSendRequest() {
    const rawUrl = await ask('🌐 Introduce la URL base (ej: https://test1234.free.beeceptor.com): ');

    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    } catch (err) {
        console.error('❌ URL no válida');
        rl.close();
        return;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const host = parsedUrl.hostname;
    const port = parsedUrl.port || (isHttps ? 443 : 80);

    const method = (await ask('📨 Método HTTP (GET, POST, PUT, DELETE, HEAD): ')).toUpperCase();
    const path = await ask('📎 Ruta (ej. /cats): ');
    const headersInput = await ask('📦 Headers (clave:valor separados por coma, ej. Auth:abc,Type:json): ');
    const body = await ask('📝 Cuerpo (solo se usará si es POST o PUT): ');

    // Headers
    const headers = headersInput.split(',').filter(Boolean).map(h => h.trim());
    let headersStr = `Host: ${host}\r\nUser-Agent: mi-cliente\r\nConnection: close\r\n`;
    headers.forEach(h => {
        const [key, value] = h.split(':');
        if (key && value) {
            headersStr += `${key.trim()}: ${value.trim()}\r\n`;
        }
    });

    // Cuerpo y Content-Length si corresponde
    let request = `${method} ${path} HTTP/1.1\r\n${headersStr}`;
    if (body && (method === 'POST' || method === 'PUT')) {
        request += `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
    } else {
        request += `\r\n`;
    }

    // Conexión según protocolo
    const connectOptions = {
        host,
        port,
        ...(isHttps && { servername: host }) // solo si es HTTPS
    };

    const client = isHttps
        ? tls.connect(connectOptions, onConnect)
        : net.connect(connectOptions, onConnect);

    function onConnect() {
        console.log('\n🚀 Conectado. Enviando solicitud...\n');
        client.write(request);
    }

    client.setEncoding('utf8');

    client.on('data', (data) => {
        console.log('📥 Respuesta del servidor:\n', data);
    });

    client.on('end', async () => {
        console.log('🔁 Conexión cerrada');
        const again = await ask('\n¿Quieres enviar otra solicitud? (s/n): ');
        if (again.trim().toLowerCase() === 's') {
            buildAndSendRequest();
        } else {
            rl.close();
        }
    });

    client.on('error', (err) => {
        console.error('❌ Error en la conexión:', err.message);
        rl.close();
    });
}

buildAndSendRequest();


