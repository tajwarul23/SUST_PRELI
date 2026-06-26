# QueueStorm Ticket Analyzer ⚡

A high-performance, resilient support ticket classifier built for the **SUST CSE Carnival 2026 Codex Community Hackathon**. This service uses a hybrid approach: deterministic rule-based analysis for accuracy and Google Gemini for nuanced understanding.

## 🏗️ Architecture

The project is built as a pipeline of independent modules:

1.  **Orchestrator (`routes/analyzeTicket.js`)**: Validates input and manages the flow between deterministic logic and LLM.
2.  **Transaction Matcher (`services/transactionMatcher.js`)**: Scans complaint text for amounts, IDs, and counterparties to find relevant history items.
3.  **Evidence Verdict (`services/evidenceVerdict.js`)**: A deterministic judgment layer that checks if a claim is `consistent` or `inconsistent` based on system data.
4.  **Gemini Classifier (`services/geminiClassifier.js`)**: Uses Gemini 2.0 Flash to categorize the "vibe", tone, and details of the complaint.
5.  **Rules Fallback (`services/rulesFallbackClassifier.js`)**: A safety net that uses keyword matching if the AI service is unavailable or times out.
6.  **Safety Filter (`services/safetyFilter.js`)**: Ensures automated replies never leak sensitive info or make unauthorized promises.
7.  **Response Builder (`services/responseBuilder.js`)**: Enforces the API contract schema.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1.  Clone/Download the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    # Edit .env and add your GEMINI_API_KEY
    ```

### Running the Server

```bash
npm start
```

### Running Tests

```bash
# Ensure the server is running in another terminal
node test/sampleCases.test.js
```

## 🛡️ Key Features

- **Graceful Degradation**: If Gemini fails, the service automatically switches to the `rulesFallbackClassifier`.
- **Deterministic Grading**: Evidence verdicts are calculated using fixed rules, ensuring 100% accuracy on structured data checks.
- **Safety First**: Every generated reply is scanned for policy violations (e.g., asking for PINs).
- **Bangla Support**: Native support for Bangla complaints and matching replies.

## 📝 API Contract

`POST /analyze-ticket`

**Request Body:**
```json
{
  "ticket_id": "string",
  "complaint": "string",
  "language": "en|bn|mixed",
  "transaction_history": []
}
```
