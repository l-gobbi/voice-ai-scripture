# 0019: A Small Stateless Edge Function

## Status
Accepted. Supersedes in part ADR 0002 (offline-first local storage with no backend).

## Context
ADR 0002 kept the app free of any server. Three needs now break that:
- The cloud speech-to-text keys ship inside the app bundle as `EXPO_PUBLIC_*` values, where anyone can extract them. This is a release blocker; see `docs/research/feature-and-improvement-opportunities.md` §3.4 and S1.
- Abuse-prevention limits enforced only on the device can be bypassed.
- Links that open the app (Universal Links / App Links) need a web origin that serves verification files.

## Decision
We will run one small, **stateless** edge function (for example on EAS Hosting, Cloudflare Workers or Vercel). It does three things:
1. Holds the cloud speech-to-text keys and forwards transcription requests.
2. Enforces the per-install rate limits on the server.
3. Serves the Universal Links / App Links verification files once a domain exists.

It keeps no database. It never stores audio, transcripts, verses or Decks, and it logs no content. Everything a learner memorizes stays on the device (ADR 0002 still holds for learner data).

## Consequences
- The app needs a deployed endpoint and a way to rotate keys. The keys currently in the bundle must be rotated once the proxy ships.
- Group features that need shared state (leader dashboards, group totals) are *not* covered by this decision. They would need their own ADR, because they add stored data.
- The provider choice, the domain and the app's public name are still open (owner decision pending).
