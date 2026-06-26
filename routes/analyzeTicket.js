import express from 'express';
import { analyzeTicket } from '../services/ticketAnalysisService.js';

const router = express.Router();

router.post('/analyze-ticket', async (req, res) => {
    try {
        const response = await analyzeTicket(req.body);
        res.json(response);
    } catch (error) {
        console.warn('Validation Failed:', error.details || error.message);
        if (error.details) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.details
            });
        }

        console.error('CRITICAL SYSTEM ERROR:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router;
