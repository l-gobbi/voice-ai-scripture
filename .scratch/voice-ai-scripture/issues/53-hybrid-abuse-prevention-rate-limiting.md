# 53: Hybrid Abuse-Prevention Rate Limiter & Paywall Decoupling

**What to build:** Free the recitation flow from commercial paywalls and trial quota barriers. Reconfigure `SubscriptionService` into an invisible hybrid abuse-prevention rate limiter that enforces a 10 recitations/minute burst throttle and a 500 recitations/day ceiling with seamless fallback to zero-cost on-device native speech recognition.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Remove 3-recitation trial quota gate from recitation flow across all levels
- [x] Enforce a 10 recitations / rolling 60-second burst limit to protect against automated loops and rapid button-mashing
- [x] Return a `rate_limited` status when the burst throttle is hit, with a cooldown timestamp
- [x] Enforce a 500 recitations / calendar day ceiling that seamlessly redirects transcription calls to `NativeStreamVoiceAdapter` (free on-device recognition) rather than blocking the user
- [x] Unit tests verifying sliding window rate limiting, daily counter rollover, and seamless adapter substitution
