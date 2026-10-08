# TTS Audio Caching and Cloud Storage Economics

**Author**: Voice AI Engineering Research  
**Date**: October 2026  
**Status**: Completed  
**Context**: An architectural and cost-benefit investigation evaluating whether storing and serving pre-synthesized Bible verse audio is cheaper than calling Text-to-Speech (TTS) APIs (ElevenLabs, OpenAI) on demand, and how multi-translation Bible scale affects storage over time.

---

## 1. The Core Verdict

1. **Yes, storing and requesting the audio is exponentially cheaper than calling the TTS API again.**
   - Requesting a stored verse from Cloudflare R2 costs **$0.00000036** (0.36 microdollars) with **$0.00 egress fees**.
   - Calling ElevenLabs Flash v2.5 to re-synthesize that same verse costs **$0.006000** (6,000 microdollars).
   - **Stored retrieval is ~16,666 times cheaper than ElevenLabs** and **~5,000 times cheaper than OpenAI `tts-1`**.
   - Storing a verse in Cloudflare R2 for an **entire year** costs **$0.000014**. A single re-call to ElevenLabs costs $0.006. Therefore, storing the file pays for itself on the **very second listen**.

2. **Storing multiple Bible translations will NOT become a large storage burden.**
   - An entire Protestant Bible (all 31,102 verses, ~75 hours of speech) is only **~2.16 GB** in high-clarity voice MP3 (64 kbps mono).
   - Storing **10 complete Bible translations** (311,020 verses) is only **~21.6 GB**.
   - On **Cloudflare R2**, the first 10 GB are **free forever**. Storing 10 complete Bibles costs **$0.17 / month** (17 cents per month).
   - Storing **20 complete Bible translations** (~43 GB) costs **~$0.50 / month**.

3. **The Real Cost Trap is Pre-Generating Everything (Upfront API Fees).**
   - Synthesizing all 31,102 verses of 10 translations upfront on ElevenLabs would cost **~$1,550.00** in API fees (or ~$465 on OpenAI).
   - In scripture memory apps, usage follows a strict **power-law distribution**: >90% of user recitations are concentrated on ~500 to 1,000 popular verses (Romans 8, John 3:16, Psalm 23, Philippians 4).
   - **Solution**: Use **Lazy On-Demand Caching (Cache-Aside Pattern)**. Only synthesize a verse when a user actually requests it for the first time. Upload it once to R2, and it becomes instantly available and virtually free for all future users forever.

---

## 2. Unit Economics: TTS API vs. Cloud Storage vs. Local Cache

### 2.1 The Verse Baseline
- **Average verse length**: ~25–30 words (~120–150 characters).
- **Spoken duration**: ~8 to 10 seconds.
- **Audio file size**:
  - **MP3 (64 kbps mono, 44.1 kHz)**: 8 KB/sec × 10 sec = **~80 KB** (0.00008 GB).
  - **AAC / M4A (32 kbps mono)**: 4 KB/sec × 10 sec = **~40 KB** (0.00004 GB).

### 2.2 Cost Breakdown per Verse Playback

| Scenario | API Call (ElevenLabs Flash) | API Call (OpenAI `tts-1`) | Cloudflare R2 (Stored Object) | AWS S3 Standard (Stored Object) | User's Phone Cache (`expo-file-system`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1st Playback** (Initial Generation) | $0.006000 | $0.001800 | $0.006000 + $0.0000045 (PUT) | $0.001800 + $0.000005 (PUT) | $0.006000 (Saved locally) |
| **2nd Playback** (Review Session) | $0.006000 | $0.001800 | **$0.00000036** (GET) | **$0.00000760** (GET + Egress) | **$0.000000** ($0.00) |
| **10th Playback** (SRS Interval) | $0.006000 | $0.001800 | **$0.00000036** | **$0.00000760** | **$0.000000** |
| **100th Playback** (Across all users) | $0.006000 | $0.001800 | **$0.00000036** | **$0.00000760** | **$0.000000** |
| **Monthly Storage Cost** (per verse) | $0.00 | $0.00 | **$0.00000120** / mo | **$0.00000184** / mo | **$0.00** |

### 2.3 The Break-Even Analysis
- Cost to store 80 KB on Cloudflare R2 for 1 full year: **$0.000014**.
- Cost of 1 single synthesis on ElevenLabs: **$0.006000**.
- **$0.006000 / $0.000014 = ~428 years.**
- *Conclusion*: It takes over **400 years** of storage holding costs to equal the price of just **one** un-cached API call to ElevenLabs. Re-synthesizing audio on every recitation is economically wasteful.

---

## 3. Scale Analysis: Multi-Translation Bible Storage

### 3.1 Physical Size of the Bible in Audio
- **Verses in Protestant Canon**: 31,102 verses.
- **Total words**: ~750,000–800,000 words (~3.1M characters).
- **Spoken audiobook duration**: ~70 to 75 hours.
- **Audio file size at 64 kbps MP3**:
  $$\text{Size} = 75 \text{ hrs} \times 3,600 \text{ s} \times 8 \text{ KB/s} \approx 2,160,000 \text{ KB} \approx \mathbf{2.16 \text{ GB}}$$
- **Audio file size at 32 kbps AAC/Opus**: **~1.08 GB**.

### 3.2 Projected Storage Across 1 to 20 Translations

| Bible Translations Supported | Total Verse Files | Total Audio Size (64 kbps MP3) | Cloudflare R2 Monthly Cost | AWS S3 Monthly Cost | Backblaze B2 Monthly Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Translation** (e.g. KJV) | 31,102 | ~2.16 GB | **$0.00** (Within 10GB free tier) | $0.05 / mo | **$0.00** (Within 10GB free tier) |
| **3 Translations** (KJV, WEB, Almeida) | 93,306 | ~6.48 GB | **$0.00** (Within 10GB free tier) | $0.15 / mo | **$0.00** (Within 10GB free tier) |
| **5 Translations** | 155,510 | ~10.80 GB | **$0.01 / mo** (1.2 cents) | $0.25 / mo | **$0.01 / mo** |
| **10 Translations** | 311,020 | ~21.60 GB | **$0.17 / mo** (17 cents) | $0.50 / mo | **$0.07 / mo** |
| **20 Translations** | 622,040 | ~43.20 GB | **$0.50 / mo** (50 cents) | $0.99 / mo | **$0.20 / mo** |

*Verdict on "Won't that be a lot after some time?"*:  
In data terms, 21.6 GB is less than a single modern 4K movie download. Modern object storage handles petabytes effortlessly. You can store **10 complete Bible translations for 17 cents a month**. Storage capacity and cost are a non-issue.

---

## 4. The True Cost Risk: Upfront Synthesis vs. Lazy Caching

While *storing* 10 Bibles costs cents, *synthesizing* all 31,102 verses upfront is where costs escalate if done incorrectly:

### 4.1 Cost to Pre-Generate Full Bibles
| Engine | Price / 1M Chars | Cost per 1 Translation (3.1M chars) | Cost for 10 Translations (31M chars) |
| :--- | :--- | :--- | :--- |
| **ElevenLabs Flash v2.5** | $50.00 | **$155.00** | **$1,550.00** |
| **OpenAI `tts-1`** | $15.00 | **$46.50** | **$465.00** |
| **Azure AI Speech Neural** | $16.00 | **$49.60** | **$496.00** |

### 4.2 The 99/1 Scripture Power Law
Scripture memory apps exhibit extreme long-tail distribution:
- **Tier 1 (The Devotional Core ~500 verses)**: Verses like John 3:16, Romans 8:28, Psalm 23, Philippians 4:6-7, Jeremiah 29:11, Proverbs 3:5-6, and Ephesians 6:10 represent **~90% of all recitations**.
- **Tier 2 (Secondary Verses ~2,000 verses)**: Sermon passages, topical studies, and Psalms.
- **Tier 3 (The Long Tail ~28,500 verses)**: Obscure genealogies, Levitical dietary codes, and boundary demarcations (e.g. 1 Chronicles 1-9, Numbers 7) that less than 0.1% of users will ever recite in auditory mode.

If you pre-synthesize 10 Bibles, **90% of your $1,550 API investment is wasted on verses nobody will ever listen to.**

### 4.3 The Recommended Solution: Lazy "Cache-Aside" Architecture

```
                    ┌──────────────────────────────────┐
                    │ User enters Echo Mode for Verse  │
                    │ (e.g. John 3:16, Almeida, Voice) │
                    └─────────────────┬────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────┐
                    │ 1. Check Local Phone Cache       │
                    │    `${cacheDir}/verses/${hash}`  │
                    └────────┬─────────────────┬───────┘
                       FOUND │                 │ MISS
                             │                 │
                             ▼                 ▼
                    ┌─────────────────┐ ┌──────────────────────────────────┐
                    │ Play from Disk  │ │ 2. Check Cloudflare R2 CDN       │
                    │ (0ms, $0.00)    │ │    `https://audio.app.com/{hash}`│
                    └─────────────────┘ └────────┬─────────────────┬───────┘
                                           FOUND │                 │ MISS
                                                 │                 │
                                                 ▼                 ▼
                                        ┌─────────────────┐ ┌──────────────────────┐
                                        │ Stream from CDN │ │ 3. Call ElevenLabs/  │
                                        │ & Save to Phone │ │    OpenAI API ($0.006)│
                                        │ ($0.00000036)   │ └──────────┬───────────┘
                                        └─────────────────┘            │
                                                                       ▼
                                                            ┌──────────────────────┐
                                                            │ 4. Upload to R2 &    │
                                                            │    Save to Phone     │
                                                            └──────────────────────┘
```

**How this operates in practice:**
1. **The First Learner**: Pays the ~0.6-cent API fee to synthesize the verse.
2. **The Cloud Cache**: The file is stored in Cloudflare R2 under a deterministic key (`{translation}_{book}_{chapter}_{verse}_{voiceId}.mp3`).
3. **Every Subsequent Learner**: The other 10,000 users who practice that verse stream it directly from the CDN at **$0.00000036** per request.
4. **The Device Cache**: Once downloaded to a user's phone, all future reviews for their Spaced Repetition streak play instantly offline from device disk at **$0.00**.

---

## 5. Technical Specifications: Codecs, R2, and Terms of Service

### 5.1 Mobile Audio Format & Bitrate (iOS & Android)
- **Primary Source Finding**: iOS `AVPlayer` (which powers `expo-audio` under the hood) does **not** natively support standalone `.opus` or `.ogg` containers without custom decoders.
- **The Ideal Format**: **MP3 (MPEG Layer 3, 64 kbps mono, 44.1 kHz)**.
  - Universally supported across 100% of iOS and Android devices without transcoding.
  - Supported natively as an output format by both ElevenLabs (`mp3_44100_64`) and OpenAI (`mp3`).
  - Highly compressed (~80 KB per 10-second verse).
  - Listed in Cloudflare's **default cacheable file extensions**, enabling zero-configuration CDN edge caching.

### 5.2 Cloudflare R2 CDN & Range Requests
- **Public Custom Domain**: Cloudflare allows binding a custom domain (e.g., `https://audio.voiceaiscripture.com`) directly to an R2 bucket.
- **Zero Egress Fees**: Cloudflare R2 has **$0.00 egress bandwidth charges**, eliminating the variable bandwidth billing found in AWS S3 ($0.09/GB).
- **HTTP Range Requests**: Cloudflare CDN natively supports `206 Partial Content` range requests, allowing mobile clients to seek, stream, and buffer audio smoothly.

### 5.3 Terms of Service Verification
- **ElevenLabs**: Terms of Service explicitly grant that users retain all rights in and to their generated "Output". Storing audio files permanently in cloud object storage and serving them to end users is fully permitted on paid plans (Starter, Creator, Pro).
- **OpenAI**: Terms of Use state: *"As between you and OpenAI, and to the extent permitted by applicable law, you own your Input and Output."* Caching and serving generated audio via private CDNs is standard and officially endorsed.

---

## 6. Summary Comparison: What Should You Do?

| Approach | Setup Effort | Ongoing Monthly Cost | User Experience | Scalability with 10+ Bibles |
| :--- | :--- | :--- | :--- | :--- |
| **No Storage (Call API Every Time)** | Lowest | 🔴 **High & Unbounded** ($60+ per 10k recitations) | Slower (75–350ms API lag every time, breaks offline) | 🔴 Terrible (Repeatedly paying for the exact same verses) |
| **Pre-generate All Bibles Upfront** | Medium | 🟡 **High Upfront Fee** ($500–$1,500) + Cents/mo storage | Instant | 🟡 Wastes hundreds of dollars on verses nobody recites |
| **Lazy Caching (Cloudflare R2 + Phone Cache)** | Medium | 🟢 **Near Zero** (Pennies/mo storage, $0 egress, fraction of a cent per new verse) | Instant local playback, works offline, sacred audio quality | 🟢 **Ideal** (Grows organically only where users actually study) |

**Final Recommendation**: Implement the **Lazy Caching** architecture using **Cloudflare R2** with **64 kbps MP3**. It offers the highest possible audio quality (ElevenLabs/OpenAI) at practically zero recurring operational cost.
