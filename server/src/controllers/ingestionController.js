const shopifyService = require('../services/shopifyService');
const prisma = require('../lib/prisma');

exports.syncData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.body;

        if (!storeId) {
            return res.status(400).json({ error: 'storeId is required' });
        }

        // Verify store belongs to user
        const tenant = await prisma.tenant.findFirst({
            where: { id: storeId, userId }
        });

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

        // 2. Save Customers
        for (const customer of customers) {
            await prisma.customer.upsert({
                where: { shopifyId_tenantId: { shopifyId: customer.id.toString(), tenantId } },
                update: {
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    ordersCount: customer.orders_count,
                    totalSpent: customer.total_spent,
                    updatedAt: new Date()
                },
                create: {
                    shopifyId: customer.id.toString(),
                    firstName: customer.first_name,
                    lastName: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    ordersCount: customer.orders_count,
                    totalSpent: customer.total_spent,
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
            let customerId = null;
            if (order.customer) {
                const dbCustomer = await prisma.customer.findUnique({
                    where: { shopifyId_tenantId: { shopifyId: order.customer.id.toString(), tenantId } }
                });
                if (dbCustomer) customerId = dbCustomer.id;
            }

            await prisma.order.upsert({
                where: { shopifyId_tenantId: { shopifyId: order.id.toString(), tenantId } },
                update: {
                    orderNumber: order.order_number,
                    totalPrice: order.total_price,
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
                    totalPrice: order.total_price,
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
                    totalPrice: checkout.total_price || 0,
                    currency: checkout.currency,
                    abandonedCheckoutUrl: checkout.abandoned_checkout_url,
                    updatedAt: new Date()
                },
                create: {
                    shopifyId: checkout.id.toString(),
                    token: checkout.token,
                    cartToken: checkout.cart_token,
                    email: checkout.email,
                    totalPrice: checkout.total_price || 0,
                    currency: checkout.currency,
                    abandonedCheckoutUrl: checkout.abandoned_checkout_url,
                    tenantId
                }
            });
        }

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
        res.status(500).json({ error: 'Failed to sync data' });
    }
};
