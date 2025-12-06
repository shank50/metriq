const axios = require('axios');

const SHOPIFY_API_VERSION = '2024-01';

const getShopifyClient = (domain, accessToken) => {
    // Strip protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const url = `https://${cleanDomain}/admin/api/${SHOPIFY_API_VERSION}`;
    console.log(`Shopify API Base URL: ${url}`);
    return axios.create({
        baseURL: url,
        headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json'
        }
    });
};

exports.fetchProducts = async (domain, accessToken) => {
    const client = getShopifyClient(domain, accessToken);
    let products = [];
    let url = '/products.json?limit=250';

    while (url) {
        try {
            const response = await client.get(url);
            products = products.concat(response.data.products);

            // Handle pagination
            const linkHeader = response.headers.link;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                url = match ? match[1].replace(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
            } else {
                url = null;
            }
        } catch (error) {
            console.error('Error fetching products:', error.message);
            throw error;
        }
    }
    return products;
};

exports.fetchOrders = async (domain, accessToken) => {
    const client = getShopifyClient(domain, accessToken);
    let orders = [];
    let url = '/orders.json?status=any&limit=250';

    while (url) {
        try {
            const response = await client.get(url);
            orders = orders.concat(response.data.orders);

            const linkHeader = response.headers.link;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                url = match ? match[1].replace(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
            } else {
                url = null;
            }
        } catch (error) {
            console.error('Error fetching orders:', error.message);
            throw error;
        }
    }
    return orders;
};

exports.fetchCustomers = async (domain, accessToken) => {
    const client = getShopifyClient(domain, accessToken);
    let customers = [];
    let url = '/customers.json?limit=250';

    while (url) {
        try {
            const response = await client.get(url);
            customers = customers.concat(response.data.customers);

            const linkHeader = response.headers.link;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                url = match ? match[1].replace(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
            } else {
                url = null;
            }
        } catch (error) {
            console.error('Error fetching customers:', error.message);
            throw error;
        }
    }
    return customers;
};

// Fetch abandoned checkouts from Shopify
exports.fetchAbandonedCheckouts = async (domain, accessToken) => {
    const client = getShopifyClient(domain, accessToken);
    let allCheckouts = [];
    let url = '/checkouts.json?limit=250&status=any';

    while (url) {
        try {
            const response = await client.get(url);
            const checkouts = response.data.checkouts || [];
            allCheckouts = allCheckouts.concat(checkouts);

            // Check for next page
            const linkHeader = response.headers.link;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
                url = match ? match[1].replace(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}`, '') : null;
            } else {
                url = null;
            }
        } catch (error) {
            console.error('Error fetching abandoned checkouts:', error.message);
            throw error;
        }
    }

    return allCheckouts;
};
