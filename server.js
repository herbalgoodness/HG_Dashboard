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
 * Fetch ShipStation data via their REST API
 */
async function fetchShipStationData(endpoint, params = {}) {
  if (!SHIPSTATION_API_KEY) {
    throw new Error('SHIPSTATION_API_KEY environment variable not set');
  }

  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${SHIPSTATION_API_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

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
 * Calculate metrics for a date range
 */
async function calculateMetricsForDateRange(startDate, endDate) {
  try {
    // Fetch orders within date range
    const result = await fetchShipStationData('/orders', {
      createDateStart: startDate.toISOString(),
      createDateEnd: endDate.toISOString(),
      pageSize: 500,
      page: 1,
      sortBy: 'CreateDate',
      sortDir: 'desc'
    });

    const orders = result.data.orders || [];
    
    // Aggregate metrics
    const metrics = {
      totalOrders: orders.length,
      domesticOrders: orders.filter(o => !o.international).length,
      intlOrders: orders.filter(o => o.international).length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.orderTotal || 0), 0),
      domesticRevenue: orders.filter(o => !o.international).reduce((sum, o) => sum + (o.orderTotal || 0), 0),
      intlRevenue: orders.filter(o => o.international).reduce((sum, o) => sum + (o.orderTotal || 0), 0),
      totalShipments: orders.filter(o => o.shipments && o.shipments.length > 0).length,
      domesticShipments: orders.filter(o => !o.international && o.shipments && o.shipments.length > 0).length,
      intlShipments: orders.filter(o => o.international && o.shipments && o.shipments.length > 0).length,
      totalShippingCost: orders.reduce((sum, o) => {
        const shipCost = (o.shipments || []).reduce((s, ship) => s + (ship.shippingCost || 0), 0);
        return sum + shipCost;
      }, 0),
      domesticShippingCost: orders.filter(o => !o.international).reduce((sum, o) => {
        const shipCost = (o.shipments || []).reduce((s, ship) => s + (ship.shippingCost || 0), 0);
        return sum + shipCost;
      }, 0),
      intlShippingCost: orders.filter(o => o.international).reduce((sum, o) => {
        const shipCost = (o.shipments || []).reduce((s, ship) => s + (ship.shippingCost || 0), 0);
        return sum + shipCost;
      }, 0),
      orders: orders.slice(0, 50)
    };

    // Calculate cost per shipment
    metrics.domesticCostPerShipment = metrics.domesticShipments > 0 
      ? metrics.domesticShippingCost / metrics.domesticShipments 
      : 0;
    metrics.intlCostPerShipment = metrics.intlShipments > 0 
      ? metrics.intlShippingCost / metrics.intlShipments 
      : 0;
    metrics.costPerShipment = (metrics.domesticShipments + metrics.intlShipments) > 0 
      ? metrics.totalShippingCost / (metrics.domesticShipments + metrics.intlShipments) 
      : 0;

    return metrics;
  } catch (error) {
    console.error('Error calculating metrics:', error);
    return null;
  }
}

/**
 * Calculate percentage change
 */
function percentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(1);
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

  // GET /api/shipstation/digest/current
  if (pathname === '/api/shipstation/digest/current' && req.method === 'GET') {
    try {
      // Get current week
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Get previous week
      const prevWeekEnd = new Date(weekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      const prevWeekStart = new Date(prevWeekEnd);
      prevWeekStart.setDate(prevWeekEnd.getDate() - 6);

      const currentMetrics = await calculateMetricsForDateRange(weekStart, weekEnd);
      const previousMetrics = await calculateMetricsForDateRange(prevWeekStart, prevWeekEnd);

      // Calculate week-over-week changes
      const digest = {
        currentWeek: {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0],
          metrics: currentMetrics
        },
        previousWeek: {
          start: prevWeekStart.toISOString().split('T')[0],
          end: prevWeekEnd.toISOString().split('T')[0],
          metrics: previousMetrics
        },
        comparison: {
          domesticOrders: {
            current: currentMetrics.domesticOrders,
            previous: previousMetrics.domesticOrders,
            change: percentageChange(currentMetrics.domesticOrders, previousMetrics.domesticOrders)
          },
          intlOrders: {
            current: currentMetrics.intlOrders,
            previous: previousMetrics.intlOrders,
            change: percentageChange(currentMetrics.intlOrders, previousMetrics.intlOrders)
          },
          totalOrders: {
            current: currentMetrics.totalOrders,
            previous: previousMetrics.totalOrders,
            change: percentageChange(currentMetrics.totalOrders, previousMetrics.totalOrders)
          },
          domesticRevenue: {
            current: currentMetrics.domesticRevenue,
            previous: previousMetrics.domesticRevenue,
            change: percentageChange(currentMetrics.domesticRevenue, previousMetrics.domesticRevenue)
          },
          intlRevenue: {
            current: currentMetrics.intlRevenue,
            previous: previousMetrics.intlRevenue,
            change: percentageChange(currentMetrics.intlRevenue, previousMetrics.intlRevenue)
          },
          totalRevenue: {
            current: currentMetrics.totalRevenue,
            previous: previousMetrics.totalRevenue,
            change: percentageChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue)
          },
          domesticShipments: {
            current: currentMetrics.domesticShipments,
            previous: previousMetrics.domesticShipments,
            change: percentageChange(currentMetrics.domesticShipments, previousMetrics.domesticShipments)
          },
          intlShipments: {
            current: currentMetrics.intlShipments,
            previous: previousMetrics.intlShipments,
            change: percentageChange(currentMetrics.intlShipments, previousMetrics.intlShipments)
          },
          totalShipments: {
            current: currentMetrics.totalShipments,
            previous: previousMetrics.totalShipments,
            change: percentageChange(currentMetrics.totalShipments, previousMetrics.totalShipments)
          },
          domesticShippingCost: {
            current: currentMetrics.domesticShippingCost,
            previous: previousMetrics.domesticShippingCost,
            change: percentageChange(currentMetrics.domesticShippingCost, previousMetrics.domesticShippingCost)
          },
          intlShippingCost: {
            current: currentMetrics.intlShippingCost,
            previous: previousMetrics.intlShippingCost,
            change: percentageChange(currentMetrics.intlShippingCost, previousMetrics.intlShippingCost)
          },
          totalShippingCost: {
            current: currentMetrics.totalShippingCost,
            previous: previousMetrics.totalShippingCost,
            change: percentageChange(currentMetrics.totalShippingCost, previousMetrics.totalShippingCost)
          },
          domesticCostPerShipment: {
            current: currentMetrics.domesticCostPerShipment,
            previous: previousMetrics.domesticCostPerShipment,
            change: percentageChange(currentMetrics.domesticCostPerShipment, previousMetrics.domesticCostPerShipment)
          },
          intlCostPerShipment: {
            current: currentMetrics.intlCostPerShipment,
            previous: previousMetrics.intlCostPerShipment,
            change: percentageChange(currentMetrics.intlCostPerShipment, previousMetrics.intlCostPerShipment)
          },
          costPerShipment: {
            current: currentMetrics.costPerShipment,
            previous: previousMetrics.costPerShipment,
            change: percentageChange(currentMetrics.costPerShipment, previousMetrics.costPerShipment)
          }
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(digest));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/shipstation/digest/year
  if (pathname === '/api/shipstation/digest/year' && req.method === 'GET') {
    try {
      const weeks = [];
      const startOfYear = new Date('2026-01-01T00:00:00Z');
      const today = new Date();

      let currentWeekStart = new Date(startOfYear);

      while (currentWeekStart < today) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        if (weekEnd > today) {
          weekEnd.setTime(today.getTime());
        }

        const metrics = await calculateMetricsForDateRange(currentWeekStart, weekEnd);
        
        if (metrics) {
          weeks.push({
            weekStart: currentWeekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            metrics: metrics
          });
        }

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ weeks }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/health
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

  const filePath = path.join(__dirname, pathname);
  
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
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

