const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;

  console.log(`📩 ${method} ${url}`);

  // ================================
  // REST GET /recurso
  // ================================
  if (method === 'GET' && /^\/[a-zA-Z0-9]+$/.test(url)) {
    const resourceName = url.slice(1);
    const data = loadData();

    if (!data[resourceName]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Recurso no encontrado' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data[resourceName]));
  }

  // ================================
  // REST POST /recurso
  // ================================
  else if (method === 'POST' && /^\/[a-zA-Z0-9]+$/.test(url)) {
    const resourceName = url.slice(1);
    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', () => {
      try {
        const newItem = JSON.parse(body);
        const data = loadData();

        if (!data[resourceName]) {
          data[resourceName] = [];
        }

        data[resourceName].push(newItem);
        saveData(data);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'created',
          message: `Nuevo elemento añadido a ${resourceName}`,
          newItem
        }));
      } catch (err) {
        console.error('❌ Error en POST:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido o error al guardar' }));
      }
    });
  }

  // ================================
  // REST PUT /recurso/id
  // ================================
  else if (method === 'PUT' && /^\/[a-zA-Z0-9]+\/\d+$/.test(url)) {
    const [_, resourceName, idStr] = url.split('/');
    const id = parseInt(idStr);
    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', () => {
      try {
        const updatedItem = JSON.parse(body);
        const data = loadData();

        if (!data[resourceName]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Recurso no encontrado' }));
        }

        const index = data[resourceName].findIndex(item => item.id === id);

        if (index === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Elemento no encontrado' }));
        }

        // Actualizar
        data[resourceName][index] = { ...data[resourceName][index], ...updatedItem };

        saveData(data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'updated',
          updatedItem: data[resourceName][index]
        }));

      } catch (err) {
        console.error('❌ Error en PUT:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido o error al guardar' }));
      }
    });
  }

  // ================================
  // REST DELETE /recurso/id
  // ================================
  else if (method === 'DELETE' && /^\/[a-zA-Z0-9]+\/\d+$/.test(url)) {
    const [_, resourceName, idStr] = url.split('/');
    const id = parseInt(idStr);
    const data = loadData();

    if (!data[resourceName]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Recurso no encontrado' }));
    }

    const index = data[resourceName].findIndex(item => item.id === id);

    if (index === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Elemento no encontrado' }));
    }

    const deletedItem = data[resourceName].splice(index, 1)[0];
    saveData(data);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'deleted',
      deletedItem
    }));
  }

  // ================================
  // ARCHIVOS ESTÁTICOS
  // ================================
  else if (method === 'GET') {
    const filePath = path.join(__dirname, url === '/' ? 'index.html' : url);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }

      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.json': 'application/json',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.js': 'application/javascript',
        '.css': 'text/css'
      }[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  // ================================
  // MÉTODOS O RUTAS NO PERMITIDAS
  // ================================
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Método o ruta no permitidos');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

