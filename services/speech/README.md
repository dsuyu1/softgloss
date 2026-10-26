# Speech gateway — private pilot

Ready to configure, not a hosted service. Requires Node 22+ and your Azure Speech resource with Korean TTS/pronunciation assessment available in its region. No Azure resource is created by this repository. Azure credentials must never be put into extension files or committed.

Set server environment variables through your shell or hosting secret manager:

- `AZURE_SPEECH_KEY`: Azure Speech resource key.
- `AZURE_SPEECH_REGION`: region identifier, such as `eastus`.
- `SPEECH_PILOT_TOKEN`: random private token of at least 32 characters (generate with a password manager).
- `SPEECH_ALLOWED_ORIGIN`: exact `chrome-extension://EXTENSION_ID`, found at chrome://extensions.
- `SPEECH_MAX_DAILY_REQUESTS`: optional ceiling, default 100 combined synthesis/assessment attempts per running process per UTC day. Failed provider calls also consume an attempt.
- `PORT`: optional, default 8788.

Run `node services/speech/server.mjs`. It listens only at `127.0.0.1`. In extension **Settings → Speech service**, enter `http://127.0.0.1:8788` and the pilot token, then Connect. Chrome requests access to that origin. Configuration lasts for the browser session and is excluded from exports. To host elsewhere, place the loopback server behind an authenticated HTTPS gateway; the extension accepts HTTPS origins. Keep the Azure key on the server. Do not expose this as a public multi-user service: it has no accounts, durable quota ledger, billing, cross-instance rate limits or credential rotation UI. A restart resets the pilot ceiling. Configure provider-side monitoring and limit access to pilot testers.

`POST /synthesize` accepts `{text}` (at most 500 characters), returns Korean `ko-KR-SunHiNeural` MP3. `POST /assess` accepts `{text,audio}` with base64 16 kHz mono PCM WAV (0.1–60 seconds). The browser converts its local recording before opt-in upload. Both require the exact Origin and Bearer token. Responses are no-store. No recording or reference text is written to disk or logs. User cancellation cannot recall a provider request already sent.

Assessments request HundredMark/Word feedback. Returned pronunciation, accuracy, fluency and completeness must all be numeric 0–100; missing/no-match/error results produce an error, never a manufactured grade. Korean prosody scoring is not claimed. Word error labels are available in the API response; the initial UI shows aggregate scores. Learner-facing feedback needs native-speaker/quality evaluation before paid launch.

Official references:
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-speech-to-text-short
- https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech

Automated tests use a local mock provider and browser fixtures. They verify routing/auth/audio format/SSML/score handling and opt-in submission, not live Azure availability or pronunciation accuracy. Credentials and deployment are still needed for a live pilot.
