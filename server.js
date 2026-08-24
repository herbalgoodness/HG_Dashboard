#!/usr/bin/env node

/**
 * Herbal Goodness Command Center - Node.js Backend
 * Serves the static dashboard + provides API endpoints for ShipStation data
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// ShipStation API Configuration
const SHIPSTATION_API_KEY = process.env.SHIPSTATION_API_KEY || '';
const SHIPSTATION_API_URL = process.env.SHIPSTATION_API_URL || 'https://api.shipstation.com';

/**
 * Fetch ShipStation data via their REST API (not MCP, since MCP is for agents)
 * This allows your dashboard to query ShipStation directly
 */
async function fetchShipStationData(endpoint, params = {}) {
  if (!SHIPSTATION_API_KEY) {
    throw new Error('SHIPSTATION_API_KEY environment variable not set');
  }

  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${SHIPSTATION_API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  // ShipStation requires base64 encoding of API key
  const authHeader = 'Basic ' + Buffer.from(SHIPSTATION_API_KEY + ':').toString('base64');

  return new Promise((resolve, reject) => {
    const reqUrl = new URL(fullUrl);
    const options = {
      hostname: reqUrl.hostname,
      port: reqUrl.port,
      path: reqUrl.pathname + reqUrl.search,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'HG-Dashboard/1.0'
      }
    };

    const req = require('https').request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Create HTTP server
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ============ API ENDPOINTS ============

  // GET /api/shipstation/shipments
  if (pathname === '/api/shipstation/shipments' && req.method === 'GET') {
    try {
      const params = {
        pageSize: parsedUrl.query.pageSize || 20,
        page: parsedUrl.query.page || 1
      };
      const result = await fetchShipStationData('/shipments', params);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/shipstation/carriers
  if (pathname === '/api/shipstation/carriers' && req.method === 'GET') {
    try {
      const result = await fetchShipStationData('/carriers');
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/shipstation/warehouses
  if (pathname === '/api/shipstation/warehouses' && req.method === 'GET') {
    try {
      const result = await fetchShipStationData('/warehouses');
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/shipstation/products
  if (pathname === '/api/shipstation/products' && req.method === 'GET') {
    try {
      const params = {
        pageSize: parsedUrl.query.pageSize || 50,
        page: parsedUrl.query.page || 1
      };
      const result = await fetchShipStationData('/products', params);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/health - Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      shipstationConfigured: !!SHIPSTATION_API_KEY,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ============ STATIC FILE SERVING ============

  // Serve index.html for root and SPA routes
  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Serve static files (CSS, JS, images, etc.)
  const filePath = path.join(__dirname, pathname);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try index.html for SPA routing
      const indexPath = path.join(__dirname, 'index.html');
      fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`✅ Herbal Goodness Command Center running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT}`);
  if (SHIPSTATION_API_KEY) {
    console.log(`📦 ShipStation API configured`);
  } else {
    console.log(`⚠️  ShipStation API key not set - data endpoints will fail`);
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

