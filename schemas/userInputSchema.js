import { z } from 'zod';

const transactionSchema = z.object({
    transaction_id: z.string({
        required_error: "transaction_id is required"
    }),
    timestamp: z.string({
        required_error: "timestamp is required"
    }),
    type: z.enum(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]),
    amount: z.number({
        required_error: "amount is required"
    }),
    counterparty: z.string().nullable().optional(),
    status: z.enum(["completed", "failed", "pending", "reversed"])
});

const userInputSchema = z.object({
    ticket_id: z.string({
        required_error: "ticket_id is required"
    }),
    complaint: z.string({
        required_error: "complaint is required"
    }),
    language: z.enum(["en", "bn", "mixed"]).optional().default("en"),
    channel: z.enum(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"]).optional(),
    user_type: z.enum(["customer", "merchant", "agent", "unknown"]).optional(),
    campaign_context: z.string().optional(),
    transaction_history: z.array(transactionSchema).optional().default([]),
    metadata: z.record(z.any()).optional()
});

export { userInputSchema, transactionSchema };
