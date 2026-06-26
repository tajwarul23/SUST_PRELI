/**
 * safetyFilter.js
 * 
 * Why: Automated replies carry reputational and security risks.
 * This filter prevents leaking sensitive instructions or making
 * unauthorized promises (like "I will refund you now").
 */

const VIOLATIONS = [
    {
        pattern: /(pin|otp|password|passcode|cvv)/gi,
        reason: 'Sensitive data request detected'
    },
    {
        pattern: /(will refund you|reversing the money now|your money is sent back)/gi,
        reason: 'Unauthorized refund promise'
    },
    {
        pattern: /(call me at|telegram|whatsapp|message me on)/gi,
        reason: 'Outside official channels'
    }
];

const GENERIC_FALLBACKS = {
    en: "Thank you for reaching out. We have received your complaint and our team is investigating. Any eligible amount will be returned through official channels if applicable.",
    bn: "আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমরা আপনার অভিযোগটি পেয়েছি এবং আমাদের টিম এটি তদন্ত করছে। প্রযোজ্য ক্ষেত্রে যেকোনো যোগ্য পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে।"
};

/**
 * Scans a reply for violations and returns a safe version.
 * @param {string} reply - The generated customer reply.
 * @param {string} language - Language code ('en'|'bn'|'mixed').
 * @returns {string} - The original or sanitized reply.
 */
function applySafetyFilter(reply, language = 'en') {
    const lang = language === 'bn' ? 'bn' : 'en';

    for (const violation of VIOLATIONS) {
        if (violation.pattern.test(reply)) {
            console.warn(`Safety violation caught: ${violation.reason}`);
            return GENERIC_FALLBACKS[lang];
        }
    }

    return reply;
}

export { applySafetyFilter };
