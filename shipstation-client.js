/**
 * ShipStation Dashboard Client
 * Lightweight client library for consuming ShipStation data in the dashboard
 */

class ShipStationClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl || window.location.origin;
    this.apiPath = '/api/shipstation';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${this.apiPath}${endpoint}`;
    const params = new URLSearchParams(options).toString();
    const finalUrl = params ? `${url}?${params}` : url;

    try {
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ShipStation API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  async getCurrentDigest() {
    return this.request('/digest/current');
  }

  async getYearDigest() {
    return this.request('/digest/year');
  }

  async getShipments(options = {}) {
    return this.request('/shipments', {
      page: options.page || 1,
      pageSize: options.pageSize || 20
    });
  }

  async getCarriers() {
    return this.request('/carriers');
  }

  async getWarehouses() {
    return this.request('/warehouses');
  }

  async getProducts(options = {}) {
    return this.request('/products', {
      page: options.page || 1,
      pageSize: options.pageSize || 50
    });
  }

  static formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  static formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }

  static getChangeBadge(percentChange) {
    const num = parseFloat(percentChange);
    if (num > 0) {
      return `<span class="tag good">+${num}%</span>`;
    } else if (num < 0) {
      return `<span class="tag bad">${num}%</span>`;
    } else {
      return `<span class="tag info">0%</span>`;
    }
  }

  static formatShipment(shipment) {
    return {
      id: shipment.shipmentId,
      orderNumber: shipment.orderNumber,
      status: shipment.shipmentStatus,
      carrier: shipment.carrierCode,
      trackingNumber: shipment.trackingNumber,
      shipDate: shipment.shipDate,
      weight: shipment.weightOz ? `${shipment.weightOz} oz` : 'N/A',
      recipient: `${shipment.recipientName || 'Unknown'}`,
      address: `${shipment.recipientCity}, ${shipment.recipientStateProvince}`
    };
  }

  static getStatusBadge(status) {
    const statusMap = {
      'pending': { class: 'tag warn', label: 'Pending' },
      'shipped': { class: 'tag good', label: 'Shipped' },
      'cancelled': { class: 'tag bad', label: 'Cancelled' },
      'on_hold': { class: 'tag info', label: 'On Hold' }
    };
    const config = statusMap[status] || { class: 'tag info', label: status };
    return `<span class="${config.class}">${config.label}</span>`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShipStationClient;
}

