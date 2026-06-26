import { userInputSchema } from '../schemas/userInputSchema.js';
import { matchTransactions } from './transactionMatcher.js';
import { getVerdict } from './evidenceVerdict.js';
import { classifyWithGroq } from './groqClassifier.js';
import { classifyFallback } from './rulesFallbackClassifier.js';
import { applySafetyFilter } from './safetyFilter.js';
import { buildResponse } from './responseBuilder.js';
import {
    DEPARTMENT_MAPPING,
    getSeverity,
    resolveMatchedTransaction,
    determineHumanReview
} from './ticketHelpers.js';

async function analyzeTicket(payload) {
    const source = payload.input || payload.data || payload;
    const validation = userInputSchema.safeParse(source);

    if (!validation.success) {
        const error = new Error('Validation failed');
        error.details = validation.error.format();
        throw error;
    }

    const { ticket_id, complaint, transaction_history, language } = validation.data;

    const candidates = matchTransactions(complaint, transaction_history);
    const bestMatch = (candidates.length === 1 || (candidates.length > 1 && candidates[0].matchScore > candidates[1].matchScore))
        ? candidates[0]
        : null;

    let classification;
    try {
        const preAnalysis = {
            matchedTxn: bestMatch,
            verdict: 'computed_later'
        };
        classification = await classifyWithGroq(source, preAnalysis);
    } catch (llmError) {
        console.error('Groq failed/timed out. Falling back to rules...');
        classification = classifyFallback(source);
    }

    const caseType = classification.case_type;
    const resolvedMatch = resolveMatchedTransaction(caseType, bestMatch, transaction_history);
    const finalVerdict = getVerdict(caseType, resolvedMatch, transaction_history);

    const relevantTxnId = resolvedMatch ? resolvedMatch.transaction_id : null;
    const finalSeverity = getSeverity(caseType, finalVerdict);
    const finalDept = DEPARTMENT_MAPPING[caseType] || 'customer_support';
    const finalHumanReview = determineHumanReview(caseType, finalVerdict, finalSeverity, resolvedMatch, classification.confidence);

    classification.ticket_id = ticket_id;
    classification.relevant_transaction_id = relevantTxnId;
    classification.evidence_verdict = finalVerdict;
    classification.severity = finalSeverity;
    classification.department = finalDept;
    classification.human_review_required = finalHumanReview;
    classification.customer_reply = applySafetyFilter(classification.customer_reply, language);

    return buildResponse(classification);
}

export { analyzeTicket };
