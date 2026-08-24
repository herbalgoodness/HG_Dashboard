# ShipStation Integration Guide

Your Herbal Goodness Command Center dashboard now has full ShipStation integration!

## What's New

### Backend Files
- **server.js** - Node.js backend server that:
  - Serves your static HTML dashboard
  - Provides REST API endpoints for ShipStation data
  - Authenticates with ShipStation API using your `SHIPSTATION_API_KEY` environment variable
  - Proxies requests to ShipStation API

- **shipstation-client.js** - Lightweight JavaScript client library for the frontend:
  - Fetch shipments, carriers, warehouses, products
  - Format data for display
  - Handle errors gracefully

## Available API Endpoints

All endpoints are prefixed with `/api/shipstation/`:

### GET /shipments
Fetch shipment list with pagination
```javascript
const client = new ShipStationClient();
const data = await client.getShipments({ 
  pageSize: 20,  // default: 20
  page: 1        // default: 1
});
```

### GET /carriers
Fetch list of available carriers
```javascript
const carriers = await client.getCarriers();
```

### GET /warehouses
Fetch list of warehouses
```javascript
const warehouses = await client.getWarehouses();
```

### GET /products
Fetch product inventory with pagination
```javascript
const products = await client.getProducts({
  pageSize: 50,  // default: 50
  page: 1        // default: 1
});
```

### GET /health
Health check endpoint
```javascript
const health = await fetch('/api/health').then(r => r.json());
// Returns: { status: 'ok', shipstationConfigured: true, timestamp: '...' }
```

## Usage in Your Dashboard

### 1. Include the client library in your HTML
```html
<script src="/shipstation-client.js"></script>
```

### 2. Create a ShipStation widget
```javascript
const client = new ShipStationClient();

// Fetch and display shipments
async function loadShipments() {
  try {
    const data = await client.getShipments({ pageSize: 10 });
    
    console.log('Recent shipments:', data.shipments);
    
    // Format for display
    const rows = data.shipments.map(shipment => {
      const formatted = ShipStationClient.formatShipment(shipment);
      return `
        <tr>
          <td>${formatted.id}</td>
          <td>${formatted.orderNumber}</td>
          <td>${formatted.carrier}</td>
          <td>${formatted.status}</td>
          <td>${formatted.trackingNumber}</td>
        </tr>
      `;
    });
    
    document.getElementById('shipmentsTable').innerHTML = rows.join('');
  } catch (error) {
    console.error('Failed to load shipments:', error);
  }
}

loadShipments();
```

### 3. Add a ShipStation section to your dashboard
Add this HTML to `index.html` (e.g., as a new page):

```html
<!-- Add this button to your nav.tabs -->
<button data-page="shipstation">Shipping</button>

<!-- Add this section after other pages -->
<div class="page" id="page-shipstation">
  <div class="page-head">
    <span class="eyebrow">ShipStation Data</span>
    <h2>Recent Shipments</h2>
    <p>View and manage your recent shipments directly from ShipStation.</p>
  </div>

  <div class="card">
    <h3 style="margin-top:0;">Recent Shipments</h3>
    <table>
      <thead>
        <tr>
          <th>Shipment ID</th>
          <th>Order #</th>
          <th>Carrier</th>
          <th>Status</th>
          <th>Tracking</th>
          <th>Recipient</th>
        </tr>
      </thead>
      <tbody id="shipmentsTable">
        <tr><td colspan="6" style="text-align:center; color:var(--text-dim);">Loading...</td></tr>
      </tbody>
    </table>
  </div>
</div>
```

## Environment Variables

The backend requires:
- `SHIPSTATION_API_KEY` - Your ShipStation V2 API key (already set on Railway)
- `SHIPSTATION_API_URL` - Optional, defaults to `https://api.shipstation.com`
- `PORT` - Optional, defaults to 3000

## Deployment on Railway

Your service has been updated with:
- `SHIPSTATION_API_KEY` environment variable ✅
- The new `server.js` backend
- The `shipstation-client.js` library

Just redeploy and the dashboard will be live with ShipStation integration!

## Example Dashboard Page

Here's a minimal working example to add to your HTML:

```javascript
// Call this when the ShipStation page is activated
async function initShipStationPage() {
  const client = new ShipStationClient();
  
  try {
    // Fetch all needed data in parallel
    const [shipments, carriers, warehouses] = await Promise.all([
      client.getShipments({ pageSize: 15 }),
      client.getCarriers(),
      client.getWarehouses()
    ]);

    console.log('Shipments:', shipments);
    console.log('Carriers:', carriers);
    console.log('Warehouses:', warehouses);

    // Render shipments table
    const rows = (shipments.shipments || []).map(s => {
      const fmt = ShipStationClient.formatShipment(s);
      return \`
        <tr>
          <td class="metric-name">\${fmt.id}<span>\${fmt.orderNumber}</span></td>
          <td>\${fmt.carrier}</td>
          <td>\${ShipStationClient.getStatusBadge(fmt.status)}</td>
          <td class="muted">\${fmt.trackingNumber || '—'}</td>
          <td>\${fmt.recipient}</td>
        </tr>
      \`;
    });

    document.getElementById('shipmentsTable').innerHTML = rows.join('');
  } catch (error) {
    document.getElementById('shipmentsTable').innerHTML = 
      \`<tr><td colspan="5" style="color:var(--danger);">Error loading data: \${error.message}</td></tr>\`;
  }
}

// Hook into your tab navigation
document.addEventListener('DOMContentLoaded', () => {
  const tabNav = document.getElementById('tabNav');
  tabNav.addEventListener('click', (e) => {
    if (e.target.dataset.page === 'shipstation') {
      initShipStationPage();
    }
  });
});
```

## Troubleshooting

### "API key not set" error
Make sure `SHIPSTATION_API_KEY` is set in Railway environment variables.

### 401/403 from ShipStation
- Verify your API key is valid
- Check ShipStation dashboard for API key status
- Ensure it's a V2 API key (not v1)

### CORS errors (if using from different domain)
The server allows all origins by default. If you need to restrict, edit the CORS headers in `server.js`.

## Next Steps

1. **Add the ShipStation tab to your dashboard** - Include the HTML from the example above
2. **Customize the display** - Style shipments table to match your design system
3. **Add more endpoints** - Create widgets for carriers, inventory, fulfillment batches
4. **Set up real-time updates** - Use WebSockets or polling for live data
5. **Create alerts** - Notify on shipping delays, inventory issues, etc.

---

For more info, see the ShipStation API docs: https://shipstation.docs.apiary.io/

