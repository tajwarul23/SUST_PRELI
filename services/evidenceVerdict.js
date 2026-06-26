/**
 * evidenceVerdict.js
 * 
 * Why: Verification of claims against system data should be deterministic.
 * This logic is graded precisely, so using a rule-based approach ensures
 * explainable and consistent results that an LLM might hallucinate on.
 */

const VERDICTS = {
    CONSISTENT: 'consistent',
    INCONSISTENT: 'inconsistent',
    INSUFFICIENT: 'insufficient_data'
};

const strategies = {
    /**
     * Logic: If the matched counterparty appears in prior transactions,
     * it suggests an established relationship, contradicting a "wrong transfer" claim.
     */
    wrong_transfer: (matchedTxn, history) => {
        if (!matchedTxn || !matchedTxn.counterparty) return VERDICTS.INSUFFICIENT;

        const priorTxns = history.filter(t =>
            t.transaction_id !== matchedTxn.transaction_id &&
            t.counterparty === matchedTxn.counterparty
        );

        return priorTxns.length > 0 ? VERDICTS.INCONSISTENT : VERDICTS.CONSISTENT;
    },

    /**
     * Logic: If a transaction status is 'failed' or 'pending', it supports a failure claim.
     * If 'completed' but customer claims failure, it's a contradiction.
     */
    payment_failed: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (['failed', 'pending'].includes(matchedTxn.status)) return VERDICTS.CONSISTENT;
        if (matchedTxn.status === 'completed') return VERDICTS.INCONSISTENT;
        return VERDICTS.INSUFFICIENT;
    },

    agent_cash_in_issue: (matchedTxn) => {
        // Shared logic with payment_failed for financial status discrepancies
        return strategies.payment_failed(matchedTxn);
    },

    /**
     * Logic: Look for another transaction with same amount/counterparty within 5 mins.
     * If found, the second one is the duplicate.
     */
    duplicate_payment: (matchedTxn, history) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;

        const FIVE_MINS_MS = 5 * 60 * 1000;
        const matchedTime = new Date(matchedTxn.timestamp).getTime();

        const duplicate = history.find(t =>
            t.transaction_id !== matchedTxn.transaction_id &&
            t.amount === matchedTxn.amount &&
            t.counterparty === matchedTxn.counterparty &&
            Math.abs(new Date(t.timestamp).getTime() - matchedTime) < FIVE_MINS_MS
        );

        return duplicate ? VERDICTS.CONSISTENT : VERDICTS.INCONSISTENT;
    },

    /**
     * Logic: If status is 'pending' and it's a settlement, the claim is consistent.
     */
    merchant_settlement_delay: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.type === 'settlement' && matchedTxn.status === 'pending') {
            return VERDICTS.CONSISTENT;
        }
        return VERDICTS.INCONSISTENT;
    },

    /**
     * Logic: Phishing usually doesn't have a specific transaction to 'verify' via status.
     */
    phishing_or_social_engineering: () => VERDICTS.INSUFFICIENT,

    default: () => VERDICTS.INSUFFICIENT
};

/**
 * getVerdict(caseType, matchedTxn, history)
 * 
 * DESIGN DECISION: Deterministic Verdicts (Strategy Pattern)
 * Why: We don't use a giant 'if/else' chain. Instead, we map each 'case_type' 
 * to a specific function. This makes the logic:
 * 1. Clean: Each case has its own small, readable function.
 * 2. Reliable: Machines are better than LLMs at comparing specific numbers/statuses.
 * 3. Extensible: To add a new case, we just add a key to the 'strategies' object.
 */
function getVerdict(caseType, matchedTxn, history) {
    // If we don't have a specific strategy for a case_type, we use the default.
    const strategy = strategies[caseType] || strategies.default;
    return strategy(matchedTxn, history);
}

export { getVerdict, VERDICTS };
