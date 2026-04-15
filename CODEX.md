### Voice / Telephony

- The ONLY voice initialiser is `bootstrapVoice` from `@/telephony/bootstrapVoice`.
- The ONLY token fetch is `getVoiceToken` from `@/telephony/getVoiceToken`.
- The ONLY token endpoint is `/api/telephony/token`.
- Do NOT create new files under `src/services/` that initialise a Twilio Device.
- Do NOT hardcode `server.boreal.financial` or any base URL in service files.
- Do NOT use raw `fetch()` for API calls — use `api` from `@/api`.
- `src/services/twilio.ts` is DELETED. Do not recreate it.
- `src/services/voiceClient.ts` is DELETED. Do not recreate it.
