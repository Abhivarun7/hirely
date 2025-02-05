require('dotenv').config(); // Ensure you have a .env file with DB_URI
const express = require('express');
const cors = require('cors');
const connectDB = require('./connectdb'); // Ensure this is implemented correctly
const jobRouter = require('./routes/jobroutes'); // Correct path
const clientRouter = require('./routes/clientRoutes'); // Correct path
const userRouter = require('./routes/userRoutes'); // Correct path
const adminRouter = require('./routes/adminRoutes'); // Correct path

const app = express();

// Connect to MongoDB
connectDB();

// Configure CORS dynamically for multiple origins
const allowedOrigins = ['http://localhost:5173', 'https://hirely-0v4z.onrender.com']; // Add other origins as needed
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests without origin (like from Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
}));

// Middleware for parsing JSON
app.use(express.json());

// API Routes
app.use('/api/jobs', jobRouter);
app.use('/api/users', userRouter);
app.use('/api/clients', clientRouter);
app.use('/api/admin', adminRouter);

// Default error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
