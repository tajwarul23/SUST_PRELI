

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


function getVerdict(caseType, matchedTxn, history) {
    
    const strategy = strategies[caseType] || strategies.default;
    return strategy(matchedTxn, history);
}

export { getVerdict, VERDICTS };
