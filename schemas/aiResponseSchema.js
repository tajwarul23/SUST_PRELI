import { z } from 'zod';

const aiResponseSchema = z.object({
    case_type: z.enum([
        "wrong_transfer", "payment_failed", "refund_request", "duplicate_payment",
        "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"
    ]),
    severity: z.enum(["low", "medium", "high", "critical"]),
    department: z.enum([
        "customer_support", "dispute_resolution", "payments_ops", "merchant_operations", "agent_operations", "fraud_risk"
    ]),
    agent_summary: z.string(),
    recommended_next_action: z.string(),
    customer_reply: z.string(),
    confidence: z.number().min(0).max(1),
    reason_codes: z.array(z.string())
});

export { aiResponseSchema };
