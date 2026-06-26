import { z } from 'zod';

const responseSchema = z.object({
    ticket_id: z.string(),
    relevant_transaction_id: z.string().nullable(),
    evidence_verdict: z.enum(['consistent', 'inconsistent', 'insufficient_data']),
    case_type: z.enum([
        'wrong_transfer', 'payment_failed', 'refund_request', 'duplicate_payment',
        'merchant_settlement_delay', 'agent_cash_in_issue', 'phishing_or_social_engineering', 'other'
    ]),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    department: z.enum([
        'customer_support', 'dispute_resolution', 'payments_ops', 'merchant_operations', 'agent_operations', 'fraud_risk'
    ]),
    agent_summary: z.string(),
    recommended_next_action: z.string(),
    customer_reply: z.string(),
    human_review_required: z.boolean(),
    confidence: z.number().min(0).max(1),
    reason_codes: z.array(z.string())
});

function buildResponse(data) {
    const rawData = {
        ticket_id: data.ticket_id || 'unknown',
        relevant_transaction_id: data.relevant_transaction_id || null,
        evidence_verdict: data.evidence_verdict || 'insufficient_data',
        case_type: data.case_type || 'other',
        severity: data.severity || 'medium',
        department: data.department || 'customer_support',
        agent_summary: data.agent_summary || 'No summary available.',
        recommended_next_action: data.recommended_next_action || 'Escalate to human agent.',
        customer_reply: data.customer_reply || 'Thank you for contacting us.',
        human_review_required: data.human_review_required ?? true,
        confidence: data.confidence ?? 0.0,
        reason_codes: data.reason_codes || []
    };

    return responseSchema.parse(rawData);
}

export { buildResponse };
