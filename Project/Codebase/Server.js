// Just the blocks importing the various node js libraries. 
const http = require('http');
const fs = require('fs');
const path = require('path');

// Block that allows us to manage cookies. It requires the server host to have an additional middleware installation. 
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

// Block that allows us to write logs to a file on the system. 
var morgan = require('morgan'); 
// Creates a write stream for the logs themselves. 
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

// cookieParser middleware
app.use(cookieParser());

// log middleware
app.use(morgan('combined', { stream: accessLogStream }))

// Default port for the program development. 
const PORT = 8080;

const DATA_FILE = path.join(__dirname, 'data.json');

// Simple function that loads the data from a given file, and turns it into string, then returns it. 
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}
// Simple function that then saves data to a file. Both need to be used in order for us to implement the proper methods. 
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Creating the HTTP server itself, from which we work off. Request listener is defined in the same block, in the method after parenthesis. 
const server = http.createServer((req, res) => {
  const method = req.method;
  const url = req.url;
  console.log(`📩 ${method} ${url}`);

  // Now, depending on the method this will be handled by a different work. 
  // For this reason, we've done it via a if / else branching set, going through all of the methods that we need here. 
  
  // ________________________________
  // REST GET /recurso
  // ________________________________
  // As long as it's correct, loads the data in the resource, if found, writes it, and sends it to the client. 
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

  // ________________________________
  // REST POST /recurso
  // ________________________________
  // As long as it works, it requests the data from the client, and adds it as a new resource on the proper folder. 
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

        // Important to note: It saves any data we post as a JSON file ! 
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

  // ________________________________
  // REST PUT /recurso/id
  // ________________________________
  // Put request, idempotent, important to note. 
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

        // Updates the data proper, in the line then the save command finalizes it. 
        data[resourceName][index] = { ...data[resourceName][index], ...updatedItem };

        saveData(data);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'updated',
          updatedItem: data[resourceName][index]
        }));
      // Simple error catch, logs to console. 
      } catch (err) {
        console.error('❌ Error en PUT:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON inválido o error al guardar' }));
      }
    });
  }

  // ________________________________
  // REST DELETE /recurso/id
  // ________________________________
  // Not much to say, simple delete mthod if the resource exists. 
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

  // ________________________________
  // Static Files (Acecssible only via get!) 
  // ________________________________
  else if (method === 'GET') {
    const filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
    // If the file exists and is found properly...
    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }

      // Depending on the content, it returns it as a different content type. 
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.json': 'application/json',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.js': 'application/javascript',
        '.css': 'text/css'
      }[ext] || 'application/octet-stream';
      // ...It's simply returned! 
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });
  }

  // ________________________________
  // Methods or Unauthorized Routes (Anything else and errors) 
  // ________________________________
  else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Método o ruta no permitidos');
  }
});
// Request listener is closed, server has been properly created. 
// It now listens to the messages on the given port, passively. 
server.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});

// Inside this, we are implementing a route that quickly adds cookies to the user, and notifies them. 
// It works on my home machine, but may not work proper outside due to setup issues. 
app.get('/setcookie', function (req, res) {

    res.cookie('usuario', 'monstruodelasgalletas');
    res.send('Cookies added');
});
// Adds another route that lets us simply request the cookies that the client has gathered. 
app.get('/getcookie', function (req, res) {
    res.send(req.cookies);
});


