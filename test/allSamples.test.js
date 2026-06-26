import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const URL = `http://localhost:${PORT}/analyze-ticket`;

async function runAllSamples() {
    console.log("🧪 Running all 10 sample cases from SUST_Preli_Sample_Cases (1).json...\n");

    const jsonPath = path.join(__dirname, '..', 'SUST_Preli_Sample_Cases (1).json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    let passed = 0;
    let failed = 0;

    for (const testCase of data.cases) {
        console.log(`--------------------------------------------------`);
        console.log(`Case ID: ${testCase.id} - ${testCase.label}`);
        
        try {
            const response = await fetch(URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testCase.input)
            });

            if (!response.ok) {
                console.log(`❌ HTTP Error: ${response.status}`);
                failed++;
                continue;
            }

            const actual = await response.json();
            const expected = testCase.expected_output;

            const checks = {
                relevant_transaction_id: actual.relevant_transaction_id === expected.relevant_transaction_id,
                evidence_verdict: actual.evidence_verdict === expected.evidence_verdict,
                case_type: actual.case_type === expected.case_type,
                department: actual.department === expected.department,
                severity: actual.severity === expected.severity,
                human_review_required: actual.human_review_required === expected.human_review_required
            };

            const allPassed = Object.values(checks).every(v => v === true);

            if (allPassed) {
                console.log(`✅ PASSED`);
                passed++;
            } else {
                console.log(`❌ FAILED`);
                failed++;
                console.log(`   Actual Response: ${JSON.stringify(actual, null, 2)}`);
                for (const [key, value] of Object.entries(checks)) {
                    if (!value) {
                        console.log(`   Mismatch [${key}]:`);
                        console.log(`     Expected: ${JSON.stringify(expected[key])}`);
                        console.log(`     Actual:   ${JSON.stringify(actual[key])}`);
                    }
                }
            }
        } catch (err) {
            console.log(`❌ ERROR: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n==================================================`);
    console.log(`📊 Summary: ${passed} passed, ${failed} failed.`);
    console.log(`==================================================\n`);
}

runAllSamples();
