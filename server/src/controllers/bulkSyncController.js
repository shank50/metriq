const shopifyService = require('../services/shopifyService');
const ingestionController = require('./ingestionController');
const prisma = require('../lib/prisma');

// Sync all stores for a user
exports.syncAllStores = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all user's stores
        const stores = await prisma.tenant.findMany({
            where: { userId },
            select: { id: true, storeName: true, shopifyDomain: true, accessToken: true }
        });

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

// Helper function to sync a single store (extracted from ingestion controller logic)
async function syncSingleStore(tenantId, shopifyDomain, accessToken) {
    // 1. Fetch Data
    const [products, orders, customers, abandonedCheckouts] = await Promise.all([
        shopifyService.fetchProducts(shopifyDomain, accessToken),
        shopifyService.fetchOrders(shopifyDomain, accessToken),
        shopifyService.fetchCustomers(shopifyDomain, accessToken),
        shopifyService.fetchAbandonedCheckouts(shopifyDomain, accessToken)
    ]);

    console.log(`Fetching: ${products.length} products, ${orders.length} orders, ${customers.length} customers, ${abandonedCheckouts.length} abandoned checkouts for ${shopifyDomain}`);

    // 2. Save Customers
    for (const customer of customers) {
        await prisma.customer.upsert({
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
        });
    }

    // 3. Save Products
    for (const product of products) {
        await prisma.product.upsert({
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
        });
    }

    // 4. Save Orders
    for (const order of orders) {
        const customerShopifyId = order.customer?.id?.toString();
        let customerId = null;
        if (customerShopifyId) {
            const customer = await prisma.customer.findUnique({
                where: { shopifyId_tenantId: { shopifyId: customerShopifyId, tenantId } }
            });
            customerId = customer?.id;
        }

        await prisma.order.upsert({
            where: { shopifyId_tenantId: { shopifyId: order.id.toString(), tenantId } },
            update: {
                orderNumber: order.order_number,
                totalPrice: parseFloat(order.total_price) || 0,
                currency: order.currency,
                financialStatus: order.financial_status,
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
                lineItems: order.line_items,
                processedAt: order.processed_at ? new Date(order.processed_at) : null,
                customerId,
                tenantId
            }
        });
    }

    // 5. Save Abandoned Checkouts
    for (const checkout of abandonedCheckouts) {
        await prisma.abandonedCheckout.upsert({
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
        });
    }
}
