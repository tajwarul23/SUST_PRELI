/**
 * index.js
 * 
 * Why: Standard Express entry point. Loads env vars and mounts routes.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import analyzeRoute from './routes/analyzeTicket.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main Endpoint
app.use('/', analyzeRoute);

// Simple Health Check
app.get('/health', (req, res) => {
    res.json({ status: "ok", service: "QueueStorm Ticket Analyzer" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 QueueStorm Analyzer running on port ${PORT}`);
    console.log(`📡 Endpoint: POST http://localhost:${PORT}/analyze-ticket`);
});
