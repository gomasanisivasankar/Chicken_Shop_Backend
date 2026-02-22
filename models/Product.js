const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Whole Chicken', 'Chicken Curry Cut', 'Boneless Chicken', 'Chicken Wings', 'Chicken Liver & Gizzard']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0
    },
    unit: {
        type: String,
        default: 'kg'
    },
    image: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isSpecial: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
