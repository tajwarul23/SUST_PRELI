import { getVerdict } from './evidenceVerdict.js';
import { matchTransactions } from './transactionMatcher.js';

const CASE_PATTERNS = [
    {
        type: 'phishing_or_social_engineering',
        patterns: [
            /(otp|pin|password|won prize|unknown call|lottery|scam|block.*account)/i,
            /(পিন|ওটিপি|পাসওয়ার্ড|পুরস্কার|অপরিচিত কল|লটারি|স্ক্যাম)/
        ],
        department: 'fraud_risk',
        severity: 'critical'
    },
    {
        type: 'duplicate_payment',
        patterns: [
            /(twice|double|multiple times|two times|2 times|second time)/i,
            /(দুইবার|২ বার|বারবার|দ্বিগুণ)/
        ],
        department: 'payments_ops',
        severity: 'medium'
    },
    {
        type: 'merchant_settlement_delay',
        patterns: [
            /(settle|settlement|sales.*not.*settle)/i,
            /(সেটেলমেন্ট|সেটেল)/
        ],
        department: 'merchant_operations',
        severity: 'medium'
    },
    {
        type: 'agent_cash_in_issue',
        patterns: [
            /(cash in|cash-in)/i,
            /(ক্যাশ ইন)/
        ],
        department: 'agent_operations',
        severity: 'high'
    },
    {
        type: 'wrong_transfer',
        patterns: [
            /wrong.*(number|transfer|account|person|recipient|someone|friend|brother|sister)/i,
            /mistake.*(number|transfer|account|person|recipient|someone|friend|brother|sister)/i,
            /ভুল.*(নাম্বার|নম্বর|অ্যাকাউন্ট|পাঠিয়েছি|ব্যক্তি|মানুষ)/,
            /(sent|transfer).*to.*(brother|friend|sister|father|mother|relative|someone|number|person).*(not|n't|didn't).*(receive|get|arrive)/i
        ],
        department: 'dispute_resolution',
        severity: 'medium'
    },
    {
        type: 'payment_failed',
        patterns: [
            /(failed|not.*go|stuck|deducted|did.*not|error|declined)/i,
            /(ব্যর্থ|হয়নি|কেটে|অসফল|ব্যালেন্স)/
        ],
        department: 'payments_ops',
        severity: 'high'
    },
    {
        type: 'refund_request',
        patterns: [
            /(refund|money back|return.*money|changed.*mind|don't.*want|do not want)/i,
            /(ফেরত|রিফান্ড)/
        ],
        department: 'customer_support',
        severity: 'low'
    }
];

function classifyFallback(ticketData) {
    const { complaint, transaction_history, language } = ticketData;

    let matchedCase = null;
    for (const item of CASE_PATTERNS) {
        if (item.patterns.some(p => p.test(complaint))) {
            matchedCase = item;
            break;
        }
    }

    const caseType = matchedCase ? matchedCase.type : 'other';
    const candidates = matchTransactions(complaint, transaction_history);

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
