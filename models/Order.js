const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required']
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        name: String,
        price: Number,
        quantity: Number,
        unit: {
            type: String,
            default: 'kg'
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    deliveryAddress: {
        type: String,
        required: [true, 'Delivery address is required']
    },
    deliveryLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'UPI', 'Online Payment'],
        default: 'Cash on Delivery'
    },
    status: {
        type: String,
        enum: ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
