const shopifyService = require('../services/shopifyService');
const ingestionController = require('./ingestionController');
const prisma = require('../lib/prisma');
const { retryQuery } = require('../lib/retryHelper');

/**
 * Helper function to process data in chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

// Sync all stores for a user
exports.syncAllStores = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all user's stores
        const stores = await retryQuery(() => prisma.tenant.findMany({
            where: { userId },
            select: { id: true, storeName: true, shopifyDomain: true, accessToken: true }
        }));

        if (stores.length === 0) {
            return res.status(400).json({ error: 'No stores found to sync' });
        }

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Sync each store using the same logic as single store sync
        for (const store of stores) {
            try {
                if (!store.accessToken) {
                    results.push({
                        storeName: store.storeName,
                        status: 'failed',
                        error: 'Missing access token'
                    });
                    failCount++;
                    continue;
                }

                // Call the same sync logic used for single stores
                // This ensures data is actually saved to the database
                await syncSingleStore(store.id, store.shopifyDomain, store.accessToken);

                results.push({
                    storeName: store.storeName,
                    status: 'success'
                });
                successCount++;

                // Add delay between stores to prevent connection saturation
                if (stores.indexOf(store) < stores.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }

            } catch (error) {
                console.error(`Error syncing ${store.storeName}:`, error.message);
                results.push({
                    storeName: store.storeName,
                    status: 'failed',
                    error: error.message
                });
                failCount++;
            }
        }

        res.json({
            message: `Sync completed: ${successCount} succeeded, ${failCount} failed`,
            totalStores: stores.length,
            successCount,
            failCount,
            results
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to sync stores' });
    }
};

// Helper function to sync a single store (using batched operations)
async function syncSingleStore(tenantId, shopifyDomain, accessToken) {
    console.log(`Starting sync for ${shopifyDomain}`);

    // 1. Fetch Data
    const [products, orders, customers, abandonedCheckouts] = await Promise.all([
        shopifyService.fetchProducts(shopifyDomain, accessToken),
        shopifyService.fetchOrders(shopifyDomain, accessToken),
        shopifyService.fetchCustomers(shopifyDomain, accessToken),
        shopifyService.fetchAbandonedCheckouts(shopifyDomain, accessToken)
    ]);

    console.log(`Fetched: ${products.length} products, ${orders.length} orders, ${customers.length} customers, ${abandonedCheckouts.length} abandoned checkouts for ${shopifyDomain}`);

    // 2. Save Customers in batches
    const customerChunks = chunkArray(customers, 50);
    for (const chunk of customerChunks) {
        await retryQuery(() => prisma.$transaction(
            chunk.map(customer => prisma.customer.upsert({
                where: { shopifyId_tenantId: { shopifyId: customer.id.toString(), tenantId } },
                update: {
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    ordersCount: customer.orders_count || 0,
                    totalSpent: parseFloat(customer.total_spent) || 0,
                    state: customer.state,
                    updatedAt: new Date()
                },
                create: {
                    shopifyId: customer.id.toString(),
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    ordersCount: customer.orders_count || 0,
                    totalSpent: parseFloat(customer.total_spent) || 0,
                    state: customer.state,
                    tenantId
                }
            })),
            { timeout: 30000 }
        ));
    }

    // 3. Save Products in batches
    const productChunks = chunkArray(products, 50);
    for (const chunk of productChunks) {
        await retryQuery(() => prisma.$transaction(
            chunk.map(product => prisma.product.upsert({
                where: { shopifyId_tenantId: { shopifyId: product.id.toString(), tenantId } },
                update: {
                    title: product.title,
                    bodyHtml: product.body_html,
                    vendor: product.vendor,
                    productType: product.product_type,
                    status: product.status,
                    tags: product.tags,
                    variants: product.variants,
                    images: product.images,
                    updatedAt: new Date()
                },
                create: {
                    shopifyId: product.id.toString(),
                    title: product.title,
                    bodyHtml: product.body_html,
                    vendor: product.vendor,
                    productType: product.product_type,
                    status: product.status,
                    tags: product.tags,
                    variants: product.variants,
                    images: product.images,
                    tenantId
                }
            })),
            { timeout: 30000 }
        ));
    }

    // 4. Save Orders in batches (smaller chunks due to customer lookups)
    const orderChunks = chunkArray(orders, 20); // Reduced from 50 to prevent timeout
    for (const chunk of orderChunks) {
        await retryQuery(() => prisma.$transaction(async (tx) => {
            // Pre-fetch all customers for this chunk to avoid repeated lookups
            const customerShopifyIds = chunk
                .filter(o => o.customer?.id)
                .map(o => o.customer.id.toString());

            const customerMap = new Map();
            if (customerShopifyIds.length > 0) {
                const customers = await tx.customer.findMany({
                    where: {
                        shopifyId: { in: customerShopifyIds },
                        tenantId
                    },
                    select: { id: true, shopifyId: true }
                });
                customers.forEach(c => customerMap.set(c.shopifyId, c.id));
            }

            // Process orders with pre-fetched customer IDs
            for (const order of chunk) {
                const customerId = order.customer?.id
                    ? customerMap.get(order.customer.id.toString()) || null
                    : null;

                await tx.order.upsert({
                    where: { shopifyId_tenantId: { shopifyId: order.id.toString(), tenantId } },
                    update: {
                        orderNumber: order.order_number,
                        totalPrice: parseFloat(order.total_price) || 0,
                        currency: order.currency,
                        financialStatus: order.financial_status,
                        fulfillmentStatus: order.fulfillment_status,
                        email: order.email,
                        lineItems: order.line_items,
                        processedAt: order.processed_at ? new Date(order.processed_at) : null,
                        customerId,
                        updatedAt: new Date()
                    },
                    create: {
                        shopifyId: order.id.toString(),
                        orderNumber: order.order_number,
                        totalPrice: parseFloat(order.total_price) || 0,
                        currency: order.currency,
                        financialStatus: order.financial_status,
                        fulfillmentStatus: order.fulfillment_status,
                        email: order.email,
                        lineItems: order.line_items,
                        processedAt: order.processed_at ? new Date(order.processed_at) : null,
                        customerId,
                        tenantId
                    }
                });
            }
        }, { timeout: 60000 })); // Increased to 60 seconds
    }

    // 5. Save Abandoned Checkouts in batches
    const checkoutChunks = chunkArray(abandonedCheckouts, 50);
    for (const chunk of checkoutChunks) {
        await retryQuery(() => prisma.$transaction(
            chunk.map(checkout => prisma.abandonedCheckout.upsert({
                where: { shopifyId_tenantId: { shopifyId: checkout.id.toString(), tenantId } },
                update: {
                    token: checkout.token,
                    cartToken: checkout.cart_token,
                    email: checkout.email,
                    totalPrice: parseFloat(checkout.total_price) || 0,
                    currency: checkout.currency,
                    abandonedCheckoutUrl: checkout.abandoned_checkout_url,
                    updatedAt: new Date()
                },
                create: {
                    shopifyId: checkout.id.toString(),
                    token: checkout.token,
                    cartToken: checkout.cart_token,
                    email: checkout.email,
                    totalPrice: parseFloat(checkout.total_price) || 0,
                    currency: checkout.currency,
                    abandonedCheckoutUrl: checkout.abandoned_checkout_url,
                    tenantId
                }
            })),
            { timeout: 30000 }
        ));
    }

    console.log(`Sync completed for ${shopifyDomain}`);
}
