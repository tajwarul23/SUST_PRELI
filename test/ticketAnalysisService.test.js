import assert from 'node:assert/strict';
import { analyzeTicket } from '../services/ticketAnalysisService.js';

async function run() {
    const result = await analyzeTicket({
        ticket_id: 'T-100',
        complaint: 'I tried to pay my electricity bill of 1550 yesterday but the transaction failed. However, the money was deducted from my account.',
        language: 'en',
        transaction_history: [
            {
                transaction_id: 'TXN-101',
                timestamp: '2026-06-25T14:00:00Z',
                type: 'payment',
                amount: 1550,
                counterparty: 'DESCO',
                status: 'failed'
            }
        ]
    });

    assert.equal(result.case_type, 'payment_failed');
    assert.equal(result.evidence_verdict, 'consistent');
    console.log('ticket analysis service smoke test passed');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
