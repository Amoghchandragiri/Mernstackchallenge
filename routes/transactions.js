const express = require('express');
const axios = require('axios');
const Transaction = require('../models/transaction');
const router = express.Router();

// Fetch and seed the database
router.get('/initialize', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        // Clear existing data
        await Transaction.deleteMany({});
        
        // Seed new data
        await Transaction.insertMany(transactions);
        res.status(200).send('Database initialized successfully');
    } catch (error) {
        res.status(500).send('Error initializing database');
    }
});

// List all transactions with search and pagination
router.get('/transactions', async (req, res) => {
    const { page = 1, perPage = 10, search = '', month } = req.query;
    const regex = new RegExp(search, 'i');
    const startOfMonth = new Date(2022, new Date(Date.parse(month +" 1, 2022")).getMonth(), 1);
    const endOfMonth = new Date(2022, startOfMonth.getMonth() + 1, 0);
    
    try {
        const transactions = await Transaction.find({
            dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
            $or: [
                { title: regex },
                { description: regex },
                { price: regex }
            ]
        })
        .skip((page - 1) * perPage)
        .limit(parseInt(perPage));

        const total = await Transaction.countDocuments({
            dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
            $or: [
                { title: regex },
                { description: regex },
                { price: regex }
            ]
        });

        res.json({ transactions, total, page, perPage });
    } catch (error) {
        res.status(500).send('Error fetching transactions');
    }
});

// Statistics API
router.get('/statistics', async (req, res) => {
    const { month } = req.query;
    const startOfMonth = new Date(2022, new Date(Date.parse(month +" 1, 2022")).getMonth(), 1);
    const endOfMonth = new Date(2022, startOfMonth.getMonth() + 1, 0);
    
    try {
        const totalSales = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, totalAmount: { $sum: "$price" }, totalSoldItems: { $sum: { $cond: [ "$sold", 1, 0 ] } }, totalNotSoldItems: { $sum: { $cond: [ "$sold", 0, 1 ] } } } }
        ]);

        res.json(totalSales[0]);
    } catch (error) {
        res.status(500).send('Error fetching statistics');
    }
});

// Bar chart API
router.get('/bar-chart', async (req, res) => {
    const { month } = req.query;
    const startOfMonth = new Date(2022, new Date(Date.parse(month +" 1, 2022")).getMonth(), 1);
    const endOfMonth = new Date(2022, startOfMonth.getMonth() + 1, 0);

    const priceRanges = [
        { range: '0-100', min: 0, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '201-300', min: 201, max: 300 },
        { range: '301-400', min: 301, max: 400 },
        { range: '401-500', min: 401, max: 500 },
        { range: '501-600', min: 501, max: 600 },
        { range: '601-700', min: 601, max: 700 },
        { range: '701-800', min: 701, max: 800 },
        { range: '801-900', min: 801, max: 900 },
        { range: '901-above', min: 901, max: Infinity }
    ];

    try {
        const results = await Promise.all(priceRanges.map(async range => {
            const count = await Transaction.countDocuments({
                dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
                price: { $gte: range.min, $lte: range.max }
            });

            return { range: range.range, count };
        }));

        res.json(results);
    } catch (error) {
        res.status(500).send('Error fetching bar chart data');
    }
});

// Pie chart API
router.get('/pie-chart', async (req, res) => {
    const { month } = req.query;
    const startOfMonth = new Date(2022, new Date(Date.parse(month +" 1, 2022")).getMonth(), 1);
    const endOfMonth = new Date(2022, startOfMonth.getMonth() + 1, 0);

    try {
        const categories = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        res.json(categories);
    } catch (error) {
        res.status(500).send('Error fetching pie chart data');
    }
});

module.exports = router;
