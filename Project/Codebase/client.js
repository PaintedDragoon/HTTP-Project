// Small block that defines the various code that we are importing. Using the .net package, we call for the usage of net, tls, readline, and url, as well as process
const net = require('net');
const tls = require('tls');
const readline = require('readline');
const process = require('node:process');
const { URL } = require('url');

// We create an interface so that the process works properly. 
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


//  God I hate JS this is so unserious
function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

// Builds and sends request (duh) in an asyncornous manner, that lets us select ask a question to the server
async function buildAndSendRequest() {
    const rawUrl = await ask('🌐 Introduce la URL base (ej: https://test1234.free.beeceptor.com): ');

    // parses the URL for use in the  client, as long as it has the proper start. 
    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `http://${rawUrl}`);
    } catch (err) {
        console.error('❌ URL no válida');
        rl.close();
        return;
    }
    // Simply allows us to set up some basic constants to keep track of the connection itself. 
    const isHttps = parsedUrl.protocol === 'https:';
    const host = parsedUrl.hostname;
    const port = parsedUrl.port || (isHttps ? 443 : 80);

    // After this block of getting basic data, the following is a series of Ask methods which give us the proper framework itself. 
    
    // Asks the client for the method they want to use, case insensitive to avoid issues. 
    const method = (await ask('📨 Método HTTP (GET, POST, PUT, DELETE, HEAD): ')).toUpperCase();
    // Asks for which path, obviously, the client will use. 
    const path = await ask('📎 Ruta (ej. /cats): ');
    // Asks for a series of headers, as comma separated values. 
    const headersInput = await ask('📦 Headers (clave:valor separados por coma, ej. Auth:abc,Type:json): ');
    // Asks for a body (optionally, only if the method is POST/PUT, as it's the only method which uses them from the client) 
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

    // Cuerpo y Content-Length if applicable only. 
    let request = `${method} ${path} HTTP/1.1\r\n${headersStr}`;
    if (body && (method === 'POST' || method === 'PUT')) {
        request += `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
    } else {
        request += `\r\n`;
    }

    // Connects according to the protocol used. 
    const connectOptions = {
        host,
        port,
        ...(isHttps && { servername: host }) // Only if HTTPS
    };
    
    const client = isHttps
        ? tls.connect(connectOptions, onConnect)
        : net.connect(connectOptions, onConnect);
    // If the connection establishes successfully, request is sent
    function onConnect() {
        console.log('\n🚀 Conectado. Enviando solicitud...\n');
        client.write(request);
    }

    client.setEncoding('utf8');
    // Shows the response received from the server, no mess! 
    client.on('data', (data) => {
        console.log('📥 Respuesta del servidor:\n', data);
    });

    client.on('end', async () => {
        console.log('🔁 Conexión cerrada');
        const again = await ask('\n¿Quieres enviar otra solicitud? (s/n): ');
        // Allows us to ask for a second or further request, if we wish to continue operations. 
        if (again.trim().toLowerCase() === 's') {
            buildAndSendRequest();
        } else {
            rl.close();
        }
    });

    // Error message on error, as should be rational to be done. 
    client.on('error', (err) => {
        console.error('❌ Error en la conexión:', err.message);
        rl.close();
    });
}

buildAndSendRequest();


