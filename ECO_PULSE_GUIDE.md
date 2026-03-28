# Eco-Pulse: Hyper-Local Climate Resilience

## 1. Project Overview
**Goal:** Build a Gemini-powered App that acts as a universal bridge between human intent/messy real-world inputs and complex systems, focusing on societal benefit.
**Specific Concept:** "Eco-Pulse" predicts hyper-local climate impacts. It bridges "Global Weather Data" with "Local Survival."
**Target Audience:** Farmers in climate-vulnerable regions.
**Constraints:**
- **Repository Size:** strictly < 10 MB
- **Cost:** $1 GCP Credit limit

## 2. Core Workflow (The Bridge)

### 2.1 The Messy Input
- Satellite imagery or photos of a specific farmer's field.
- Images of messy, handwritten logbooks containing past crop yields.
- Live, unstructured or semi-structured data from local sensors (e.g., soil moisture, heat-index).

### 2.2 The Gemini Transformation (Climate Strategist)
- **Role:** Gemini acts as the "Climate Strategist."
- **Logic:** It analyzes the multimodal input data and correlates sudden weather warnings (e.g., a 96-hour cyclone warning) with the specific ripeness/state of the user's crop (extracted via vision models from the photos).

### 2.3 The Life-Saving Action
- **No generic advice:** It does NOT just output "it will rain."
- **Function Call 1 (Logistics):** Triggers an API/Function Call to a local warehouse to reserve space for the farmer's impending harvest.
- **Function Call 2 (Communication):** Triggers an automated voice call in the farmer's local language (e.g., *"The storm will hit your specific plot by Tuesday; harvest the South-West quadrant now to save 70% of your income."*).

## 3. Architecture & Tech Stack Strategy
To stay under the $1 GCP budget and 10MB repo limit:
- **Frontend:** Lightweight web interface (Vanilla HTML/CSS/JS or minimally configured Vite). Avoid heavy UI frameworks to respect the 10MB limit.
- **Backend:** Node.js (Express or Fastify) deployed on **Google Cloud Run**. Cloud Run is a serverless container environment that scales to zero, billing only when requests are actively processed (making it highly cost-effective for the $1 budget). This allows full control over the server environment while remaining serverless.
- **AI Engine:** Google Gemini API (Multimodal for vision and text, with robust Function Calling features).
- **Storage:** Google Cloud Storage (for temporary image processing) with strict lifecycle policies to delete assets and save money.
- **Weather Fallback:** When the OpenWeatherMap API is unavailable (no key, invalid key, or network error), the system automatically injects realistic demo weather data showing an approaching cyclone. This ensures Gemini always has weather context to trigger life-saving function calls.
- **Action Layer:** Twilio API (or simple GCP Text-to-Speech) to simulate the voice call and simple mock APIs for the warehouse reservation system.

## 4. Evaluation Criteria & Agent Instructions
As an AI Agent developing this project, prioritize the following parameters:

### 1. Code Quality
- Write clean, modular, and self-documenting code.
- Keep dependencies to an absolute bare minimum.
- Apply strict formatting and linting.

### 2. Security
- **Never** hardcode API keys (Gemini, GCP, Twilio). Implement secure `.env` variable usage.
- Validate and sanitize all incoming unstructured strings and file uploads.
- Explicitly configure CORS.

### 3. Efficiency & Constraints
- **Repo Limit:** Optimize assets. Do not commit `node_modules`, large mock images, or `.env` files. Use `.gitignore` aggressively.
- **Budget ($1 GCP):** Optimize Gemini token usage by resizing/compressing images before sending them to the API. Cache responses where possible. Rely on GCP's generous Free Tier limits.

### 4. Testing
- Implement unit tests for data transformation logic.
- Mock the Gemini responses to test the Function Calling orchestrator without wasting API credits.
- Ensure automated testing on the CI/CD pipeline before any merge.

### 5. Accessibility
- The web UI must adhere to **WCAG 2.1** standards (aria-labels, contrast ratios, keyboard navigability).
- The use of voice output inherently serves as an accessibility feature for low-literacy users.

### 6. Efficient Google Services Integration
- Maximize the use of Gemini's **Function Calling** capabilities to directly map the analysis to warehouse and communication triggers.
- Use the **Gemini Multimodal API** natively instead of chaining separate OCR and LLM models.

## 5. Implementation Roadmap
1.  **Phase 1 - Skeleton:** Setup minimalist repo structure, `.gitignore`, and basic routing.
2.  **Phase 2 - UI & Inputs:** Create an accessible, responsive input form for uploading images, handwritten logs, and text data.
3.  **Phase 3 - Brain Integration:** Implement the Gemini API payload, including the system instructions (Climate Strategist persona) and tool declarations (Function Calls).
4.  **Phase 4 - Action Endpoints:** Build the mock warehouse reservation endpoint and configure the TTS/Voice call trigger.
5.  **Phase 5 - Final Polish:** Conduct accessibility audits, security checks, and ensure the `.git` folder size constraint (< 10MB) is maintained.
