/**
 * Optional Claude layer (translation + "Ask the Archive").
 *
 * The server must run with ZERO extra dependencies, so `@anthropic-ai/sdk` is loaded
 * lazily: if the package is not installed, credentials are missing, or AI_DISABLED=1,
 * every caller falls back to the offline path and the demo keeps working.
 *
 * Enable it (one coordinated Member-1 commit — see CLAUDE.md §2 rule 3):
 *   npm --prefix server install @anthropic-ai/sdk
 *   ANTHROPIC_API_KEY=sk-ant-…  (or an `ant auth login` profile)
 *
 * Env:
 *   CLAUDE_MODEL   default 'claude-opus-5-5'
 *   AI_DISABLED    '1' / 'true' forces offline mode (e.g. flaky venue Wi-Fi)
 */
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
// Server-side refusal fallback: if the model declines, the API retries on a suitable model in the same call.
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

let ai = { mode: 'offline', reason: 'not initialised', Anthropic: null, client: null };

const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v ?? ''));

export async function initAi({ log = console } = {}) {
  if (truthy(process.env.AI_DISABLED)) {
    ai = { mode: 'offline', reason: 'AI_DISABLED is set', Anthropic: null, client: null };
  } else {
    let Anthropic = null;
    try {
      ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
    } catch {
      ai = { mode: 'offline', reason: '@anthropic-ai/sdk not installed', Anthropic: null, client: null };
    }
    if (Anthropic) {
      try {
        // Credentials resolve from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / `ant auth login` profile.
        const client = new Anthropic({ maxRetries: 1 });
        ai = { mode: 'claude', reason: null, Anthropic, client };
      } catch (err) {
        ai = { mode: 'offline', reason: `no Anthropic credentials (${err.message})`, Anthropic: null, client: null };
      }
    }
  }
  if (ai.mode === 'claude') log.log(`  ✦ AI: Claude (${MODEL}) — translation + Ask the Archive enabled`);
  else log.log(`  ✦ AI: offline (${ai.reason}) — original-language fallback + local archive search`);
  return aiStatus();
}

export const aiAvailable = () => ai.mode === 'claude';
export const aiStatus = () => ({ provider: ai.mode, model: ai.mode === 'claude' ? MODEL : null, reason: ai.reason });

/** Bad credentials will not fix themselves mid-demo: switch to offline instead of failing every request slowly. */
function disableOnAuthError(err) {
  const A = ai.Anthropic;
  if (A && (err instanceof A.AuthenticationError || err instanceof A.PermissionDeniedError)) {
    ai = { ...ai, mode: 'offline', reason: `credentials rejected (${err.status})`, client: null };
    console.warn(`[ai] ${ai.reason} → offline mode for the rest of this run`);
  }
}

/**
 * One structured-output call. Resolves to the parsed JSON object (validated against
 * `schema` by the API), or throws — callers always have an offline fallback.
 */
export async function claudeJson({ system, user, schema, effort = 'low', maxTokens = 4000, timeoutMs = 30_000 }) {
  if (ai.mode !== 'claude') throw new Error('AI offline');
  let response;
  try {
    response = await ai.client.beta.messages.create(
      {
        model: MODEL,
        max_tokens: maxTokens,
        betas: [FALLBACK_BETA],
        fallbacks: 'default',
        output_config: { effort, format: { type: 'json_schema', schema } },
        system,
        messages: [{ role: 'user', content: user }],
      },
      { timeout: timeoutMs },
    );
  } catch (err) {
    disableOnAuthError(err);
    throw err;
  }
  if (response.stop_reason === 'refusal') {
    throw new Error(`declined (${response.stop_details?.category ?? 'no category'})`);
  }
  if (response.stop_reason === 'max_tokens') throw new Error('response truncated (max_tokens)');
  const block = response.content.find((b) => b.type === 'text');
  if (!block) throw new Error('no text block in response');
  return JSON.parse(block.text);
}
