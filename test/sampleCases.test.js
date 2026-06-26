/**
 * testCases.js
 * 
 * Why: This is a validation harness to ensure the logic works as expected.
 * It simulates a series of POST requests and checks the output.
 */

const SAMPLE_CASES = [
    {
        name: "Failed Payment - English",
        payload: {
            ticket_id: "T-001",
            complaint: "I tried to pay my electricity bill of 1550 yesterday but the transaction failed. However, the money was deducted from my account.",
            language: "en",
            transaction_history: [
                {
                    transaction_id: "TXN-101",
                    timestamp: "2026-06-25T14:00:00Z",
                    type: "payment",
                    amount: 1550,
                    counterparty: "DESCO",
                    status: "failed"
                }
            ]
        },
        expected: {
            case_type: "payment_failed",
            evidence_verdict: "consistent"
        }
    },
    {
        name: "Wrong Transfer - Bangla",
        payload: {
            ticket_id: "T-002",
            complaint: "আমি ভুল করে ০১৮৭৬৩৪৪৫২১ এই নাম্বারে ৫০০ টাকা পাঠিয়েছি। দয়া করে এটা ফেরত দিন।",
            language: "bn",
            transaction_history: [
                {
                    transaction_id: "TXN-202",
                    timestamp: "2026-06-25T15:30:00Z",
                    type: "transfer",
                    amount: 500,
                    counterparty: "01876344521",
                    status: "completed"
                }
            ]
        },
        expected: {
            case_type: "wrong_transfer",
            evidence_verdict: "consistent"
        }
    },
    {
        name: "Phishing Attempt",
        payload: {
            ticket_id: "T-003",
            complaint: "Someone called me from 'Nagad' and asked for my OTP to give me a 5000tk prize. Is this real?",
            language: "en",
            transaction_history: []
        },
        expected: {
            case_type: "phishing_or_social_engineering",
            severity: "critical"
        }
    },
    {
        name: "Wrapped Input Payload",
        payload: {
            input: {
                ticket_id: "T-004",
                complaint: "I accidentally sent 2500 taka to a wrong number and want help recovering it.",
                language: "en",
                transaction_history: [
                    {
                        transaction_id: "TXN-9001",
                        timestamp: "2026-06-26T10:00:00Z",
                        type: "transfer",
                        amount: 2500,
                        counterparty: "01700000000",
                        status: "completed"
                    }
                ]
            }
        },
        expected: {
            case_type: "wrong_transfer",
            evidence_verdict: "consistent"
        }
    }
];

async function runTests() {
    const PORT = 3000;
    const URL = `http://localhost:${PORT}/analyze-ticket`;

    console.log("🧪 Starting Local Validation Harness...\n");

    let passed = 0;
    for (const test of SAMPLE_CASES) {
        process.stdout.write(`Testing: ${test.name}... `);

        try {
            const response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(test.payload)
            });

            if (!response.ok) {
                console.log("❌ FAILED (Status: " + response.status + ")");
                continue;
            }

            const data = await response.json();

            // Basic validation
            let caseMatch = data.case_type === test.expected.case_type;
            let verdictMatch = test.expected.evidence_verdict ? data.evidence_verdict === test.expected.evidence_verdict : true;
            let severityMatch = test.expected.severity ? data.severity === test.expected.severity : true;

            if (caseMatch && verdictMatch && severityMatch) {
                console.log("✅ PASSED");
                passed++;
            } else {
                console.log("❌ FAILED");
                console.log(`   Expected: ${JSON.stringify(test.expected)}`);
                console.log(`   Actual:   { case_type: "${data.case_type}", evidence_verdict: "${data.evidence_verdict}", severity: "${data.severity}" }`);
            }
        } catch (err) {
            console.log("❌ ERROR: " + err.message);
        }
    }

    console.log(`\n📊 Summary: ${passed}/${SAMPLE_CASES.length} tests passed.`);
}

runTests();
