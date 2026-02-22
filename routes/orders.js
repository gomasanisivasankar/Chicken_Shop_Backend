const express = require('express');
const Order = require('../models/Order');
const { protect, isAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders — create order (authenticated)
router.post('/', protect, async (req, res) => {
    try {
        const { customerName, items, totalAmount, deliveryAddress, deliveryLocation, phone, paymentMethod, notes } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        if (!req.user || !req.user._id) {
            return res.status(401).json({ message: 'User authentication required to place order' });
        }

        const order = await Order.create({
            user: req.user._id,
            customerName,
            items,
            totalAmount,
            deliveryAddress,
            deliveryLocation: deliveryLocation || { lat: null, lng: null },
            phone,
            paymentMethod: paymentMethod || 'Cash on Delivery',
            notes
        });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/orders — list orders (admin: all, user: own)
router.get('/', protect, async (req, res) => {
    try {
        let orders;
        if (req.user.role === 'admin') {
            orders = await Order.find({}).sort({ createdAt: -1 }).populate('user', 'name email phone');
        } else {
            // Also find orphaned orders matching user's phone (placed before auth fix)
            orders = await Order.find({
                $or: [
                    { user: req.user._id },
                    { user: null, phone: req.user.phone }
                ]
            }).sort({ createdAt: -1 });
        }
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/orders/stats — order stats for admin dashboard
router.get('/stats', protect, isAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const preparingOrders = await Order.countDocuments({ status: 'Preparing' });
        const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });

        const revenueResult = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });

        res.json({
            totalOrders,
            pendingOrders,
            preparingOrders,
            deliveredOrders,
            totalRevenue,
            todayOrders
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/orders/:id — get single order (user can only get own, admin any)
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email phone');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // Users can only view their own orders (or orphaned orders matching phone)
        if (req.user.role !== 'admin') {
            const isOwner = order.user && order.user._id.toString() === req.user._id.toString();
            const isPhoneMatch = !order.user && order.phone === req.user.phone;
            if (!isOwner && !isPhoneMatch) {
                return res.status(403).json({ message: 'Not authorized to view this order' });
            }
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/orders/:id/status — update status (admin only)
router.put('/:id/status', protect, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/orders/:id/cancel — cancel order (user only, if Pending or Preparing)
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // Check ownership
        const isOwner = order.user && order.user.toString() === req.user._id.toString();
        const isPhoneMatch = !order.user && order.phone === req.user.phone;
        if (!isOwner && !isPhoneMatch) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        // Only allow cancel if Pending or Preparing
        if (!['Pending', 'Preparing'].includes(order.status)) {
            return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
        }
        order.status = 'Cancelled';
        await order.save();
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
