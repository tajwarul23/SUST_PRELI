import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import analyzeRoute from './routes/analyzeTicket.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', analyzeRoute);

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Ticket Analyzer is live' });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Ticket Analyzer running on port ${PORT}`);
        console.log(`Endpoint: POST http://localhost:${PORT}/analyze-ticket`);
    });
}

export default app;
