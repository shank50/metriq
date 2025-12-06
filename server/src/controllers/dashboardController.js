const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

// Helper function to get user's stores and build tenant filter
const getUserStoresFilter = async (userId, storeId) => {
    const userStores = await prisma.tenant.findMany({
        where: { userId },
        select: { id: true }
    });

    if (userStores.length === 0) {
        return null;
    }

    return storeId
        ? { tenantId: storeId }
        : { tenantId: { in: userStores.map(s => s.id) } };
};

exports.getStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        const tenantFilter = await getUserStoresFilter(userId, storeId);
        if (!tenantFilter) {
            return res.json({ totalCustomers: 0, totalOrders: 0, totalSales: 0 });
        }

        const [totalCustomers, totalOrders, totalSalesResult] = await Promise.all([
            prisma.customer.count({ where: tenantFilter }),
            prisma.order.count({ where: tenantFilter }),
            prisma.order.aggregate({
                where: tenantFilter,
                _sum: { totalPrice: true }
            })
        ]);

        // Calculate conversion rate (orders per customer)
        const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 100).toFixed(1) : 0;

        res.json({
            totalCustomers,
            totalOrders,
            totalSales: totalSalesResult._sum.totalPrice || 0,
            conversionRate: parseFloat(conversionRate)
        });
    } catch (error) {
        console.error('=== [getStats] ERROR START ===');
        console.error(error);
        console.error('=== [getStats] ERROR END ===');
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getSalesOverTime = async (req, res) => {
    try {
        const userId = req.user.id;
        const { interval = 'day', range, startDate, endDate, storeId } = req.query;

        const userStores = await prisma.tenant.findMany({
            where: { userId },
            select: { id: true }
        });

        if (userStores.length === 0) {
            return res.json([]);
        }

        if (storeId && !userStores.some(store => store.id === storeId)) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const tenantIds = storeId ? [storeId] : userStores.map(s => s.id);

        const intervalLiteralMap = {
            day: Prisma.sql`'day'`,
            month: Prisma.sql`'month'`,
            year: Prisma.sql`'year'`
        };
        const intervalValue = ['day', 'month', 'year'].includes(interval) ? interval : 'day';
        const intervalLiteral = intervalLiteralMap[intervalValue];

        const parseRangeDate = (value, endOfDay = false) => {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            if (endOfDay) {
                date.setHours(23, 59, 59, 999);
            } else {
                date.setHours(0, 0, 0, 0);
            }
            return date;
        };

        let startDateObj = null;
        let endDateObj = null;

        if (startDate && endDate) {
            startDateObj = parseRangeDate(startDate);
            endDateObj = parseRangeDate(endDate, true);
        } else if (range) {
            const match = /^([0-9]+)d$/.exec(range);
            if (match) {
                const days = parseInt(match[1], 10);
                if (days > 0) {
                    endDateObj = new Date();
                    startDateObj = new Date();
                    startDateObj.setDate(startDateObj.getDate() - (days - 1));
                    startDateObj.setHours(0, 0, 0, 0);
                    endDateObj.setHours(23, 59, 59, 999);
                }
            }
        }

        const sanitizeLiteral = (value = '') => value.replace(/'/g, "''");
        const tenantIdSql = tenantIds.map(id => `'${sanitizeLiteral(id)}'`).join(', ');
        const dateClause = startDateObj && endDateObj
            ? `AND COALESCE("processedAt", "createdAt") BETWEEN '${startDateObj.toISOString()}' AND '${endDateObj.toISOString()}'`
            : '';

        const salesQuery = `
          SELECT DATE_TRUNC('${intervalValue}', COALESCE("processedAt", "createdAt")) as date, SUM("totalPrice") as sales
          FROM "Order"
          WHERE "tenantId" IN (${tenantIdSql}) ${dateClause}
          GROUP BY date
          ORDER BY date ASC
        `;

        const sales = await prisma.$queryRawUnsafe(salesQuery);

        const formattedSales = sales.map(s => ({
            date: s.date,
            sales: Number(s.sales)
        }));

        res.json(formattedSales);
    } catch (error) {
        console.error('[getSalesOverTime] Error:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getTopCustomers = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        const tenantFilter = await getUserStoresFilter(userId, storeId);
        if (!tenantFilter) {
            return res.json([]);
        }

        const customers = await prisma.customer.findMany({
            where: tenantFilter,
            orderBy: { totalSpent: 'desc' },
            take: 5,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                totalSpent: true,
                ordersCount: true
            }
        });

        res.json(customers);
    } catch (error) {
        console.error('[getTopCustomers] Error:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getSalesByProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        const tenantFilter = await getUserStoresFilter(userId, storeId);
        if (!tenantFilter) {
            return res.json([]);
        }

        const orders = await prisma.order.findMany({
            where: tenantFilter,
            select: { lineItems: true }
        });

        const productSales = {};

        orders.forEach(order => {
            if (Array.isArray(order.lineItems)) {
                order.lineItems.forEach(item => {
                    if (!productSales[item.title]) {
                        productSales[item.title] = { name: item.title, sales: 0, quantity: 0 };
                    }
                    productSales[item.title].sales += parseFloat(item.price) * item.quantity;
                    productSales[item.title].quantity += item.quantity;
                });
            }
        });

        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

        res.json(sortedProducts);
    } catch (error) {
        console.error('[getSalesByProduct] Error:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getRecentOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        const tenantFilter = await getUserStoresFilter(userId, storeId);
        if (!tenantFilter) {
            return res.json([]);
        }

        const orders = await prisma.order.findMany({
            where: tenantFilter,
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });

        res.json(orders);
    } catch (error) {
        console.error('[getRecentOrders] Error:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAbandonedStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        const tenantFilter = await getUserStoresFilter(userId, storeId);
        if (!tenantFilter) {
            return res.json({ count: 0, totalLostRevenue: 0, abandonmentRate: 0 });
        }

        const [count, totalLostRevenue, totalOrders] = await Promise.all([
            prisma.abandonedCheckout.count({ where: tenantFilter }),
            prisma.abandonedCheckout.aggregate({
                where: tenantFilter,
                _sum: { totalPrice: true }
            }),
            prisma.order.count({ where: tenantFilter })
        ]);

        // Calculate abandonment rate: abandoned / (abandoned + completed orders)
        const totalCheckouts = count + totalOrders;
        const abandonmentRate = totalCheckouts > 0 ? ((count / totalCheckouts) * 100).toFixed(1) : 0;

        res.json({
            count,
            totalLostRevenue: totalLostRevenue._sum.totalPrice || 0,
            abandonmentRate: parseFloat(abandonmentRate)
        });
    } catch (error) {
        console.error('[getAbandonedStats] Error:', {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            query: req.query
        });
        res.status(500).json({ error: 'Internal server error' });
    }
};
