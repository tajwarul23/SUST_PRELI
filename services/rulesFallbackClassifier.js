/**
 * rulesFallbackClassifier.js
 * 
 * Why: High availability is critical. If Gemini is down or slow,
 * we must still provide a structured, sensible response.
 * This uses regex patterns to categorize the complaint.
 */

import { getVerdict } from './evidenceVerdict.js';
import { matchTransactions } from './transactionMatcher.js';

const CASE_PATTERNS = [
    {
        type: 'wrong_transfer',
        patterns: [/(wrong|mistake).*(number|transfer|account)/i, /ভুল.*(নাম্বার|নম্বর|অ্যাকাউন্ট|পাঠিয়েছি)/],
        department: 'dispute_resolution',
        severity: 'medium'
    },
    {
        type: 'payment_failed',
        patterns: [/(failed|not.*go|stuck|deducted|did.*not)/i, /(ব্যর্থ|হয়নি|কেটে|অসফল)/],
        department: 'payments_ops',
        severity: 'high'
    },
    {
        type: 'duplicate_payment',
        patterns: [/(twice|double|multiple times)/i, /(দুইবার|২ বার|বারবার)/],
        department: 'payments_ops',
        severity: 'medium'
    },
    {
        type: 'phishing_or_social_engineering',
        patterns: [/(otp|pin|password|won prize|unknown call)/i, /(পিন|ওটিপি|পাসওয়ার্ড|পুরস্কার|অপরিচিত কল)/],
        department: 'fraud_risk',
        severity: 'critical'
    },
    {
        type: 'agent_cash_in_issue',
        patterns: [/(agent|cash in|shop)/i, /(এজেন্ট|ক্যাশ ইন|দোকান)/],
        department: 'agent_operations',
        severity: 'high'
    },
    {
        type: 'merchant_settlement_delay',
        patterns: [/(settlement|merchant pay|delay)/i, /(সেটেলমেন্ট|মার্চেন্ট পে|দেরি)/],
        department: 'merchant_operations',
        severity: 'medium'
    }
];

/**
 * Fallback classifier that doesn't rely on LLMs.
 */
function classifyFallback(ticketData) {
    const { complaint, transaction_history, language } = ticketData;

    let matchedCase = null;
    // Walk through our pattern list. The first one to match "wins".
    for (const item of CASE_PATTERNS) {
        if (item.patterns.some(p => p.test(complaint))) {
            matchedCase = item;
            break;
        }
    }

    const caseType = matchedCase ? matchedCase.type : 'other';
    const candidates = matchTransactions(complaint, transaction_history);

    // Logic: If candidates are ambiguous (2+ with same score), treat as insufficient
    const bestMatch = (candidates.length === 1 || (candidates.length > 1 && candidates[0].matchScore > candidates[1].matchScore))
        ? candidates[0]
        : null;

    const verdict = getVerdict(caseType, bestMatch, transaction_history);

    const isBangla = language === 'bn';

    return {
        ticket_id: ticketData.ticket_id,
        relevant_transaction_id: bestMatch ? bestMatch.transaction_id : null,
        evidence_verdict: verdict,
        case_type: caseType,
        severity: matchedCase ? matchedCase.severity : 'low',
        department: matchedCase ? matchedCase.department : 'customer_support',
        agent_summary: isBangla
            ? "সিস্টেম রুলস ব্যবহার করে ফলাফল প্রদান করা হয়েছে।"
            : "Classification generated via rules-based fallback.",
        recommended_next_action: "Initial automated check completed. Escalating for human verification.",
        customer_reply: isBangla
            ? "আপনার অভিযোগটি নিবন্ধিত হয়েছে। আমাদের একজন প্রতিনিধি এটি পর্যালোচনা করবেন।"
            : "Your complaint has been registered. An agent will review the details shortly.",
        human_review_required: true,
        confidence: 0.5,
        reason_codes: ["RULE_BASED_MATCH", "GEMINI_FALLBACK"]
    };
}

export { classifyFallback };
