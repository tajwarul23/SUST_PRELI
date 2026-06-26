import express from 'express';
import { userInputSchema } from '../schemas/userInputSchema.js';
import { matchTransactions } from '../services/transactionMatcher.js';
import { getVerdict } from '../services/evidenceVerdict.js';
import { classifyWithGroq } from '../services/groqClassifier.js';
import { classifyFallback } from '../services/rulesFallbackClassifier.js';
import { applySafetyFilter } from '../services/safetyFilter.js';
import { buildResponse } from '../services/responseBuilder.js';
import {
    DEPARTMENT_MAPPING,
    getSeverity,
    resolveMatchedTransaction,
    determineHumanReview
} from '../services/ticketHelpers.js';

const router = express.Router();

router.post('/analyze-ticket', async (req, res) => {
    const source = req.body.input || req.body.data || req.body;

    const validation = userInputSchema.safeParse(source);
    if (!validation.success) {
        console.warn("⚠️ Validation Failed:", validation.error.format());
        return res.status(400).json({
            error: "Validation failed",
            details: validation.error.format()
        });
    }

    const {
        ticket_id,
        complaint,
        transaction_history,
        language
    } = validation.data;

    console.log(`📥 Incoming Ticket: ID=${ticket_id}, Complaint Length=${complaint?.length || 0}`);

    try {
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
            console.error("Groq failed/timed out. Falling back to rules...");
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

        const finalResponse = buildResponse(classification);
        res.json(finalResponse);

    } catch (err) {
        console.error("CRITICAL SYSTEM ERROR:", err);
        const disasterFallback = classifyFallback(req.body);
        res.json(buildResponse(disasterFallback));
    }
});

export default router;
