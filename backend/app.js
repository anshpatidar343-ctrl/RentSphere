const path = require('path');
const express = require('express');
const db = require('./config/db');
const authRoutes = require('./routes/authroutes.js');
const campusRoutes = require('./routes/campusroutes.js');
const roomRoutes = require('./routes/roomroutes.js');
const tenantRoutes = require('./routes/tenantroutes.js');
const rentRoutes = require('./routes/rentroutes.js');
const paymentRoutes = require('./routes/paymentroutes.js');
const documentRoutes = require('./routes/documentroutes.js');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('RentSphere Backend Running');
});

// Auth endpoints (signup and login are public inside authRoutes; /me is protected)
app.use('/api/auth', authRoutes);

// Protected business endpoints requiring valid JWT token
app.use('/api/campuses', authMiddleware, campusRoutes);
app.use('/api/rooms', authMiddleware, roomRoutes);
app.use('/api/tenants', authMiddleware, tenantRoutes);
app.use('/api/rent', authMiddleware, rentRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
