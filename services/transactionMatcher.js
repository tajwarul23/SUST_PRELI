/**
 * transactionMatcher.js
 * 
 * Why: Deterministic transaction matching is faster, cheaper, and more reliable than LLM for extracting 
 * structured data from structured history. We use keyword and regex matching to find candidates.
 */

/**
 * Normalizes Bangla digits to English digits.
 */
function normalizeDigits(text) {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return text.replace(/[০-৯]/g, d => banglaDigits.indexOf(d));
}

/**
 * matches transactions in history based on signals extracted from the complaint.
 * 
 * DESIGN DECISION: Scoring System
 * We don't just pick the first match. We assign "confidence points" to different signals.
 * - Transaction ID (10 pts): The "gold standard". If they mention the ID, it's almost certainly the one.
 * - Amount (5 pts): Strong, but people often pay the same amount for different things.
 * - Counterparty (3 pts): Good signal (e.g., "sent to my brother"), but names are often ambiguous.
 * - Type (2 pts): Weak signal (e.g., "the payment"), used for tie-breaking.
 */
function matchTransactions(complaint, history = []) {
    if (!history || history.length === 0) return [];

    // Pre-process: Normalize Bangla digits (০-৯) to Arabic digits (0-9)
    // Why: Users might type "৫০০" in Bangla, but our DB stores "500".
    const text = normalizeDigits(complaint.toLowerCase());

    // 1. Extract potential signals from the complaint text
    const amounts = (text.match(/(\d{2,})/g) || []).map(Number);
    const foundIds = (text.match(/[a-z0-9-]{5,}/gi) || []).map(id => id.toLowerCase());

    const scoredHistory = history.map(txn => {
        let score = 0;

        // SIGNAL: Transaction ID Match
        if (foundIds.includes(txn.transaction_id.toLowerCase())) score += 10;

        // SIGNAL: Amount Match
        if (amounts.includes(txn.amount)) score += 5;

        // SIGNAL: Transaction Type (e.g. "payment", "transfer")
        if (text.includes(txn.type.replace('_', ' '))) score += 2;

        // SIGNAL: Phone number or Merchant name
        if (txn.counterparty && text.includes(txn.counterparty.toLowerCase())) score += 3;

        return { ...txn, matchScore: score };
    });

    // We only care about transactions that match AT LEAST one signal
    return scoredHistory
        .filter(txn => txn.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
}

export { matchTransactions };
