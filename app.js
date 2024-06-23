const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const transactionRoutes = require('./routes/transactions');

const app = express();
app.use(express.json());
app.use('/api', transactionRoutes);

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }).catch(err => {
        console.error('Failed to connect to MongoDB', err);
    });
