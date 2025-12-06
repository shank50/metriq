const shopifyService = require('../services/shopifyService');
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

exports.syncData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.body;

        if (!storeId) {
            return res.status(400).json({ error: 'storeId is required' });
        }

        // Verify store belongs to user
        const tenant = await retryQuery(() => prisma.tenant.findFirst({
            where: { id: storeId, userId }
        }));

        if (!tenant || !tenant.accessToken) {
            return res.status(400).json({ error: 'Store not found or missing Shopify credentials' });
        }

        const { shopifyDomain, accessToken } = tenant;
        const tenantId = tenant.id;
        console.log(`Starting sync for ${shopifyDomain}`);

        // 1. Fetch Data
        const [products, orders, customers, abandonedCheckouts] = await Promise.all([
            shopifyService.fetchProducts(shopifyDomain, accessToken),
            shopifyService.fetchOrders(shopifyDomain, accessToken),
            shopifyService.fetchCustomers(shopifyDomain, accessToken),
            shopifyService.fetchAbandonedCheckouts(shopifyDomain, accessToken)
        ]);

        console.log(`Fetched: ${products.length} products, ${orders.length} orders, ${customers.length} customers, ${abandonedCheckouts.length} abandoned checkouts`);

        // 2. Save Customers in batches
        console.log('Saving customers...');
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
                        ordersCount: customer.orders_count,
                        totalSpent: parseFloat(customer.total_spent) || 0,
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
                        tenantId
                    }
                })),
                { timeout: 30000 } // 30 second timeout for batch
            ));
        }

        // 3. Save Products in batches
        console.log('Saving products...');
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
        console.log('Saving orders...');
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
        console.log('Saving abandoned checkouts...');
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

        console.log('Sync completed successfully');
        res.json({
            message: 'Sync completed successfully',
            stats: {
                products: products.length,
                orders: orders.length,
                customers: customers.length,
                abandonedCheckouts: abandonedCheckouts.length
            }
        });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Failed to sync data', details: error.message });
    }
};
