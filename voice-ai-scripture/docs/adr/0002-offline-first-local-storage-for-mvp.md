# 0002: Offline-First Local Storage Over Cloud Database for MVP

We decided to persist all verses, recitation states, and quotas directly in device storage (`AsyncStorage`) rather than requiring user authentication and a cloud database (such as Supabase or Firebase) for the initial MVP.

This eliminates mandatory login friction, minimizes initial infrastructure costs to \$0, guarantees instantaneous zero-latency offline loading, and respects user privacy by avoiding central database storage of personal prayer/study habits. Cloud authentication and sync will be introduced in a future version once multi-device sync is requested.
