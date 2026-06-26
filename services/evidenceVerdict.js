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
    wrong_transfer: (matchedTxn, history) => {
        if (!matchedTxn || !matchedTxn.counterparty) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.type !== 'transfer') return VERDICTS.INCONSISTENT;
        if (matchedTxn.status !== 'completed') return VERDICTS.INCONSISTENT;

        const priorTxns = history.filter(t =>
            t.transaction_id !== matchedTxn.transaction_id &&
            t.counterparty === matchedTxn.counterparty &&
            t.status === 'completed'
        );

        return priorTxns.length > 0 ? VERDICTS.INCONSISTENT : VERDICTS.CONSISTENT;
    },

    payment_failed: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (['failed', 'pending'].includes(matchedTxn.status)) return VERDICTS.CONSISTENT;
        if (['completed', 'reversed'].includes(matchedTxn.status)) return VERDICTS.INCONSISTENT;
        return VERDICTS.INSUFFICIENT;
    },

    agent_cash_in_issue: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.type !== 'cash_in') return VERDICTS.INCONSISTENT;
        if (['failed', 'pending'].includes(matchedTxn.status)) return VERDICTS.CONSISTENT;
        if (['completed', 'reversed'].includes(matchedTxn.status)) return VERDICTS.INCONSISTENT;
        return VERDICTS.INSUFFICIENT;
    },

    refund_request: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.status === 'completed') return VERDICTS.CONSISTENT;
        if (['failed', 'pending', 'reversed'].includes(matchedTxn.status)) return VERDICTS.INCONSISTENT;
        return VERDICTS.INSUFFICIENT;
    },

    duplicate_payment: (matchedTxn, history) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.status !== 'completed') return VERDICTS.INCONSISTENT;

        const FIVE_MINS_MS = 5 * 60 * 1000;
        const matchedTime = new Date(matchedTxn.timestamp).getTime();

        const duplicate = history.find(t =>
            t.transaction_id !== matchedTxn.transaction_id &&
            t.amount === matchedTxn.amount &&
            t.counterparty === matchedTxn.counterparty &&
            t.status === 'completed' &&
            Math.abs(new Date(t.timestamp).getTime() - matchedTime) < FIVE_MINS_MS
        );

        return duplicate ? VERDICTS.CONSISTENT : VERDICTS.INCONSISTENT;
    },

    merchant_settlement_delay: (matchedTxn) => {
        if (!matchedTxn) return VERDICTS.INSUFFICIENT;
        if (matchedTxn.type !== 'settlement') return VERDICTS.INCONSISTENT;
        if (['failed', 'pending'].includes(matchedTxn.status)) return VERDICTS.CONSISTENT;
        if (matchedTxn.status === 'completed') return VERDICTS.INCONSISTENT;
        return VERDICTS.INSUFFICIENT;
    },

    phishing_or_social_engineering: () => VERDICTS.INSUFFICIENT,
    other: () => VERDICTS.INSUFFICIENT,
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
