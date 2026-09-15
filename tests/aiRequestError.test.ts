import assert from 'node:assert/strict';
import test from 'node:test';
import { AiProviderError, explainAiRequestError, type AiRequestErrorKind } from '../src/lib/aiRequestError.ts';

// Representative documented error envelopes from OpenAI, Anthropic and Gemini.
const cases: Array<[string, unknown, AiRequestErrorKind]> = [
  ['OpenAI revoked key', new AiProviderError(401, { error: { code: 'invalid_api_key', message: 'Incorrect API key provided: test-private-value' } }), 'key'],
  ['Gemini nested JSON key error', new Error(JSON.stringify({ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } })), 'key'],
  ['Anthropic billing', new AiProviderError(402, { error: { type: 'billing_error', message: 'Payment required' } }), 'billing'],
  ['Anthropic credit balance', new AiProviderError(400, { error: { message: 'Your credit balance is too low to access the API.' } }), 'billing'],
  ['OpenAI quota is not a temporary rate limit', new AiProviderError(429, { error: { type: 'insufficient_quota' } }), 'quota'],
  ['Gemini daily quota', new Error(JSON.stringify({ error: { code: 429, message: 'Quota exceeded: GenerateRequestsPerDayPerProjectPerModel' } })), 'quota'],
  ['OpenAI inaccessible model', new AiProviderError(404, { error: { code: 'model_not_found' } }), 'model'],
  ['Gemini unsupported model', new Error(JSON.stringify({ error: { code: 400, message: 'Model is not supported for generateContent.' } })), 'model'],
  ['permission is not an invalid key', new AiProviderError(403, { error: { type: 'permission_error' } }), 'permission'],
  ['rate limited', new AiProviderError(429, { error: { type: 'rate_limit_error' } }), 'rate_limit'],
  ['Gemini resource exhaustion without billing evidence', new Error(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } })), 'rate_limit'],
  ['browser offline', new TypeError('Failed to fetch'), 'network'],
  ['wrapped browser network error', new Error('Google AI could not be reached from this browser.'), 'network'],
  ['timeout', new AiProviderError(504, null), 'timeout'],
  ['busy provider', new AiProviderError(529, null), 'unavailable'],
  ['temporary model outage does not suggest changing its name', new AiProviderError(503, { error: { message: 'Model temporarily unavailable' } }), 'unavailable'],
  ['invalid request', new AiProviderError(400, { error: { type: 'invalid_request_error' } }), 'request'],
  ['unrecognized error', new Error('Unexpected response at https://example.test?key=test-private-value'), 'unknown'],
];

for (const [name, error, kind] of cases) {
  test(name, () => {
    const result = explainAiRequestError(error);
    assert.equal(result.kind, kind);
    assert.doesNotMatch(result.message, /test-private-value|https?:|\{|\}|"error"/);
    assert.match(result.message, /retry|try|check/i);
  });
}

test('unknown and cyclic errors are safe; local failures have local guidance', () => {
  const cyclic: Record<string, unknown> = {};
  cyclic.cause = cyclic;
  assert.equal(explainAiRequestError(cyclic).kind, 'unknown');
  assert.equal(explainAiRequestError(null).kind, 'unknown');
  assert.match(explainAiRequestError(new Error('Worker failed'), true).message, /local model/);
});
