const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

const app = express();

// Middleware
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
        callback(null, true); // Allow all in production for now
    },
    credentials: true
}));
app.use(express.json());
app.use(passport.initialize());

// Passport Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here') {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                user = await User.findOne({ email: profile.emails[0].value });
                if (user) {
                    user.googleId = profile.id;
                    await user.save();
                } else {
                    user = await User.create({
                        name: profile.displayName,
                        email: profile.emails[0].value,
                        googleId: profile.id
                    });
                }
            }

            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Goutham Fresh Chicken API is running 🐔' });
});

// Seed default products function
const seedProducts = async () => {
    const count = await Product.countDocuments();
    if (count === 0) {
        console.log('🌱 Seeding default products...');
        await Product.insertMany([
            {
                name: 'Whole Chicken (Dressed)',
                category: 'Whole Chicken',
                price: 220,
                unit: 'kg',
                description: 'Freshly dressed whole chicken, cleaned and ready to cook.',
                isAvailable: true,
                isSpecial: true,
                image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400'
            },
            {
                name: 'Whole Chicken (With Skin)',
                category: 'Whole Chicken',
                price: 200,
                unit: 'kg',
                description: 'Whole chicken with skin, perfect for roasting.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82571?w=400'
            },
            {
                name: 'Curry Cut (Small Pieces)',
                category: 'Chicken Curry Cut',
                price: 250,
                unit: 'kg',
                description: 'Small curry-cut pieces, ideal for gravies and masalas.',
                isAvailable: true,
                isSpecial: true,
                image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400'
            },
            {
                name: 'Curry Cut (Large Pieces)',
                category: 'Chicken Curry Cut',
                price: 240,
                unit: 'kg',
                description: 'Large curry-cut pieces, great for biryani and fry.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400'
            },
            {
                name: 'Boneless Chicken Breast',
                category: 'Boneless Chicken',
                price: 350,
                unit: 'kg',
                description: 'Premium boneless breast pieces, lean and tender.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82571?w=400'
            },
            {
                name: 'Boneless Chicken Thigh',
                category: 'Boneless Chicken',
                price: 380,
                unit: 'kg',
                description: 'Juicy boneless thigh meat, perfect for tikka and kebabs.',
                isAvailable: true,
                isSpecial: true,
                image: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400'
            },
            {
                name: 'Chicken Wings',
                category: 'Chicken Wings',
                price: 200,
                unit: 'kg',
                description: 'Fresh chicken wings, great for frying and grilling.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1527477396000-e27163b4bcd1?w=400'
            },
            {
                name: 'Chicken Wings (Party Pack)',
                category: 'Chicken Wings',
                price: 190,
                unit: 'kg',
                description: 'Bulk party pack wings, minimum 2 kg order.',
                isAvailable: true,
                isSpecial: true,
                image: 'https://images.unsplash.com/photo-1527477396000-e27163b4bcd1?w=400'
            },
            {
                name: 'Chicken Liver',
                category: 'Chicken Liver & Gizzard',
                price: 150,
                unit: 'kg',
                description: 'Fresh chicken liver, rich in iron and protein.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400'
            },
            {
                name: 'Chicken Gizzard',
                category: 'Chicken Liver & Gizzard',
                price: 140,
                unit: 'kg',
                description: 'Cleaned chicken gizzard, a traditional delicacy.',
                isAvailable: true,
                isSpecial: false,
                image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400'
            }
        ]);
        console.log('✅ Default products seeded successfully');
    }
};

// Create default admin user
const seedAdmin = async () => {
    // Migrate old admin email if exists
    const oldAdmin = await User.findOne({ email: 'admin@angondhalli.com' });
    if (oldAdmin) {
        oldAdmin.email = 'admin@goutham.com';
        oldAdmin.phone = '7349729767';
        oldAdmin.password = 'admin@123';
        await oldAdmin.save();
        console.log('✅ Admin migrated to admin@goutham.com');
        return;
    }

    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
        console.log('🔑 Creating default admin user...');
        await User.create({
            name: 'Admin',
            email: 'admin@goutham.com',
            password: 'admin@123',
            role: 'admin',
            phone: '7349729767'
        });
        console.log('✅ Default admin created (email: admin@goutham.com)');
    }
};

// Initialize database and seed data
let isDbConnected = false;

const initDB = async () => {
    if (!isDbConnected) {
        await connectDB();
        await seedProducts();
        await seedAdmin();
        isDbConnected = true;
    }
};

// For Vercel: Connect to DB on every request (uses cached connection)
app.use(async (req, res, next) => {
    try {
        await initDB();
        next();
    } catch (error) {
        console.error('DB connection error:', error);
        res.status(500).json({ message: 'Database connection failed' });
    }
});

// Development: Start local server
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    initDB().then(() => {
        app.listen(PORT, () => {
            console.log(`\n🐔 Goutham Fresh Chicken API`);
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📋 API Health: http://localhost:${PORT}/api/health\n`);
        });
    });
}

// Export for Vercel serverless
module.exports = app;
