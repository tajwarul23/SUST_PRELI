
function normalizeDigits(text) {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return text.replace(/[০-৯]/g, d => banglaDigits.indexOf(d));
}


function matchTransactions(complaint, history = []) {
    if (!history || history.length === 0) return [];

    
    const text = normalizeDigits(complaint.toLowerCase());

    
    const amounts = (text.match(/(\d{2,})/g) || []).map(Number);
    const foundIds = (text.match(/[a-z0-9-]{5,}/gi) || []).map(id => id.toLowerCase());

    const scoredHistory = history.map(txn => {
        let score = 0;

        
        if (foundIds.includes(txn.transaction_id.toLowerCase())) score += 10;

        
        if (amounts.includes(txn.amount)) score += 5;

        
        if (text.includes(txn.type.replace('_', ' '))) score += 2;

        
        if (txn.counterparty && text.includes(txn.counterparty.toLowerCase())) score += 3;

        return { ...txn, matchScore: score };
    });

    
    return scoredHistory
        .filter(txn => txn.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
}

export { matchTransactions };
