import { getVerdict } from './evidenceVerdict.js';

const DEPARTMENT_MAPPING = {
    wrong_transfer: 'dispute_resolution',
    payment_failed: 'payments_ops',
    duplicate_payment: 'payments_ops',
    refund_request: 'customer_support',
    phishing_or_social_engineering: 'fraud_risk',
    agent_cash_in_issue: 'agent_operations',
    merchant_settlement_delay: 'merchant_operations',
    other: 'customer_support'
};

function getSeverity(caseType, evidenceVerdict) {
    if (caseType === 'phishing_or_social_engineering') return 'critical';
    if (caseType === 'refund_request' || caseType === 'other') return 'low';
    if (caseType === 'merchant_settlement_delay') return 'medium';
    
    if (evidenceVerdict === 'consistent') return 'high';
    return 'medium';
}

function resolveMatchedTransaction(caseType, bestMatch, transaction_history) {
    if (caseType === 'duplicate_payment' && transaction_history && transaction_history.length >= 2) {
        const FIVE_MINS_MS = 5 * 60 * 1000;
        const sorted = [...transaction_history].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
        );
        for (let i = 0; i < sorted.length - 1; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const t1 = sorted[i], t2 = sorted[j];
                if (
                    t1.amount === t2.amount &&
                    t1.counterparty === t2.counterparty &&
                    Math.abs(new Date(t2.timestamp) - new Date(t1.timestamp)) < FIVE_MINS_MS
                ) {
                    return t2;
                }
            }
        }
    }
    return bestMatch;
}

function determineHumanReview(caseType, evidenceVerdict, severity, bestMatch, confidence) {
    if (evidenceVerdict === 'inconsistent') return true;
    if (severity === 'critical') return true;

    switch (caseType) {
        case 'wrong_transfer':
            return evidenceVerdict === 'consistent' && bestMatch !== null;

        case 'phishing_or_social_engineering':
            return true;

        case 'agent_cash_in_issue':
            return true;

        case 'duplicate_payment':
            return evidenceVerdict === 'consistent';

        case 'payment_failed':
            return false;

        case 'merchant_settlement_delay':
            return false;

        case 'refund_request':
            return false;

        case 'other':
            return false;

        default:
            return true;
    }
}

export {
    DEPARTMENT_MAPPING,
    getSeverity,
    resolveMatchedTransaction,
    determineHumanReview
};
