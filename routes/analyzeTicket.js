/**
 * analyzeTicket.js
 * 
 * Why: This is the orchestrator. It handles input validation,
 * coordinates the deterministic matching, attempts the LLM path,
 * and gracefully falls back to rules if something fails.
 */

import express from 'express';
const router = express.Router();

import { matchTransactions } from '../services/transactionMatcher.js';
import { getVerdict } from '../services/evidenceVerdict.js';
import { classifyWithGemini } from '../services/geminiClassifier.js';
import { classifyFallback } from '../services/rulesFallbackClassifier.js';
import { applySafetyFilter } from '../services/safetyFilter.js';
import { buildResponse } from '../services/responseBuilder.js';

router.post('/analyze-ticket', async (req, res) => {
    // DESIGN DECISION: Support both flat and wrapped (input: {}) payload shapes
    // Why: Some test harnesses wrap the actual request in an 'input' or 'data' key.
    const source = req.body.input || req.body.data || req.body;

    const {
        ticket_id,
        complaint,
        transaction_history = [],
        language = 'en'
    } = source;

    const missingFields = [];
    if (!ticket_id) missingFields.push('ticket_id');
    if (!complaint) missingFields.push('complaint');

    console.log(`📥 Incoming Ticket: ID=${ticket_id}, Complaint Length=${complaint?.length || 0}`);
    if (missingFields.length > 0) {
        console.warn("⚠️ Validation Failed: missing required fields.", { missingFields, source });
        return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    try {
        // STEP 1: PRE-ANALYSIS (Deterministic)
        // Why: Machines are perfect at finding "TXN-123" in text. 
        // We do this first so we can "hand over" the facts to the LLM later.
        const candidates = matchTransactions(complaint, transaction_history);

        // Pick the best match only if there's a clear winner.
        const bestMatch = (candidates.length === 1 || (candidates.length > 1 && candidates[0].matchScore > candidates[1].matchScore))
            ? candidates[0]
            : null;

        let classification;
        try {
            // STEP 2: LLM CLASSIFICATION (The "Nuance" Phase)
            // Why: Gemini understands if the user is angry, sarcasm, or describing a complex scam.
            const preAnalysis = {
                matchedTxn: bestMatch,
                verdict: 'computed_later' // The LLM picks the case_type, THEN we run the verdict rule
            };

            const geminiResult = await classifyWithGemini(source, preAnalysis);

            // STEP 3: FINAL VERDICT (Closing the Loop)
            // Now that Gemini decided the case_type (e.g. 'duplicate_payment'), we run our
            // rules-based verdict logic on the transaction history.
            const finalVerdict = getVerdict(geminiResult.case_type, bestMatch, transaction_history);

            classification = {
                ...geminiResult,
                ticket_id,
                relevant_transaction_id: bestMatch ? bestMatch.transaction_id : null,
                evidence_verdict: finalVerdict,
                human_review_required: geminiResult.confidence < 0.8 // Dynamic based on AI certainty
            };

        } catch (llmError) {
            // STEP 4: GRACEFUL DEGRADATION (Safety Net)
            // Why: Even if Google's API is down, we MUST return a valid response to the user.
            console.error("Gemini failed/timed out. Falling back to rules...");
            classification = classifyFallback(source);
        }

        // STEP 5: SAFETY SCAN (Policy Compliance)
        // Why: LLMs might accidentally promise things we can't do (like direct refunds).
        classification.customer_reply = applySafetyFilter(classification.customer_reply, language);

        // STEP 6: RESPONSE BUILDING (API Contract)
        // Why: This ensures we never forget a field or return the wrong data type.
        const finalResponse = buildResponse(classification);

        res.json(finalResponse);

    } catch (err) {
        console.error("CRITICAL SYSTEM ERROR:", err);
        // Disaster fallback: If even the logic above crashes, return a safe "Other" classification.
        const disasterFallback = classifyFallback(req.body);
        res.json(buildResponse(disasterFallback));
    }
});

export default router;
