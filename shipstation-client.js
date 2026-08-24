/**
 * ShipStation Dashboard Client
 * Lightweight client library for consuming ShipStation data in the dashboard
 * 
 * Usage:
 *   const client = new ShipStationClient();
 *   const shipments = await client.getShipments({ pageSize: 20 });
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

  /**
   * Get list of shipments
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Page size (default: 20)
   * @returns {Promise<Object>} Shipments data
   */
  async getShipments(options = {}) {
    return this.request('/shipments', {
      page: options.page || 1,
      pageSize: options.pageSize || 20
    });
  }

  /**
   * Get list of carriers
   * @returns {Promise<Object>} Carriers data
   */
  async getCarriers() {
    return this.request('/carriers');
  }

  /**
   * Get list of warehouses
   * @returns {Promise<Object>} Warehouses data
   */
  async getWarehouses() {
    return this.request('/warehouses');
  }

  /**
   * Get list of products
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Page size (default: 50)
   * @returns {Promise<Object>} Products data
   */
  async getProducts(options = {}) {
    return this.request('/products', {
      page: options.page || 1,
      pageSize: options.pageSize || 50
    });
  }

  /**
   * Helper: Format shipment for display
   */
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

  /**
   * Helper: Get status badge HTML
   */
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

// Export for Node.js/CommonJS if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShipStationClient;
}

