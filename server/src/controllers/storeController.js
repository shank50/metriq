const shopifyService = require('../services/shopifyService');
const prisma = require('../lib/prisma');

// Add a new store to user's account
exports.addStore = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeName, shopifyDomain, accessToken } = req.body;

        // Check if current user already has this store
        const existingStore = await prisma.tenant.findFirst({
            where: {
                shopifyDomain,
                userId
            }
        });

        if (existingStore) {
            return res.status(400).json({ error: 'You have already added this store' });
        }

        // Create store for this user
        const store = await prisma.tenant.create({
            data: {
                storeName,
                shopifyDomain,
                accessToken,
                userId
            }
        });

        res.status(201).json({
            message: 'Store added successfully',
            store: {
                id: store.id,
                storeName: store.storeName,
                shopifyDomain: store.shopifyDomain
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add store' });
    }
};

// Get all stores for the logged-in user
exports.listStores = async (req, res) => {
    try {
        const userId = req.user.id;

        const stores = await prisma.tenant.findMany({
            where: { userId },
            select: {
                id: true,
                storeName: true,
                shopifyDomain: true,
                createdAt: true
            }
        });

        res.json({ stores });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stores' });
    }
};

// Delete a store
exports.deleteStore = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.params;

        // Ensure the store belongs to the user
        const store = await prisma.tenant.findUnique({ where: { id: storeId } });
        if (!store || store.userId !== userId) {
            return res.status(404).json({ error: 'Store not found' });
        }

        await prisma.tenant.delete({ where: { id: storeId } });

        res.json({ message: 'Store deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete store' });
    }
};

// Update store credentials
exports.updateStore = async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.params;
        const { storeName, accessToken } = req.body;

        // Ensure the store belongs to the user
        const store = await prisma.tenant.findUnique({ where: { id: storeId } });
        if (!store || store.userId !== userId) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const updatedStore = await prisma.tenant.update({
            where: { id: storeId },
            data: {
                ...(storeName && { storeName }),
                ...(accessToken && { accessToken })
            }
        });

        res.json({
            message: 'Store updated Successfully',
            store: {
                id: updatedStore.id,
                storeName: updatedStore.storeName,
                shopifyDomain: updatedStore.shopifyDomain
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update store' });
    }
};
