const prisma = require('../lib/prisma');

// Get products with zero or low inventory
exports.getInventoryStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.query;

        // Get user's stores
        const userStores = await prisma.tenant.findMany({
            where: { userId },
            select: { id: true }
        });

        if (userStores.length === 0) {
            return res.json({ outOfStock: [], lowStock: [] });
        }

        const tenantIds = storeId ? [storeId] : userStores.map(s => s.id);

        // Fetch all products for the stores
        const products = await prisma.product.findMany({
            where: {
                tenantId: { in: tenantIds }
            },
            select: {
                id: true,
                title: true,
                variants: true,
                productType: true
            }
        });

        const outOfStock = [];
        const lowStock = [];

        products.forEach(product => {
            if (!product.variants || !Array.isArray(product.variants)) return;

            // Calculate total inventory across all variants
            let totalInventory = 0;
            let hasInventoryTracking = false;

            product.variants.forEach(variant => {
                if (variant.inventory_quantity !== undefined && variant.inventory_quantity !== null) {
                    hasInventoryTracking = true;
                    totalInventory += variant.inventory_quantity || 0;
                }
            });

            // Only include products that have inventory tracking enabled
            if (hasInventoryTracking) {
                const productData = {
                    id: product.id,
                    name: product.title,
                    type: product.productType || 'N/A',
                    totalInventory,
                    variants: product.variants.map(v => ({
                        title: v.title,
                        inventory: v.inventory_quantity || 0,
                        sku: v.sku || 'N/A'
                    }))
                };

                if (totalInventory === 0) {
                    outOfStock.push(productData);
                } else if (totalInventory > 0 && totalInventory <= 5) {
                    lowStock.push(productData);
                }
            }
        });

        res.json({
            outOfStock,
            lowStock
        });
    } catch (error) {
        console.error('Error fetching inventory status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
