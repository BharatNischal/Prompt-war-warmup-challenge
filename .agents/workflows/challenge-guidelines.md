---
description: Guidelines for the Prompt Wars challenge to maximize AI evaluation scores across all 7 categories
---

# Prompt Wars Challenge — Score Maximization Guidelines

## Scorecard Analysis (Warmup Round)

| Category | Score | Status |
|---|---|---|
| Code Quality | 86.25% | 🟡 Good — room to improve |
| Security | 97.5% | 🟢 Excellent |
| Efficiency | 100% | 🟢 Perfect |
| Testing | 68.75% | 🔴 Weak — major improvement needed |
| Accessibility | 97.5% | 🟢 Excellent |
| Google Services | 25% | 🔴 CRITICAL — biggest gap |
| Problem Statement Alignment | 97% | 🟢 Excellent |
| **Overall** | **85.94%** | |

---

## 🔴 PRIORITY 1: Google Services (25% → Target 90%+)

This is the single biggest score gap. The evaluator said: *"Adoption is at an early stage, with initial usage of Google services such as Google Cloud, Firebase, or basic APIs."*

### What Was Missing
We only used Gemini API. The evaluator wants to see **deep, multi-service Google Cloud integration**.

### Mandatory Actions for Next Round
1. **Use Google Cloud Client Libraries** (not just REST APIs):
   ```bash
   npm install @google-cloud/storage @google-cloud/text-to-speech @google-cloud/firestore @google-cloud/logging
   ```

2. **Google Cloud Storage** — Store uploaded images in GCS:
   ```javascript
   import { Storage } from '@google-cloud/storage';
   const storage = new Storage();
   const bucket = storage.bucket('eco-pulse-uploads');
   // Upload image → get signed URL → pass to Gemini
   ```

3. **Google Cloud Text-to-Speech** — Replace mock voice alert with real TTS:
   ```javascript
   import { TextToSpeechClient } from '@google-cloud/text-to-speech';
   const ttsClient = new TextToSpeechClient();
   // Generate actual audio file from alert message
   // Store in GCS, return audio URL
   ```

4. **Cloud Firestore** — Store analysis history:
   ```javascript
   import { Firestore } from '@google-cloud/firestore';
   const db = new Firestore();
   // Save each analysis result
   // Enable farmers to view past analyses
   // Track action history
   ```

5. **Cloud Logging** — Structured logging:
   ```javascript
   import { Logging } from '@google-cloud/logging';
   const logging = new Logging();
   // Replace console.log with structured Cloud Logging
   ```

6. **Secret Manager** — Load API keys securely:
   ```javascript
   import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
   // Load GEMINI_API_KEY from Secret Manager instead of env vars
   ```

7. **Use Application Default Credentials** in production:
   ```javascript
   // Don't use API key on Cloud Run
   // Use ADC: const ai = new GoogleGenAI({ vertexai: true, project: 'your-project' });
   ```

8. **Mention Google Services explicitly in README/docs**:
   - List every Google Cloud service used
   - Explain WHY each was chosen
   - Show the architecture diagram with GCP services labeled

### Minimum Google Services to Use
- ✅ Gemini API (Multimodal + Function Calling) — already done
- ✅ Cloud Run — deployment target
- 🆕 Cloud Storage — image storage
- 🆕 Cloud Text-to-Speech — real voice alerts
- 🆕 Cloud Firestore — analysis history
- 🆕 Cloud Logging — structured logging
- 🆕 Secret Manager — secure key management

---

## 🔴 PRIORITY 2: Testing (68.75% → Target 95%+)

The evaluator said: *"Testing strategy demonstrates good breadth, including workflows and automated validations."* But the score suggests insufficient coverage.

### What Was Missing
- Only 22 unit tests, limited to validators and mock tools
- No integration tests
- No API endpoint tests
- No end-to-end workflow tests
- No CI/CD pipeline test automation
- No test coverage reporting

### Mandatory Actions for Next Round

1. **Add Integration Tests** — Test actual HTTP endpoints:
   ```javascript
   // tests/integration/api.test.js
   import request from 'supertest';
   import app from '../../server/index.js';

   describe('POST /api/analyze', () => {
     it('returns 400 for missing inputs', async () => {
       const res = await request(app).post('/api/analyze');
       expect(res.status).toBe(400);
     });

     it('processes text-only input', async () => {
       const res = await request(app)
         .post('/api/analyze')
         .field('cropInfo', 'Rice, 3 acres')
         .field('sensorData', 'moisture: 45%');
       expect(res.status).toBe(200);
       expect(res.body.success).toBe(true);
     });

     it('processes image upload', async () => {
       const res = await request(app)
         .post('/api/analyze')
         .attach('fieldImages', 'examples/field_photo_rice.jpg');
       expect(res.status).toBe(200);
     });
   });
   ```

2. **Add API Route Tests** for every endpoint:
   - `GET /api/health` — returns healthy
   - `GET /api/weather?lat=X&lon=Y` — returns forecast
   - `POST /api/analyze` — happy path + error paths
   - Rate limiting tests
   - File upload validation (wrong MIME type, too large, too many)

3. **Add Service Layer Tests**:
   - Weather service fallback behavior
   - Image compression output dimensions
   - Gemini prompt construction

4. **Add Coverage Reporting**:
   ```json
   // vitest.config.js
   {
     "test": {
       "coverage": {
         "provider": "v8",
         "reporter": ["text", "html", "lcov"],
         "thresholds": {
           "lines": 80,
           "functions": 80,
           "branches": 70,
           "statements": 80
         }
       }
     }
   }
   ```

5. **Add GitHub Actions CI**:
   ```yaml
   # .github/workflows/test.yml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22 }
         - run: npm ci
         - run: npm test -- --coverage
   ```

6. **Target 40+ tests** with these approximate counts:
   - Unit tests: 20 (validators, tools, weather, config)
   - Integration tests: 15 (API endpoints, error paths, middleware)
   - Service tests: 10 (Gemini prompt building, image processing, weather fallback)

---

## 🟡 PRIORITY 3: Code Quality (86.25% → Target 95%+)

### What to Improve

1. **Add ESLint with strict config**:
   ```bash
   npm install -D eslint @eslint/js
   ```
   ```json
   // package.json scripts
   "lint": "eslint .",
   "lint:fix": "eslint . --fix"
   ```

2. **Add JSDoc comments** to every exported function (already mostly done, but ensure 100%)

3. **Add a `vitest.config.js`** file (explicit test configuration)

4. **Error handling** — use custom error classes:
   ```javascript
   class AppError extends Error {
     constructor(message, statusCode, code) {
       super(message);
       this.statusCode = statusCode;
       this.code = code;
     }
   }
   ```

5. **Add `prettier` for formatting**:
   ```json
   "format": "prettier --write ."
   ```

6. **Structure README** with badges:
   ```markdown
   ![Tests](https://github.com/USER/REPO/actions/workflows/test.yml/badge.svg)
   ![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
   ![License](https://img.shields.io/badge/license-MIT-blue)
   ```

---

## 🟢 Maintain: Security (97.5%)

Current approach is excellent. For the next round, additionally:
- Use `@google-cloud/secret-manager` for API keys
- Add Content-Security-Policy nonce for inline scripts
- Add request ID tracking for audit trails

## 🟢 Maintain: Efficiency (100%)

Current approach is perfect. Continue:
- Image compression before API calls
- Minimal dependencies
- `.gitignore` / `.dockerignore` discipline
- Repo < 10MB

## 🟢 Maintain: Accessibility (97.5%)

Current approach is excellent. For the next round, additionally:
- Run axe-core audit in tests
- Add `lang` attribute on dynamic content
- Add `aria-busy` during loading states

## 🟢 Maintain: Problem Statement Alignment (97%)

Current approach is excellent. Continue:
- Messy real-world inputs → structured actions pipeline
- Direct societal benefit (farmer safety)
- Function calling for automated actions

---

## Quick Checklist for Next Round

```markdown
### Before Submission Checklist

#### Google Services (TARGET: 90%+)
- [ ] Gemini API with Function Calling
- [ ] Cloud Run deployment
- [ ] Cloud Storage for uploaded images
- [ ] Cloud Text-to-Speech for voice alerts
- [ ] Cloud Firestore for analysis history
- [ ] Cloud Logging for structured logs
- [ ] Secret Manager for API keys
- [ ] Application Default Credentials (no hardcoded keys)
- [ ] Explicitly listed all Google services in README

#### Testing (TARGET: 95%+)
- [ ] 40+ tests total
- [ ] Unit tests for all utils/services
- [ ] Integration tests for all API endpoints
- [ ] Error path coverage (400, 413, 429, 500)
- [ ] Coverage report (80%+ lines)
- [ ] GitHub Actions CI pipeline
- [ ] vitest.config.js with coverage thresholds

#### Code Quality (TARGET: 95%+)
- [ ] ESLint configured and passing
- [ ] Prettier configured
- [ ] JSDoc on all exports
- [ ] Custom error classes
- [ ] CI badges in README

#### Security (MAINTAIN: 97%+)
- [ ] Helmet + CORS + rate limiting
- [ ] Input validation/sanitization
- [ ] Secret Manager for keys
- [ ] No hardcoded credentials
- [ ] File type + size validation

#### Accessibility (MAINTAIN: 97%+)
- [ ] WCAG 2.1 AA compliant
- [ ] Skip links + ARIA regions
- [ ] Keyboard navigation
- [ ] prefers-reduced-motion
- [ ] Voice output for low-literacy

#### Efficiency (MAINTAIN: 100%)
- [ ] Image compression before API
- [ ] Minimal dependencies
- [ ] Repo < 10MB
- [ ] Budget < $1 GCP
- [ ] Dockerfile optimized

#### Problem Alignment (MAINTAIN: 97%+)
- [ ] Messy input → structured output pipeline clear
- [ ] Real societal benefit demonstrated
- [ ] Function calling for automated actions
- [ ] Sample data with compelling story
```
