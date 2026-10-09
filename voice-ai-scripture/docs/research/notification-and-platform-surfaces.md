# Notification & Platform Surfaces (October 2026 Research Pass)

**Author**: Research Agent
**Date**: 2026-10-08
**Status**: Completed
**Context**: The product owner asked: "Research ways and platforms that I should notify the user, for example CarPlay, Android Auto, Apple Watch, etc." This note covers every way the app can reach a user outside its main screen. That includes local and push notifications, widgets, Live Activities, Apple Watch, Wear OS, CarPlay, Android Auto, voice assistants, WhatsApp, email, calendar and smart speakers. It goes deeper than §4 of `feature-and-improvement-opportunities.md` (items P2, P3, P9–P11), re-checks that section's claims, and corrects them in §7. It does not repeat that note's LGPD, speech-recognition or i18n findings, except where they change a verdict here.

**Evidence conventions** (the same as the prior note)
- **Verified** means read in the primary source on 2026-10-08, with the URL inline.
  - Apple pages render with JavaScript, so they were read through Apple's own DocC JSON. They are cited by their normal page URL.
  - *sub-agent* marks a row collected from the primary page by a delegated research agent.
  - *re-fetched* marks a verdict-driving row that I fetched again myself.
- **Inference** is my reasoning from verified facts. **Speculative** marks thin evidence. **UNVERIFIED** means no primary source was found. **Secondary** marks blogs, press and market-research sites. **Vendor** marks company marketing or company-run studies.
- Code citations are `file:line`, relative to `voice-ai-scripture/`. This folder is not a git repository, so there is no commit hash.
- Policy and pricing pages were accessed on **2026-10-08**. Re-check them before quoting externally.

---

## 1. TL;DR and Recommendation

- **Now: fix the daily local reminder.** It is the one surface that already reaches every opted-in user, and it reaches Apple Watch and Wear OS for free. Today it is silent on Android (raw `importance: 4` is Expo's `LOW`), always claims verses are due, is English-only, cannot deep-link, and says "scheduled" even when permission was denied (§2).
- **Now: make it due-aware and calm.** Use a rolling 14-day schedule that skips empty or finished days and backs off after 7 ignored reminders. Write pt-BR-first copy that names the verse. Use the `active` level, an Android `DEFAULT` channel and inexact alarms. A tap goes straight into the review queue. Ask for permission after the first successful recitation, behind a short explanation and a when-and-where plan (§5).
- **Next:** an iOS widget with `expo-widgets` (stable on SDK 57); an Android widget with `react-native-android-widget`; Siri App Shortcuts that also work on the Action Button ("Revisar meus versículos no ‹App›", plus a spoken due count), written in Swift on SDK 57 because `expo-app-intents` needs SDK 58; launcher shortcuts; and an optional "add to calendar".
- **Later, only once a hands-free, screen-off session exists:**
  - a Live Activity, which appears on the Watch Smart Stack and the CarPlay Dashboard automatically;
  - a CarPlay **voice-based conversational** entitlement (iOS 26.4). It is the only non-navigation category allowed to record, and only inside the voice control template. Approval is discretionary;
  - an Apple Watch app. watchOS has no Speech framework, so reciting would use dictation.
- **Never / not now:** Android Auto (no category fits recite-and-grade, and a failed car review blocks phone updates); WhatsApp Business API reminders (Meta bills a daily verse as *marketing*, about R$0.32 per message in Brazil, and it needs a backend and raises LGPD sensitive-data issues); email digests; Alexa/Nest; Google App Actions; a Wear OS app; Focus filters.

---

## 2. The Current State in the App

**What exists.** There is one daily local notification, the Quiet-Time Reminder.
- `src/services/ReminderService.ts` schedules it with `expo-notifications` `~57.0.19` (`package.json`).
- `src/components/ReminderSettingsModal.tsx` provides an on/off switch and four preset times.
- It opens from a "⏰ Reminders" header button (`src/screens/HomeScreen.tsx:228-243`); the modal is mounted at `HomeScreen.tsx:634-637`.

Nothing else reaches the user outside the app: no widget, no app extension, no deep-link handling, no push token.

| ID | Finding | Where | Evidence |
|---|---|---|---|
| N1 | **The Android reminder is silent.** The channel is created with a raw `importance: 4`. In Expo's `AndroidImportance` enum, `4` is **`LOW`**. Android's own constants use `4` for `IMPORTANCE_HIGH`, so the number looks like HIGH but is not. Expo maps its `LOW` to `NotificationManagerCompat.IMPORTANCE_LOW`, which Android documents as "Makes no sound". The `sound: 'default'` on line 78 therefore has no effect. A channel's importance "can't [be] change[d]" after creation, so a fix needs a **new channel id**. | `ReminderService.ts:75-79` | Expo enum `UNKNOWN=0 … LOW=4, DEFAULT=5, HIGH=6, MAX=7` ([sdk-57 source](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/src/NotificationChannelManager.types.ts)); `LOW(NotificationManagerCompat.IMPORTANCE_LOW, 4)` ([NotificationImportance.java](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/android/src/main/java/expo/modules/notifications/notifications/enums/NotificationImportance.java)); importance table and "Once you submit the channel … you can't change the importance level" ([Android channels](https://developer.android.com/develop/ui/views/notifications/channels)). All *re-fetched*. |
| N2 | **The app says the reminder is scheduled even when permission is denied.** The permission prompt is in context, which is good: it appears when the user saves an enabled reminder. But `scheduleDailyNotification` returns `false` on denial, and the modal ignores `result.success`. It shows "Quiet-Time reminder scheduled for …" anyway. The setting is also persisted as enabled *before* scheduling. There is no `getPermissionsAsync` pre-check, no explanation screen and no "open Settings" path. | `ReminderService.ts:48, 83-88`; `ReminderSettingsModal.tsx:44-58` | Code read |
| N3 | **`cancelAllScheduledNotificationsAsync` wipes every scheduled notification.** It runs on each save and on disable, so any future snooze, one-off or per-day notification would be deleted. Use identifiers with `cancelScheduledNotificationAsync(id)`. | `ReminderService.ts:90-92, 121-124` | Code read |
| N4 | **The content is static, English-only, and always claims verses are due.** It has an emoji title and no verse reference. The modal promises "a peaceful prompt when you have verses due", which the code does not honour. The prior note already flagged the i18n half of this as E4. | `ReminderService.ts:96-100`; `ReminderSettingsModal.tsx:73-75` | Code read; prior note E4 |
| N5 | **Tapping the notification only opens the app.** There is no `setNotificationHandler`, no `addNotificationResponseReceivedListener`, no `getLastNotificationResponse`, no `Linking` handler, and no `scheme` in `app.json`. The `voice-scripture://` scheme is parsed in `deckSharing.ts:115` but never registered. `App.tsx:5-10` renders only `HomeScreen`, so there is no route a notification could open. | `src/`, `App.tsx`, `app.json` (grep) | Code read; prior note P1 |
| N6 | **No `expo-notifications` config plugin, and no `ios.bundleIdentifier`.** Without the plugin there is no Android small icon or colour and no iOS options; the plugins list is at `app.json:35-44`. Without a bundle identifier, `expo-widgets` prebuild fails: "If `ios.bundleIdentifier` is also unset, prebuild fails because the bundle identifier is required to derive this value" (the App Group id). | `app.json` | [expo-widgets v57](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/) (*re-fetched*) |
| N7 | **The module is deep-imported from `expo-notifications/build/*` to avoid the barrel's side effect.** This relies on internal paths, which may break on an SDK bump. The side effect is a push-token listener in `DevicePushTokenAutoRegistration.fx.ts`. It uploads a token only if auto server registration was explicitly enabled (`if (registration?.isEnabled)`) ([source](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/src/DevicePushTokenAutoRegistration.fx.ts)). *Inference:* the public import is probably safe. Test it on a dev build before switching. | `ReminderService.ts:13-29` | Source read |
| N8 | **No category, actions, `interruptionLevel` or `data`.** The trigger is `type: 'daily'` with `channelId`, which is correct for SDK 57. | `ReminderService.ts:95-107` | Code read |
| N9 | **Android timing is inexact, and that is acceptable.** `expo-notifications` uses `setExactAndAllowWhileIdle` only `if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S \|\| alarmManager.canScheduleExactAlarms())`. Otherwise it falls back to `setAndAllowWhileIdle` ([ExpoSchedulingDelegate.kt](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/ExpoSchedulingDelegate.kt), *re-fetched*). Android says inexact alarms fire "within one hour of the supplied trigger time" on Android 12+ ([alarms](https://developer.android.com/develop/background-work/services/alarms), sub-agent). The library manifest already adds `RECEIVE_BOOT_COMPLETED` and `POST_NOTIFICATIONS`, so reminders survive a reboot ([manifest](https://github.com/expo/expo/blob/sdk-57/packages/expo-notifications/android/src/main/AndroidManifest.xml)). | — | Source read |
| N10 | **The time picker offers four English 12-hour presets and no custom time.** Brazil writes times as "6h30" or "06:30". | `ReminderSettingsModal.tsx:20-25, 61-66` | Code read |

*Inference:* N1–N5 are bugs, not missing features. They should be fixed before any new surface is added, because every surface below relies on a reminder that works and a deep link that lands on the review.

---

## 3. Surfaces

Each subsection gives: what is possible, eligibility and approval, the Expo/RN path, effort (S/M/L), risks, and **fit** for this app (1–5).

### 3.1 Local and push notifications (iOS and Android)

#### iOS (verified, *sub-agent* unless marked)

**Interruption levels** (iOS 15+)
- **Passive:** "adds the notification to the notification list without lighting up the screen or playing a sound" ([passive](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel/passive)).
- **Active**, the default: "presents the notification immediately, lights up the screen, and can play a sound … Active notifications won't break through system notification controls" ([active](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel/active)).
- **Time Sensitive:** "breaks through system notification controls" ([timeSensitive](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel/timesensitive), *re-fetched*). It needs the Time Sensitive Notifications capability. That capability appears in Apple's [capability list](https://developer.apple.com/help/account/reference/supported-capabilities-ios), and `UNAuthorizationOptions.timeSensitive` is deprecated with "Use time-sensitive entitlement".
- **Critical** "requires an approved entitlement".
- The HIG reserves Time Sensitive for "an event that's happening now or will happen within an hour" and says "Build trust by accurately representing the urgency of each notification" ([HIG managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)).
- *Inference:* a self-chosen daily quiet-time reminder is **Active**, not Time Sensitive. Apple does not discuss habit reminders explicitly.

**Scheduled Summary and Focus**
- The HIG table shows Passive and Active do **not** override scheduled delivery or break through Focus. Time Sensitive does both (same HIG page).
- So a user who routes the app into the Scheduled Summary will see the reminder only at summary time. *Inference:* that is the user's choice, and the app should respect it.
- `relevanceScore`, which sorts notifications within the summary, is **not exposed by `expo-notifications` SDK 57** (grep of the sdk-57 source).

**Actions**
- Categories and actions are declared with `UNNotificationCategory` and `UNNotificationAction` ([actionable types](https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types)).
- The system shows "at most two actions" when space is limited ([UNNotificationCategory](https://developer.apple.com/documentation/usernotifications/unnotificationcategory)).
- The HIG's advice on actions:
  - "Avoid providing an action that merely opens your app."
  - "Avoid sending a notification that tells people to perform specific tasks within your app."
  - "Avoid sending multiple notifications for the same thing, even if someone hasn't responded."
  - "Don't use notifications to send marketing or promotional content unless people explicitly agree."

  Source: [HIG notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) and the managing-notifications page.

**Rich notifications**
- Local notifications can carry image or audio attachments without an extension: "For local notifications, add attachments when creating the notification's content."
- The size limits are image 10 MB and audio 5 MB ([UNNotificationAttachment](https://developer.apple.com/documentation/usernotifications/unnotificationattachment)).
- A Notification Service Extension "only operate[s] on remote notifications". A Content Extension can present custom UI for local notifications too ([UNNotificationContentExtension](https://developer.apple.com/documentation/usernotificationsui/unnotificationcontentextension)).

**Provisional authorization** (iOS 12+)
- Provisional notifications are delivered quietly. They "don't interrupt the person with a sound or banner, or appear on the lock screen … they only appear in the notification center's history", with keep/turn-off buttons ([asking permission](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications)).
- On timing, the same page says: "you might make the request after the person schedules a first task. Sending the request in context provides a better experience than automatically requesting authorization on first launch."

**Pending limit**
- The only Apple statement is on the deprecated `UILocalNotification` page: "the system keeps the soonest-firing 64 notifications (with automatically rescheduled notifications counting as a single notification) and discards the rest" ([UILocalNotification](https://developer.apple.com/documentation/uikit/uilocalnotification), *re-fetched*).
- No current UserNotifications page repeats it. *Inference:* plan for at most 64 pending requests. One repeating daily trigger counts as one.

**App Store Review Guidelines** (last updated June 8, 2026; [guidelines](https://developer.apple.com/app-store/review/guidelines/), *re-fetched*)
- **4.5.4:** "Push Notifications must not be required for the app to function, and should not be used to send sensitive personal or confidential information. Push Notifications should not be used for promotions or direct marketing purposes unless customers have explicitly opted in to receive them via consent language displayed in your app's UI, and you provide a method in your app for a user to opt out from receiving such messages."
- **4.5.3** forbids using "Push Notifications, Live Activities, etc." to "send unsolicited messages".
- **2.5.16:** "Widgets, extensions, and notifications should be related to the content and functionality of your app."
- **5.1.2** forbids requiring users to enable push notifications "in order to access functionality".
- *Inference:* the HIG's "Avoid sending a notification that tells people to perform specific tasks within your app" is aimed at prompts the app invents. A due-count reminder that the user scheduled reports on the user's own review schedule. That is informational, and it is the pattern spaced-repetition and language apps use.
- *Inference:* a due-verse reminder is functional, not marketing. Content such as "new topical pack available" or "upgrade to Premium" **would** be marketing, and would need explicit in-app consent and an opt-out.

#### Android (verified, *sub-agent* unless marked)

**`POST_NOTIFICATIONS`** (Android 13, API 33)
- "your app's notifications are off by default."
- "If your app targets Android 13 or higher, your app has complete control over when the permission dialog is displayed."
- Recommended practice: "You can trigger a permissions prompt from a user action."
- "Users can see the number of daily notifications that your app sends, and they can revoke the permission at any time."
- Source: [notification permission](https://developer.android.com/develop/ui/views/notifications/notification-permission).

**Channels** ([channels](https://developer.android.com/develop/ui/views/notifications/channels), *re-fetched*)
- `IMPORTANCE_HIGH` "Makes a sound and appears as a heads-up notification".
- `IMPORTANCE_DEFAULT` "Makes a sound".
- `IMPORTANCE_LOW` "Makes no sound".
- Behaviour is frozen after creation: "The user has complete control at that point."

**Exact alarms**
- `SCHEDULE_EXACT_ALARM` "is no longer being pre-granted to most newly installed apps targeting Android 13 and higher (will be set to denied by default)" on Android 14+ ([Android 14 change](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)).
- Google Play: "USE_EXACT_ALARM is a restricted permission … such as: The app is an alarm or timer app. The app is a calendar app that shows event notifications" ([Play policy, Exact Alarm Permission](https://support.google.com/googleplay/android-developer/answer/16558241), accessed 2026-10-08).
- The Android alarm guide recommends `setAndAllowWhileIdle()` for a "User-specified action that should happen after a specific time" ([alarms](https://developer.android.com/develop/background-work/services/alarms)).
- *Inference:* a devotional reminder does not qualify for `USE_EXACT_ALARM`. Accept the inexact alarm that `expo-notifications` already falls back to (N9).

**Per-app alarm cap.** AOSP sets `DEFAULT_MAX_ALARMS_PER_UID = 500` ([AlarmManagerService.java](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/apex/jobscheduler/service/java/com/android/server/alarm/AlarmManagerService.java)). This is platform source, not a documented developer limit. It is irrelevant at 1–14 scheduled reminders.

**Play policy**
- "System level notifications may only be used for an app's integral features" ([system functionality policy](https://support.google.com/googleplay/android-developer/answer/9969861)).
- "Don't trigger notifications to promote a different app or a third-party service" (same page).

#### `expo-notifications` on SDK 57 (verified, [docs v57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) and [sdk-57 source](https://github.com/expo/expo/tree/sdk-57/packages/expo-notifications), *sub-agent*)

**Triggers**
- `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`, `DATE` and `TIME_INTERVAL` work on Android and iOS. `CALENDAR` is iOS-only.
- On iOS, `DAILY` maps to a repeating `UNCalendarNotificationTrigger`.

**Actions and categories**
- `setNotificationCategoryAsync` supports actions with `opensAppToForeground`, `isDestructive` (iOS), `isAuthenticationRequired` (iOS) and `textInput`.
- **Caveat:** "If `false` and your app is killed (not just backgrounded), NotificationResponseReceived listeners will not be triggered when a user selects this action." A background "Snooze" action is therefore **unreliable when the app has been killed**.

**Permissions and iOS options**
- `interruptionLevel` (iOS) is supported.
- `requestPermissionsAsync({ ios: { allowProvisional, allowDisplayInCarPlay, … } })` is supported.
- The docs' Android 13 permission wording is stale. The native module requests `POST_NOTIFICATIONS` explicitly when targetSdk ≥ 33.

**Deep linking**
- Use `addNotificationResponseReceivedListener` and `useLastNotificationResponse` / `getLastNotificationResponse()`. The docs show `content.data.url` being routed.
- In source, `getLastNotificationResponseAsync` is `@deprecated`.

**Config plugin.** It supports `icon` (a "96x96 all-white png"), `color`, `defaultChannel`, `sounds` and `enableBackgroundRemoteNotifications`. It does **not** add a Time Sensitive entitlement.

**Not supported:** Android Live Updates / `ProgressStyle`, and iOS `relevanceScore`.

#### Remote push (APNs/FCM)
*Inference:* remote push is not needed for this app today.
- Due dates are computed on the device (ADR 0002 is offline-first). A local schedule can carry the real due count and verse reference (§5).
- Remote push would require a backend, a token store and APNs/FCM credentials.
- It becomes relevant only with multi-device sync, server-driven church or group plans, or push-to-start Live Activities. The prior note's S1 server proxy would be the first backend.

**Effort:** S for the fix pack in §5 (on top of P1 deep links, S). **Risks:** notification fatigue (§5.1); the Expo action caveat. **Fit: 5/5.** This is the only surface that reaches every opted-in user on both platforms. It also reaches the wrist on Apple Watch and Wear OS for free (§3.4, §3.5).

### 3.2 Home-screen and lock-screen widgets

#### iOS WidgetKit (verified, *sub-agent*)

**Families and placements**
- Lock Screen accessory families (`accessoryCircular`, `accessoryRectangular`, `accessoryInline`) arrived in iOS 16.
- StandBy (iOS 17) shows "two small system family widgets side-by-side". The HIG adds: "By supporting StandBy, you also ensure your widgets work well in CarPlay" ([HIG widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)).

**Interactive widgets** (iOS 17+, App Intents)
- "Widgets and Live Activities can include buttons and toggles to offer specific app functionality without launching the app."
- "An interaction with a button or toggle should do more than open the app."
- "On a locked device, buttons and toggles are inactive."
- Source: [adding interactivity](https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities).

**Refresh budget**
- "For a widget the user frequently views, a daily budget typically includes from 40 to 70 refreshes."
- Reloads while the app is in the foreground, or after an App Intent tap, do not count against it.
- Source: [keeping a widget up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date).
- *Inference:* because spaced-repetition due dates are deterministic, the app can write a **timeline** (today's count, then tomorrow's count at 00:00). The widget then rolls over at midnight without the app running.

**Control Center controls** (iOS 18)
- "A control allows your app to execute an action, launch your app to a specific view, or launch a locked camera capture extension from Control Center, the Lock Screen, or by using the Action button."
- An `OpenIntent` opens the app ([creating controls](https://developer.apple.com/documentation/widgetkit/creating-controls-to-perform-actions-across-the-system)).

**HIG guidance** ([HIG widgets](https://developer.apple.com/design/human-interface-guidelines/widgets))
- "Prefer dynamic information that changes throughout the day."
- "Provide useful information in your Lock Screen widget, and don't treat it only as an additional way for people to launch into your app."
- "Ensure that a widget interaction opens your app at the right location."

**CarPlay and Mac.** iPhone widgets also appear on the Mac desktop and in CarPlay.
- "Widgets are supported in CarPlay Ultra, and with iOS 26 in CarPlay."
- "Your app does not need to be a CarPlay app to support widgets."
- **But** "Your widget can only launch your app in CarPlay if your app is also a CarPlay app."
- And "If your widget's primary purpose is to launch your app on iPhone … your widget will be non-functional in CarPlay." Such widgets should declare `.disfavoredLocations([.carPlay], …)`.
- Source: [CarPlay Developer Guide, June 2026](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf) (*re-fetched*).

#### Android (verified, *sub-agent*)
- **Glance** 1.2.0 is stable (August 26, 2026) ([Glance releases](https://developer.android.com/jetpack/androidx/releases/glance)).
- `updatePeriodMillis` "doesn't support values of less than 30 minutes" ([advanced widgets](https://developer.android.com/develop/ui/views/appwidgets/advanced)).
- Quality tier 3 failures include "Widget content is consistently stale" and "Widget doesn't update after user completes an action from the widget" ([widget quality](https://developer.android.com/docs/quality-guidelines/widget-quality)).

#### Expo / React Native path (verified)

**`expo-widgets` (first-party)**
- Stable since SDK 56: "Widgets for iOS promoted to stable" ([SDK 56 changelog](https://expo.dev/changelog/sdk-56)).
- The **v57 docs list `platforms: ['ios']`** ([docs v57](https://docs.expo.dev/versions/v57.0.0/sdk/widgets/), *re-fetched*). npm `expo-widgets` `latest` = 57.0.23 (*re-fetched*).
- It covers home-screen and Lock Screen families plus Live Activities.
- "Interactive widgets require iOS 17 or later." A `Button` press can return new props, and "the runtime persists it and reloads the widget on device, with no running app process required".
- Widget code "runs in an isolated runtime and can only use `@expo/ui/swift-ui` components, with no React hooks, app state, or asynchronous work".
- Data goes in via `updateSnapshot` / `updateTimeline` through an App Group (`groupIdentifier`, default `group.<bundle id>`).
- Not documented: Control Center controls, `Toggle`, and `disfavoredLocations`. These are **UNVERIFIED as supported**.

**Android options**
- **SDK 58 adds Android to `expo-widgets`**: "widgets run their own JS bundle on a dedicated Hermes runtime" ([SDK 58 beta](https://expo.dev/changelog/sdk-58-beta)). But SDK 58 is **still beta on 2026-10-08**: npm `expo` `latest` = 57.0.27, `next` = 58.0.6 (*re-fetched*). The v58 docs page still says iOS only (*sub-agent*).
- **`react-native-android-widget`** v0.22.1 (2026-08-17), MIT, 899 stars, last commit 2026-09-20. It "exports a config plugin" ([GitHub](https://github.com/sAleksovski/react-native-android-widget), [Expo tutorial](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo)). This is the usable path on SDK 57.

**Other libraries**
- **`@bacons/apple-targets`** 5.0.0 (2026-07-17), MIT. Its README lists widget, control, app-intent, watch, notification-content and other targets ([GitHub](https://github.com/EvanBacon/expo-apple-targets)). Its **SDK 57 support is an open draft PR (#210)**: "@bacons/apple-targets moves from 5.0.0 (the version published for the SDK 55 line) to 6.0.0" (*sub-agent*). Treat it as not ready for SDK 57.
- **`software-mansion-labs/expo-live-activity`** is archived: "This library is deprecated. Consider other solutions like expo-widgets" (*sub-agent*).

**Widget ideas for this app** (*inference*, ordered by value)
1. **Small / Lock Screen "Hoje: 3 versículos · 12 dias"** (due count plus the app-level streak in `HabitStats`). Tapping opens the review queue.
2. **Interactive "flash-card" widget** (iOS 17+): it shows a due verse's reference; a `Button` reveals the first letters, then the text. This is real retrieval practice on the home screen, and exactly the "do more than open the app" interaction Apple asks for. *Speculative value;* no competitor evidence was gathered for it.
3. **StandBy and CarPlay:** the count widget is glanceable and safe. The flash-card widget should be marked `disfavoredLocations([.carPlay])` so no verse text appears while driving. `expo-widgets` does not document that modifier, so it may need Swift.

**Effort:** M per platform (App Group plus a snapshot export from `VerseEngine`, which also needs `ios.bundleIdentifier`). **Risks:** `expo-widgets` gaps; the Android library is community-maintained; data must be pushed after every review. **Fit: 4/5.**

### 3.3 Live Activities, Dynamic Island, and Android Live Updates

#### ActivityKit (verified)

**Limits** ([displaying live data](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities), *re-fetched*)
- "A Live Activity can be active for up to eight hours"; after that it stays on the Lock Screen "for up to four additional hours" (12 hours in total).
- Data is limited to "a combined size of 4 KB".

**Ways to start one** (the same page, *re-fetched*)
- "In general, your app needs to be in the foreground to start a Live Activity."
- "However, you can start a Live Activity while your app is in the background by using an app intent that conforms to LiveActivityIntent", for example from a Control Center control.
- **Push-to-start** with `pushToStartToken` (iOS 17.2; [pushToStartToken](https://developer.apple.com/documentation/activitykit/activity/pushtostarttoken)). This needs a server.
- **Scheduled start** (iOS 26): "You can schedule a Live Activity for a specific date … you must pass an AlertConfiguration."

**Where they appear**
- On a paired Apple Watch, "at the top of the Smart Stack". The HIG change log dates this to June 10, 2024 ([HIG Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities), *sub-agent*).
- In CarPlay on iOS 26: "Live Activities are supported with iOS 26 in CarPlay". There, "Buttons and toggles on Live Activities don't perform actions in CarPlay."

**HIG rules that decide fit** ([HIG Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities))
- "Offer Live Activities for tasks and events that have a defined beginning and end."
- "Don't use a Live Activity to display ads or promotions."
- "Live Activities that appear unexpectedly can be surprising or even unwanted."
- "Always end a Live Activity immediately when the task or event ends."
- Interactive elements are for essential functions "like music playback, workouts, or apps that access the microphone to record live audio".

#### Android Live Updates (Android 16; verified, [Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update), *sub-agent*)
- They shipped as `Notification.ProgressStyle` (API 36), plus promoted ongoing notifications (`setRequestPromotedOngoing`, 36.1).
- "Use Live Updates for activities that are ongoing, user-initiated, and time-sensitive."
- "Inappropriate uses: Ads, promotions, chat messages, alerts, upcoming calendar events, and quick access to app features."
- "OEMs can enforce additional criteria."
- `expo-notifications` does not support them (§3.1).

#### Fit for this app (*inference*)
- **"Daily goal" all day: no.** It has no defined task in progress. It is the "appear unexpectedly" case Apple warns about. Android names "quick access to app features" and "upcoming calendar events" as inappropriate. A *scheduled* Live Activity at quiet time would be a notification in disguise.
- **A 2–10 minute in-app review session: little value.** The user is already looking at the app.
- **A hands-free, screen-off session: good fit.** This is the "commute mode" in the prior note's P8, recited through earbuds with the phone locked.
  - It has a defined start and end and uses the microphone.
  - It could show "Versículo 2 de 5 · ouvindo" with a single pause button.
  - It would automatically appear on the Watch Smart Stack and the CarPlay Dashboard.
  - On Android the same session already needs a microphone foreground-service notification. Android forbids starting one from the background: "you cannot create a microphone foreground service while your app is in the background" ([FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)).
  - Promoting it to a Live Update is optional, and needs a small native module.

**Expo path:** `expo-widgets` `createLiveActivity` (iOS; `start`, `update`, `end`). **Effort:** M, once hands-free sessions exist. **Fit: 2/5 now, 4/5 with hands-free sessions.**

### 3.4 Apple Watch (verified, *sub-agent* unless marked)

**Free today, with no watch code**
- **Notification forwarding.** "Apple Watch and iPhone also work together to automatically forward notifications sent to your iOS app to a paired Apple Watch, even if you don't have a watchOS app" ([watchOS notifications](https://developer.apple.com/documentation/watchos-apps/notifications)).
- Routing: "If the user's iPhone is unlocked and the screen is on, notifications go to the phone. Otherwise, if the Apple Watch is on the user's wrist and unlocked, notifications go to the watch" ([forwarding](https://developer.apple.com/documentation/watchos-apps/taking-advantage-of-notification-forwarding)).
- Whether an iPhone-only app's action buttons appear on the watch is **UNVERIFIED**. The HIG's sharing statement assumes a watch app exists.
- **Live Activities** from the iPhone app appear in the Smart Stack (§3.3).

**Needs a watchOS app**
- Complications and Smart Stack widgets need a watchOS widget extension. "Your widget-based complication receives up to 75 updates per day" ([converting ClockKit](https://developer.apple.com/documentation/widgetkit/converting-a-clockkit-app)). `RelevanceKit` is watchOS 26+.
- Custom long-look notifications and watch-scheduled notifications also need a watch app.

**Reciting on the watch**
- **No on-device speech recognition API exists on watchOS.** The availability metadata for `SFSpeechRecognizer`, `SpeechAnalyzer`, `SpeechTranscriber` and `DictationTranscriber` lists iOS, iPadOS, Mac Catalyst, macOS and visionOS (some also tvOS), but **not watchOS** ([SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer), [SpeechAnalyzer](https://developer.apple.com/documentation/speech/speechanalyzer); *re-fetched*).
- What does exist:
  - **System dictation into a text field.** On a small watch "the system lets people use dictation or Scribble" ([HIG keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards)). `presentTextInputController` also offers dictation.
  - **Recording audio** with `AVAudioRecorder` (watchOS 4+) or `presentAudioRecorderController`. The audio can then go to the iPhone by `WCSession.transferFile`, or to cloud Whisper.
- *Inference:* dictation yields only finished text, not word-level progress. That is fine for scoring with the existing diff engine ported to Swift, or with the text sent to the phone. Live word-by-word feedback is not possible on the watch.
- Brazilian Portuguese dictation is listed for iOS ([feature availability](https://www.apple.com/ios/feature-availability/), *re-fetched*). It is **UNVERIFIED** for watchOS.

**Expo path**
- React Native does not run on watchOS. The [out-of-tree platforms list](https://reactnative.dev/docs/out-of-tree-platforms) has no watchOS (evidence by absence).
- A companion therefore means a SwiftUI target, through `@bacons/apple-targets` `watch` / `watch-widget`. That library is not ready for SDK 57 (§3.2), and it has open App Store submission issues (#147 CFBundleVersion mismatch, #207 watch icon).
- The bridge would be `react-native-watch-connectivity` 2.0.0 (2026-03-20, MIT): "This library does not allow you to write your Apple Watch apps in React Native" ([GitHub](https://github.com/watch-connectivity/react-native-watch-connectivity)).

**Brazil reach:** **UNVERIFIED.** No 2025–26 primary or secondary figure was found for Apple Watch share in Brazil. Dated secondary IDC write-ups (2021) put Zepp/Amazfit ahead of Apple in Brazilian wearables, and say over half of units came through the grey market.

**Effort:** S for free forwarding (just make the reminder good); L for a watch app. **Fit: 4/5 for forwarded notifications, 2/5 for a watch app.**

### 3.5 Wear OS (verified, *sub-agent*)

**Notification bridging is the default**
- "By default, the system bridges, or shares, notifications from a phone app to any paired watches."
- `setLocalOnly` and ongoing notifications do not bridge ([bridging](https://developer.android.com/training/wearables/notifications/bridger)).
- `expo-notifications` sets `setOngoing(content.isSticky)` (default false) and never calls `setLocalOnly`. *Inference:* the reminder bridges by default.

**Tiles, complications and widgets need a Wear OS app**
- Tiles need a `TileService` in a Wear OS APK ([tiles](https://developer.android.com/training/wearables/tiles/get_started)).
- Complications have a minimum update period of 300 s.
- Wear OS 7 (Android 17, API 37) is replacing full-screen Tiles with "dynamic Wear Widgets … Powered by Jetpack Glance and the new RemoteCompose framework" ([Wear OS 7](https://developer.android.com/training/wearables/versions/7/features)).
- "Maintaining both a tile and a widget is the recommended path" ([migration](https://developer.android.com/training/wearables/widgets/migration)).

**Speech:** `ACTION_RECOGNIZE_SPEECH` and `MediaRecorder` work on the watch ([voice input](https://developer.android.com/training/wearables/user-input/voice)).

**React Native:** "React Native does not officially support WearOS" ([react-native-wear-connectivity](https://github.com/fabOnReact/react-native-wear-connectivity); v0.1.17, 2025-10-24, documented up to RN 0.82).

**Effort:** S for bridging (free), L for a Wear OS app in Kotlin/Compose. **Fit: 4/5 for bridged notifications, 1/5 for a Wear OS app.**

### 3.6 CarPlay

**App categories** (verified in the [CarPlay Developer Guide, June 2026, rev. 2026-06-08](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf), *re-fetched*)
- The guide lists: audio; communication (SiriKit messaging / VoIP); driving task; EV charging; fueling; navigation; parking; public safety; quick food ordering; video; and **voice-based conversational**.
- The entitlement table gives `com.apple.developer.carplay-voice-based-conversation`, **minimum iOS 26.4**.
- "All CarPlay apps require a CarPlay app entitlement specific to your app category … Apple will review your request."
- "You cannot selectively show or hide CarPlay for certain people."
- The [developer.apple.com/carplay](https://developer.apple.com/carplay/) page lists the same categories and links the request form (*re-fetched*).

**Rules that decide eligibility** (the same guide, verbatim)

*All CarPlay apps*
- "Your CarPlay app must be designed primarily to provide the specified feature (for example, CarPlay audio apps must be designed primarily to provide audio playback services…)"
- "All CarPlay flows must be possible without interacting with iPhone."
- "No gaming or social networking."

*Voice-based conversational apps*
1. "must have a primary modality of voice upon launch; and after launch, appropriately respond to questions or requests and perform actions."
2. "Only hold an audio session open when voice features are actively being used."
3. "Optimize for voice interaction in the driving environment (for example, don't show text or imagery in response to queries)."

*Recording (decisive)*
- "In general, recording is not supported while in CarPlay. If your app has recording features, don't enable them when CarPlay is active."
- "An exception is for CarPlay navigation and voice-based conversational apps which use recording features for voice input. In these apps, recording features may be used, but only in conjunction with the voice control template."

*Templates and notifications*
- Voice-based conversational apps get the general templates (alert, action sheet, grid, list, tab bar) and the **voice control template from iOS 26.4**, with a template depth of 3. Whether the information template is included is unclear, because the PDF table lost its column alignment when the text was extracted.
- "Notifications are supported in CarPlay communication, EV Charging, parking, and public safety apps. Starting in iOS 18.4 … driving task apps." So **the quiet-time reminder never appears on the CarPlay screen.**

**Is this app eligible?** (*inference*, with the confidence stated)
- **As an audio app:** only for listening (Echo playlists of due verses). Recitation would need the microphone, which audio apps may not use in CarPlay. The CarPlay app would also have to be "designed primarily to provide audio playback services". Plausible, but low value.
- **As a voice-based conversational app:** the only path that allows reciting.
  - A spoken drill fits the letter of the rules: the app says "Romanos 8:28", the user recites, and the app says "Quase! Faltou 'propósito'. Próximo?".
  - The flow is voice-first with no text in responses, and recording happens only inside the voice control template.
  - But the category launched for AI assistants. ChatGPT shipped on CarPlay with iOS 26.4 (*secondary*: [AppleInsider](https://appleinsider.com/articles/26/03/31/openais-chatgpt-now-available-hands-free-via-carplay-with-ios-264)).
  - Whether Apple treats a recitation drill as "conversational" is **speculative**, and approval is discretionary.
  - Rule 3 also means the word-by-word diff must be **spoken, not shown**.
- **Widgets and Live Activities** in CarPlay need no entitlement (iOS 26). As noted in §3.2, they cannot launch a non-CarPlay app.
- **Approval odds** (*speculative*): low to moderate for the voice-based conversational category, and only once a hands-free voice loop exists in the phone app. Apple's wording, "the specified feature" and "all flows … without interacting with iPhone", means a half-voice CarPlay app would be rejected.

**React Native / Expo path** (verified with `gh api` and the npm registry)
- `react-native-carplay` (birkir) is stale. Its latest npm version is `2.4.1-beta.0` (2024-06-12), and its README says "*No Expo support due to Scenes*".
- **`@iternio/react-native-auto-play`** 0.8.1 (2026-10-02) is new and maintained.
  - MIT; created 2025-11; 69 stars; by Iternio (A Better Routeplanner).
  - It covers CarPlay and Android Auto, and gives an AppDelegate snippet "for bare react-native (>= 0.82) and Expo SDK 57".
  - Its `startVoiceInput` "presents `CPVoiceControlTemplate` on the car screen when CarPlay is connected, and captures audio via `AVAudioEngine`", with optional `SFSpeechRecognizer` transcription.
  - Requirements: "iOS builds require Xcode 27+", the New Architecture only, and `react-native-nitro-modules` ≥ 0.37.1.
  - It is navigation-centric, pre-1.0, and has no config plugin, so native files are edited by hand.
  - Source: [GitHub](https://github.com/Iternio-Planning-AB/react-native-auto-play).
- `@bradford-tech/expo-carplay` 0.4.1 (2026-09-24) covers navigation templates only, and has 0 stars.
- CarPlay requires scenes: "All CarPlay apps must adopt scenes and declare a CarPlay scene". SDK 57 has opt-in scene support through `expo-build-properties` `ios.enableSceneSupport` ([SDK 57 changelog](https://expo.dev/changelog/sdk-57)).

**Brazil reach:** CarPlay is available in Brazil ([Apple feature availability](https://www.apple.com/ios/feature-availability/), *re-fetched*). The share of Brazilian drivers with CarPlay is **UNVERIFIED**.

**Effort:** L (entitlement application, a CarPlay scene, a voice-only flow, spoken feedback). **Risks:** discretionary approval; driver-safety reputation; once enabled, it is visible to everyone. **Fit: 2/5 now; 4/5 if a hands-free loop exists and Apple grants the entitlement.**

### 3.7 Android Auto and Android Automotive OS

**Allowed categories** (verified, [Android for Cars](https://developer.android.com/training/cars), last updated 2026-09-22, *re-fetched*)
- While driving or parked:
  - Media (audio): Android Auto and AAOS.
  - Messaging notifications: Android Auto.
  - Templated messaging and calling: *labs*, testing tracks only.
  - Navigation, POI, IoT and Weather: Android Auto and AAOS.
- Parked only: video (AAOS), games, and browsers (labs).
- "Due to considerations unique to cars, Android Auto and Android Automotive OS only support certain types of apps."
- **There is no voice-assistant, conversational or education category.**

**Quality rules** ([car app quality](https://developer.android.com/docs/quality-guidelines/car-app-quality), updated 2026-09-14, *re-fetched*)
- **PC-1:** "The app must not include features outside the app types intended for cars."
- **VC-1** (media and navigation): "The app must support Gemini and Google Assistant voice commands."
- **MA-1:** no autoplay.
- Review: "Apps for cars are subject to an additional manual review beyond normal Play Store review processes."
- **The blocking risk:** "If my app does not meet the car requirements, will my new or updated app still appear on Google Play for other devices? **No.** … Any subsequent updates are not available for distribution until the app is approved."

**Microphone and media**
- The Car App Library has `CarAudioRecord` "to support building features such as an in-app digital assistant" ([car microphone](https://developer.android.com/training/cars/apps/library/car-microphone); [voice UX](https://developer.android.com/design/ui/cars/guides/ux-requirements/communicate-app-by-voice)). *Inference:* it is a capability *within* the allowed categories, not a category of its own.
- Media apps play "audio media"; "in-app media playback while driving isn't permitted" for anything else ([cars/media](https://developer.android.com/training/cars/media)).

**Verdict** (*inference*)
- **Recite and grade: not allowed.** No category fits, and PC-1 forbids extra features.
- **"Listen to my due verses" (Echo) as a Media app: allowed in principle.** It needs `MediaSession` plus `MediaLibraryService`, and voice commands under VC-1. But a rejected car review **blocks phone updates** until fixed, and the value (passive listening, no grading) is low.
- **Library:** `@iternio/react-native-auto-play` supports only the Car App Library categories (`navigation`, `poi`, `parking`, `charging`, `iot`, `messaging`, `calling`, `weather`), not media.

**Brazil reach:** Android Auto has been available in Brazil since 2016 (*secondary*: press coverage of the "18 new countries" launch). Google's own country list could not be machine-read (**UNVERIFIED**). Android holds about 78% of Brazil's mobile OS share (StatCounter, July 2026, from a search snippet; the page itself was unreachable, so *secondary* and **UNVERIFIED**).

**Fit: 1/5 for reciting; 2/5 for listen-only.**

### 3.8 Voice assistants and system integrations

#### Siri: App Intents and App Shortcuts (verified, *sub-agent* unless marked)

**What App Shortcuts are**
- App Shortcuts "are available as soon as someone installs your app, and you don't have to register them yourself" ([App Shortcuts](https://developer.apple.com/documentation/appintents/app-shortcuts)).
- They also appear in Spotlight and the Shortcuts app, and can be assigned to the Action Button.
- The HIG's limits:
  - "You have to include your app name, but you can be creative with it."
  - "Each app can include up to 10 App Shortcuts."
  - Source: [HIG App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts).
- Phrases are localized per locale with String Catalogs (WWDC23 [10102](https://developer.apple.com/videos/play/wwdc2023/10102/)).

**The phrase must include the app name.** So the invocation is "E aí Siri, revisar meus versículos no ‹App›" or "Hey Siri, review my verses in ‹App›", not a bare "review my verses".

**Naming risk**
- The current display name, "voice-ai-scripture", is not speakable.
- An Apple DTS engineer wrote (July 2026) that "the phrase-matching engine used by both Siri and the App Shortcuts Preview tool in Xcode has trouble tokenizing/normalizing accented names" ([forum thread](https://developer.apple.com/forums/thread/838210); *vendor forum, not docs*).
- *Inference:* this matters for a pt-BR name such as "Versículo…". The final app name should be checked against Siri before launch.

**Language and region**
- Siri is available in Brazil.
- "Siri: On-Device Speech Processing and Offline Requests" lists Portuguese (Brazil) ([feature availability](https://www.apple.com/ios/feature-availability/), *re-fetched*).
- Whether flexible phrase matching covers pt-BR is **UNVERIFIED**.

**Opening a specific screen**
- `OpenIntent` "opens the app and displays a specific item" ([OpenIntent](https://developer.apple.com/documentation/appintents/openintent)).
- `openAppWhenRun` is deprecated in iOS 26 in favour of `supportedModes`.
- *Inference:* opening an app from Siri on a locked phone asks the user to unlock it, so "review my verses" is not fully hands-free.
- An intent that does **not** open the app can answer by voice, for example "Quantos versículos tenho hoje?" → "Você tem 3 versículos para hoje, começando por Salmos 23:1". That works on AirPods too. The HIG says: "People can receive responses on audio-only devices such as AirPods and HomePod too".
- This intent reads the same App Group snapshot as the widget.

**Apple Intelligence / Siri AI (2026)**
- App schemas: "Only primary domains are discoverable by Apple Intelligence and Siri" ([expo-app-intents v58](https://docs.expo.dev/versions/v58.0.0/sdk/app-intents/)). Apple's primary domains are audio, calendar, camera, clock, mail, maps, messages, notes, phone, photos, reminders and search ([app schema domains](https://developer.apple.com/documentation/appintents/app-schema-domains)). Books, Reader and Journaling are Shortcuts-only.
- *Inference:* no domain fits verse memorization, so phrase-based App Shortcuts are the route.
- Siri AI "begins rolling out today in beta in English, and will expand to French, Japanese, Korean, Portuguese, and Spanish next month" ([Apple Newsroom, Sep 14 2026](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/), *re-fetched*; marketing).
- The feature-availability page still shows Siri AI as English only (*re-fetched*).
- "personal context understanding extends to third-party apps when developers integrate with Spotlight" (Newsroom, Jun 8 2026).
- *Later:* index verses as Spotlight entities, so a request like "o versículo sobre paz que estou decorando" can resolve.

**Action Button**
- On iPhone 15 Pro, iPhone 16 and later, and the 16e and 17e, the Action Button can run an App Shortcut ([Apple support](https://support.apple.com/en-us/105103)).
- HIG: "You don't need to offer an App Shortcut that opens your app, because the system provides this function already" ([HIG Action button](https://developer.apple.com/design/human-interface-guidelines/action-button)). So the shortcut has to *start a review*, not just open the app.

**Focus filters.** `SetFocusFilterIntent` only reacts when the user adds the app's filter to a Focus ([Focus](https://developer.apple.com/documentation/appintents/focus)). The system already filters notifications, so the added value is near zero. **Fit 1/5.**

**Expo path**
- **SDK 57 has no `expo-app-intents`.** The v58 module says: "This library is currently in alpha and will frequently experience breaking changes", "Declare the AppIntent types you need in Swift", and "Apple's build-time metadata extraction only sees code in the app target".
- npm `expo-app-intents@0.5.3` depends on `"@expo/ui": "^58.0.14"` (*re-fetched*). It is effectively SDK 58-only, and SDK 58 is still beta.
- On SDK 57 the options are:
  - hand-written Swift in the main app target, through a local config plugin (SDK 57 also has `experiments.inlineModules`); or
  - `@bacons/apple-targets` `app-intent`, which is untested by its author and not SDK 57-ready.
- `react-native-siri-shortcut`'s last release was 3.2.4 (2023-12-13), which is stale.

**Effort:** M. **Fit: 4/5.** It gives a voice start, a spoken due count, the Action Button and Spotlight with one feature.

#### Google Assistant, Gemini and Android shortcuts (verified, *sub-agent* unless marked)
- **Conversational Actions** "sunsetting … on June 13, 2023" ([sunset notice](https://developers.google.com/assistant/ca-sunset)).
- **App Actions** are still documented ([overview](https://developer.android.com/develop/devices/assistant/overview), updated 2026-07-16), with two caveats.
  - "Google is ending support for App Actions implemented using the actions.xml resource file."
  - "Custom intents support only the en-US locale."
  - The built-in intent `OPEN_APP_FEATURE` does support pt-BR invocation, for example "Abre o test feature do aplicativo ExampleApp" ([BII reference](https://developers.google.com/assistant/app/reference/built-in-intents/common/open-app-feature), *re-fetched*).
- **Assistant is being replaced by Gemini on phones.** Google: "the classic Google Assistant will no longer be accessible on most mobile devices" ([Google blog, Mar 2025](https://blog.google/products-and-platforms/products/gemini/google-assistant-gemini-mobile/)). Whether App Actions still trigger under Gemini is **UNVERIFIED**.
- **AppFunctions**, the Gemini path for third-party apps, "is in a private preview with trusted testers" and needs Android 16+ ([AppFunctions](https://developer.android.com/ai/appfunctions)).
- **Launcher shortcuts** are the cheap win. "Most supported launchers display up to four shortcuts" ([shortcuts](https://developer.android.com/develop/ui/compose/system/shortcuts)). Expo has the community module `expo-quick-actions` 6.0.2. A long-press "Revisar versículos de hoje" shortcut costs effort S, **fit 3/5**.
- **Verdict:** skip App Actions (English-centric, uncertain under Gemini). Watch AppFunctions. **Fit 1/5.**

### 3.9 Other channels for a Brazilian Christian audience

#### WhatsApp Business Platform (verified, *sub-agent* unless marked)

**Category**
- Utility requires both conditions: "Must be non-promotional … Must ALSO be either specific to or requested by the user (clearly related to their order, account, services, or transactions) OR essential or critical to the user" ([template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization), updated Sep 15, 2026; *re-fetched*).
- Marketing includes "Build Customer Relationships … prompting new conversations" and retargeting people who "used your app … These are marketing even if requested by users".
- "If you selected UTILITY … and WhatsApp determined it should be MARKETING, the template is approved as MARKETING."
- *Inference:* a daily verse reminder would be billed as **marketing**.

**Price**
- Billing has been per message since July 1, 2025.
- Meta's own pricing calculator returned these Brazil rates on 2026-10-08: **marketing US$0.0625 (R$0.3217)** per delivered message; utility US$0.0068 (R$0.035) ([pricing doc](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing), updated Sep 30, 2026; [rate calculator](https://whatsappbusiness.com/products/platform-pricing/)).
- From Oct 1, 2026, utility replies inside the 24-hour window are charged again.
- *Arithmetic:* one marketing message a day costs about **R$9.65 per user per month**. For 1,000 daily users that is about **R$9,650 per month**.

**Opt-in and delivery**
- Opt-in: "You may only contact people on WhatsApp if … you have received opt-in permission from the recipient" ([Business Messaging Policy](https://whatsappbusiness.com/policy/), updated Sep 23, 2026).
- Per-user marketing caps: "WhatsApp may limit the number of marketing template messages a WhatsApp user receives from any business" ([per-user limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits/)).
- US numbers: "WhatsApp does not currently deliver marketing template messages to WhatsApp users with United States phone numbers."
- No policy restriction on religious content was found. The only mention of religion is anti-discrimination.

**LGPD**
- "convicção religiosa" (religious conviction) is sensitive data (Art. 5, II).
- Art. 11 §1 extends the sensitive-data rules to any processing "que revele dados pessoais sensíveis" (that reveals sensitive personal data) ([Lei 13.709](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)).
- *Inference:* a list of phone numbers subscribed to a Bible app's reminders reveals religious conviction. It needs specific, highlighted consent and secure storage on a backend that does not exist yet.

**Free alternatives that fit the app** (verified, *sub-agent*)
- **Share flows:** `wa.me/?text=` links and the RN `Share` API ([click to chat](https://faq.whatsapp.com/5913398998672934/?locale=en_US), [RN Share](https://reactnative.dev/docs/share)). These already exist for decks (`deckSharing.ts`). They are the prior note's viral-loop items, not reminders.
- **WhatsApp Channels:** "one-way updates to an unlimited audience". Followers' numbers are hidden. "Notifications are muted by default" ([channels FAQ](https://faq.whatsapp.com/549900560675125/?locale=en_US)). No official posting API was found, so posts would be manual. A "verse of the week" channel is a community and marketing tool, not a personal due-verse reminder.
- *Reach in Brazil:* WhatsApp is on the home screen of 64.8% of Brazilian smartphones (*secondary*: [Mobile Time / Opinion Box](https://www.mobiletime.com.br/noticias/09/06/2026/whatsapp-super-panorama/)).

**Fit:** Business API reminders **1/5**; share flows **4/5** (for sharing, not reminding); Channels **2/5**.

#### Email digests (verified, *sub-agent*)
- Email needs an address, a backend, a sending domain with SPF/DKIM/DMARC and one-click unsubscribe.
  - Gmail requires SPF or DKIM for all senders and a spam rate "below 0.3%". Over 5,000 a day, one-click unsubscribe is required ([Google](https://support.google.com/a/answer/81126?hl=en)).
  - The one-click mechanism is [RFC 8058](https://www.rfc-editor.org/rfc/rfc8058).
- Cost is trivial: Amazon SES is $0.10–$0.16 per 1,000 emails ([SES pricing](https://aws.amazon.com/ses/pricing/)).
- Engineering and LGPD cost are not trivial. A daily email also arrives in an inbox that is not where quiet time happens.
- **Fit: 1/5.** A weekly progress email may make sense later, if accounts exist.

#### Calendar: a daily quiet-time event (verified, *sub-agent*)
- **iOS:** "Your app can use EventKitUI without requesting write-only or full calendar access" ([EventKit](https://developer.apple.com/documentation/eventkit/accessing-the-event-store)).
- **Android:** "your application doesn't even need to have the WRITE_CALENDAR permission" when using the insert intent, which can pre-fill an RRULE ([Calendar provider](https://developer.android.com/guide/topics/providers/calendar-provider)).
- **SDK 57 `expo-calendar`:** the API is class-based now. Its `addEventWithForm()` "Requires at minimum write-only calendar permission", while the legacy `createEventInCalendarAsync` "don't need to request permissions". The Expo docs disagree with Apple here; test on a device ([calendar v57](https://docs.expo.dev/versions/v57.0.0/sdk/calendar/)).
- *Inference:* an optional **"Adicionar ao meu calendário"** button in reminder settings creates one recurring daily event. It is a system dialog the user confirms. It suits people who plan their day in a calendar, needs no backend, and costs one dependency.
- A per-day verse list via ICS/webcal would need hosting, and subscribed-calendar alerts may be stripped.
- **Fit: 3/5, effort S.**

#### Smart speakers

*Verified, sub-agent.*

**Alexa**
- Custom skills are not on Amazon's [deprecated features](https://developer.amazon.com/en-US/docs/alexa/ask-overviews/deprecated-features.html) list.
- pt-BR is a supported skill locale ([skill languages](https://developer.amazon.com/en-US/docs/alexa/custom-skills/develop-skills-in-multiple-languages.html)).
- Alexa launched in Brazil on **Oct 2, 2019** ([Amazon press](https://press.aboutamazon.com/2019/10/alexa-and-amazon-echo-now-available-in-brazil)), not in 2020 as the research brief assumed.
- The Alexa+ developer path is "available to select partners only".
- A skill would need account linking and a backend to know the user's due verses.

**Google Nest:** no third-party voice-app path since the 2023 sunset. "Gemini for Home" exposes only smart-home APIs.

**HomePod:** WWDC23 says "on HomePod, App Shortcuts may not launch the app at all". The spoken "how many are due" intent above is the only HomePod-friendly piece. HomePod availability in Brazil is **UNVERIFIED**.

**Fit: 1/5.** This would be a second, server-backed product for a small slice of users.

---

## 4. Comparison Matrix

**Reading the "Reach in Brazil" column.**
- Device-level Brazil data is thin. Android holds about 78% and iOS about 22% of mobile OS share (StatCounter, July 2026). That comes from a search snippet; the page was unreachable, so it is **UNVERIFIED**.
- CarPlay and Siri availability in Brazil is verified on Apple's feature-availability page. Android Auto availability rests on secondary press coverage.
- Watch, CarPlay and Android Auto *penetration* among Brazilian users is **UNVERIFIED**.

**Effort:** S is about a week or less, M is two to four weeks, L is more than a month or needs Apple/Google approval.

| Surface | Reach in Brazil | Eligibility / approval | Effort | Value for this app | Fit (1–5) | Verdict |
|---|---|---|---|---|---|---|
| **Local daily reminder** (iOS + Android) | Every opted-in user on both OSes | None. It is functional, not marketing (4.5.4) | S | High: the daily cue, with deep links to the review | **5** | **Now** |
| Forwarded to Apple Watch / bridged to Wear OS | Watch owners (share UNVERIFIED) | None, automatic | Free | Medium: wrist cue at quiet time | 4 | **Now** (comes free with the fix) |
| Remote push (APNs/FCM) | Same as local | None, but needs a backend | M | Low until there is sync or group features | 2 | Later |
| **iOS widgets** (Home, Lock Screen, StandBy; also Mac and CarPlay Dashboard) | iOS users; iOS 17+ for interactive | None | M | Medium–high: always-visible due count; flash-card retrieval | **4** | **Next** |
| **Android widgets** | Android users (the majority) | None | M | Medium–high | **4** | **Next** |
| **Siri App Shortcuts** + Action Button + Spotlight | iOS; Siri in Brazil with pt-BR | None. The phrase must contain the app name | M | Medium: voice start, spoken due count | **4** | **Next** |
| Control Center control | iOS 18+ | None | M (Swift) | Low–medium | 3 | Next, with the intents |
| Android launcher shortcuts | Android | None | S | Low–medium | 3 | Next |
| Calendar "add quiet time" | Calendar users | None (system UI) | S | Low–medium | 3 | Next (optional) |
| Live Activity / Dynamic Island | iOS 16.1+ | HIG rules; no review gate | M | Only for hands-free sessions | 2 → 4 | Later |
| Android Live Updates | Android 16 (36.1+) devices; OEM criteria | Google's use-case rules | M (native) | Same as above | 2 | Later |
| Apple Watch app (complication, dictation recite) | UNVERIFIED | App Review | L | Medium for wrist review | 2 | Later |
| Wear OS app or tile | UNVERIFIED | Play review | L | Low | 1 | Never (for now) |
| CarPlay, voice-based conversational | CarPlay available in Brazil | **Discretionary entitlement**, iOS 26.4+ | L | High *if* approved and hands-free exists | 2 → 4 | Later, conditional |
| CarPlay, audio app (Echo listen-only) | Same | Entitlement; "primarily … audio playback" | L | Low | 2 | Only if a Listen mode becomes a product |
| Android Auto (media, listen-only) | Available in Brazil (*secondary*) | Manual car review; **rejection blocks phone updates** | M–L | Low | 1 | **Never** for reciting; not now for listening |
| Google App Actions / Gemini | Android; Assistant being phased out | AppFunctions is a private preview | M | Low | 1 | Never; watch AppFunctions |
| Focus filter | iOS 16+ | None | S–M | Very low | 1 | Never |
| WhatsApp Business API reminders | Very high (WhatsApp on 64.8% of home screens, *secondary*) | Opt-in, **marketing** category (≈R$0.32 per message), per-user caps | M–L + backend | Medium, outweighed by cost and LGPD | 1 | **Never** (for reminders) |
| WhatsApp share links / a Channel | Very high | None; Channels are manual and free | S | Medium for growth, not reminders | 3 | Next (sharing only) |
| Email digest | Medium | Gmail/Yahoo sender rules; LGPD | M + backend | Low | 1 | Not now |
| Alexa skill / Google Nest / HomePod | Alexa in Brazil since 2019; Nest has no third-party path | Skill certification | L | Low | 1 | Never

---

## 5. Notification Strategy

### 5.1 Principles (what the evidence supports)

**One calm, predictable reminder a day works in the short term. It does not, on its own, build a lasting habit.**

*The reminder itself*
- **Drink Less micro-randomized trial** (Bell et al., 2023, JMIR mHealth uHealth, [10.2196/38342](https://doi.org/10.2196/38342), *re-fetched*): a daily 8 pm notification "increased the probability of opening the app in the next hour by 3.5-fold". "The effect of the notification did not change significantly over time." But disengagement over time did not differ from users who got no notification.
- **HeartSteps** (Klasnja et al., 2019, [10.1093/abm/kay067](https://doi.org/10.1093/abm/kay067)): suggestions raised steps "by 66% … but this effect diminished over time".
- **Systematic reviews** find short-term benefit and unclear long-term effect:
  - [Alkhaldi 2016](https://doi.org/10.2196/jmir.4790): RR 1.27, "treated with caution".
  - [Vervloet 2012](https://doi.org/10.1136/amiajnl-2011-000748): "long-term effects remain unclear".

*Reminders can replace the habit*
- Stawarz, Cox & Blandford, CHI 2015 ([10.1145/2702123.2702230](https://doi.org/10.1145/2702123.2702230)): "relying on reminders supported repetition but hindered habit development, while the use of event-based cues led to increased automaticity".
- In a vocabulary app, students who got reminders on some days "studied less frequently on days without reminders … students become overly reliant on them" (Nobbe et al., 2024, npj Science of Learning, [10.1038/s41539-024-00253-7](https://doi.org/10.1038/s41539-024-00253-7), *re-fetched*).

*Planning carries the long-term effect*
- Implementation intentions have d = .65 on goal attainment (Gollwitzer & Sheeran, 2006, [10.1016/S0065-2601(06)38002-1](https://doi.org/10.1016/S0065-2601(06)38002-1)).
- In children's study apps, "reminder prompts increased the likelihood of studying on the day they were given. Planning … helped children maintain a high frequency of learning over time" (Breitwieser et al., 2023, [10.1016/j.compedu.2023.104879](https://doi.org/10.1016/j.compedu.2023.104879)).

*Content: personal and varied*
- Personalized reminders that name the next item raised on-time study by 14 percentage points, in a small study (N=39; Bälter et al., 2023, [10.2196/43977](https://doi.org/10.2196/43977)).
- Duolingo's KDD paper (*peer-reviewed, company-authored*): rotating templates gave "a 0.5% increase in total daily active users … and a 2% increase in new user retention". Repeating the same template "desensitize[s] users" (Yancey & Settles, 2020, [10.1145/3394486.3403351](https://doi.org/10.1145/3394486.3403351)).

*Calm: fatigue is real*
- Notification alerts raise inattention (Kushlev et al., CHI 2016, [10.1145/2858036.2858359](https://doi.org/10.1145/2858036.2858359)).
- Batching notifications at predictable times improved well-being, while removing them entirely raised anxiety (Fitz et al., 2019, [10.1016/j.chb.2019.07.016](https://doi.org/10.1016/j.chb.2019.07.016)).
- Contemplative practitioners "are wary of [technology's] stimulation-based effects" (Markum & Toyama, CHI 2020, [10.1145/3313831.3376356](https://doi.org/10.1145/3313831.3376356)).
- In habit-app interviews, streak and time-based reminders caused guilt: "I took them off because then I beat myself up" (Renfree et al., 2016, [10.1145/2851581.2892495](https://doi.org/10.1145/2851581.2892495)).
- One participant's most-kept streak was **prayer** (same paper).

*Faith apps specifically*
- In a Pray.com subscriber survey, 52% said they used Daily Prayer reminders. *Peer-reviewed but company-affiliated* (Laird et al., 2024, [10.1007/s10943-024-02004-9](https://doi.org/10.1007/s10943-024-02004-9)).

**Rules that follow** (*inference*)
1. **At most one notification per day.** Send it only when at least one verse is due, and skip it if the user already reviewed today.
2. **Pair the reminder with a when-and-where plan** set at onboarding ("Depois do café, no sofá"). The reminder is the cue; the plan builds the habit.
3. **Name the verse and the count**, and rotate 5–7 phrasings per locale.
4. **No guilt, no streak threats, no exclamation marks.** Missing a day "did not materially affect the habit formation process" (Lally et al., 2010, [10.1002/ejsp.674](https://doi.org/10.1002/ejsp.674)).
5. **Back off when ignored.** After 7 consecutive reminders with no app open, stop scheduling. On the next app open, offer to resume.
   - The HIG says "Avoid sending multiple notifications for the same thing, even if someone hasn't responded".
   - Duolingo reportedly stops practice reminders at day 7 (*vendor*, podcast, undated).

### 5.2 Scheduling design (*inference*, built on the verified APIs in §3.1)

- **Replace the single repeating trigger with a rolling 14-day plan of `DATE` triggers.**
  - Use ids `qt-YYYY-MM-DD`, each with that day's predicted due count and the first due reference.
  - Spaced-repetition due dates are known in advance, so the forecast is exact until the user reviews.
  - Re-plan whenever the app comes to the foreground and after every review. Days with nothing due get no notification.
  - Fourteen requests stay well under the 64-pending limit.
- **Cancel today's notification by id** once all of today's due verses are reviewed. Never use `cancelAll…` (N3).
- **Adaptive timing, but user-confirmed.**
  - Track when reviews actually start, keeping the median of the last 7.
  - If it drifts more than 45 minutes from the reminder time, *ask*: "Você costuma recitar por volta das 6h40. Mover o lembrete para esse horário?"
  - Past behaviour was the strongest predictor of opportune moments (Pielot et al., 2017, [10.1145/3130956](https://doi.org/10.1145/3130956)).
  - But adaptive tailoring "does not always enhance their use" (Morrison et al., 2017, [10.1371/journal.pone.0169162](https://doi.org/10.1371/journal.pone.0169162)).
  - Duolingo's silent "23.5 h after the last practice" rule is *vendor* and podcast-only; it is not adopted here.
- **iOS:** `interruptionLevel: 'active'` and `threadIdentifier: 'quiet-time'`. Never `timeSensitive`.
- **Android:** a new channel `quiet-time-v2` with **`AndroidImportance.DEFAULT`**, used by name (sound, no heads-up). Delete the old `quiet-time` channel. Add the config plugin with a monochrome `icon` and the amber `color` `#D97706`.
  - Do **not** request exact alarms (§3.1). Inexact can drift up to about an hour on Android 12+, so the settings copy should say "por volta das 6h30".
- **Lock-screen privacy.** The notification reveals religious practice, which is LGPD-sensitive (§3.9). Offer "Mostrar a referência do versículo na notificação" (default on). Never show the full verse text by default.

### 5.3 Quick actions and deep links

**Primary action: the tap itself.**
- Put `data: { url: 'voice-scripture://review?from=reminder' }` in the notification.
- Handle a cold start with `getLastNotificationResponse()`, and a warm app with `addNotificationResponseReceivedListener`.
- Open the "review all due" queue directly. That queue is the prior note's E-R2, and the scheme registration is its P1.
- *Inference:* this is what makes a reminder convert. The tap should land on the first due verse with the microphone ready, not on Home.

**Do not add a "Recitar agora" button.** It duplicates the tap, and the HIG says "Avoid providing an action that merely opens your app".

**At most one action: "Lembrar em 1 hora" / "Remind me in 1 hour".**
- Use `opensAppToForeground: false`, which schedules a one-off `qt-snooze` notification.
- Known limitation: if the app was killed, the Expo listener is not called (§3.1). Test it on devices, and drop it if it is unreliable.
- On Android, a category set as the content's `categoryIdentifier` renders its actions, despite the docs' `@platform ios` tag (*sub-agent*, source read).

**Later, iOS only and speculative:** an "Ouvir" action that plays the verse (Echo) without opening the app. It needs background audio, so test the execution time first.

### 5.4 Permission prompt flow

1. **Never prompt at first launch.** Apple and Android both recommend asking in context ([Apple](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications); [Android](https://developer.android.com/develop/ui/views/notifications/notification-permission)).
2. **Trigger point.** Ask right after the **first successful recitation** ("Você recitou Salmos 23:1!"), or when the user taps "Lembretes". This is Apple's "after the person schedules a first task" pattern.
3. **Show an explanation screen first:** a time picker plus the optional when-and-where plan, then "Ativar lembrete". The system dialog appears only after that tap.
   - Explaining why before the prompt raised grant odds 2.73× in a lab study of Android *data* permissions (Elbitar et al., USENIX Security 2021, [PDF](https://www.usenix.org/system/files/sec21-elbitar.pdf)). This is an extrapolation to notifications.
   - Duolingo reported +5% opt-in with habit-framed copy (*vendor*, [blog](https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/)).
4. **If the user taps "Agora não":** do not ask again for 7 days or 3 sessions.
5. **If the OS answer is "denied":** say so honestly (fixing N2) and offer "Abrir Ajustes" (`Linking.openSettings()`).
6. **Provisional authorization (iOS):** *not* recommended for the main reminder. Quiet delivery to Notification Center only defeats the purpose of a cue. Consider it only for users who never opted in, and even then it is optional.

**Benchmarks are vendor-only.** Airship's 2024 median opt-in rates were iOS 49.4% and Android 59.5% (*vendor*, [Airship 2025 report](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf)). OneSignal's Education category figures were Android 39.7% and iOS 37.1% (*vendor*). No peer-reviewed native-app opt-in data was found.

### 5.5 Example copy (pt-BR first)

Use "você"; write times as "6h30"; keep a calm tone, with no exclamation marks in reminders.

**Explanation screen**

| | pt-BR | en |
|---|---|---|
| Title | Um lembrete por dia, no seu momento com Deus | One reminder a day, at your quiet time |
| Body | Escolha um horário. Só avisamos quando houver versículos para revisar — nada de alarmes, nada de propaganda. Você pode desligar quando quiser. | Pick a time. We'll only nudge you when verses are due — no alarms, no promotions. Turn it off anytime. |
| Plan prompt | Quando e onde você costuma ter seu tempo devocional? (ex.: depois do café, na varanda) | When and where do you usually have your quiet time? (e.g. after coffee, on the porch) |
| Buttons | Ativar lembrete · Agora não | Turn on reminder · Not now |
| Denied | As notificações estão desativadas para este app. Para receber o lembrete, ative-as em Ajustes. [Abrir Ajustes] | Notifications are off for this app. To get the reminder, turn them on in Settings. [Open Settings] |
| Saved | Lembrete diário por volta das 6h30. | Daily reminder around 6:30 AM. |

**Daily reminder** (rotate the variants; `{n}` is the due count and `{ref}` the first due reference)

| # | pt-BR title / body | en title / body |
|---|---|---|
| 1 | Seu momento com a Palavra / {n} versículos para hoje, começando por {ref}. Leva uns 2 minutos. | Your time in the Word / {n} verses due today, starting with {ref}. About 2 minutes. |
| 2 | {ref} está pronto para revisão / Que tal recitá-lo agora, em voz alta? | {ref} is ready for review / Say it out loud now? |
| 3 | Hora do seu tempo devocional / {n} versículos esperando por você. Respire fundo e comece quando quiser. | Quiet time / {n} verses are waiting. Take a breath and begin when you're ready. |
| 4 (n = 1) | Um versículo para hoje / {ref}. Só um minutinho. | One verse today / {ref}. Just a minute. |
| 5 (with plan) | Depois do café, que tal? / {n} versículos para hoje, começando por {ref}. | After coffee, perhaps? / {n} verses today, starting with {ref}. |

**Other strings**

| | pt-BR | en |
|---|---|---|
| Action | Lembrar em 1 hora | Remind me in 1 hour |
| Adaptive-time suggestion (in-app, not a push) | Você costuma recitar por volta das {time}. Mover o lembrete para esse horário? [Mover] [Manter] | You usually recite around {time}. Move your reminder there? [Move] [Keep] |
| Back-off (in-app, on next open) | Pausamos os lembretes enquanto você esteve fora. Quer retomar? [Retomar] [Agora não] | We paused reminders while you were away. Resume? [Resume] [Not now] |
| Return after a lapse (in-app) | Que bom ter você de volta. Vamos começar com um versículo? | Good to have you back. Start with one verse? |

**Do not use:** "Não perca sua sequência!", "Você está atrasado!", "🔥 7 dias!", "Última chance". These are guilt or urgency framing, and conflict with PRODUCT.md's "Zero gaudy gamification … abrasive alarms".

---

## 6. Staged Plan

### Now (sprints 1–2, all S; nothing to install except the config-plugin entry)

| # | Work | Fixes | Depends on |
|---|---|---|---|
| R1 | **Reminder fix pack.** Add a new `quiet-time-v2` channel with `AndroidImportance.DEFAULT` and delete the old one. Report permission results honestly and offer "Abrir Ajustes". Cancel by id. Add the `expo-notifications` plugin (icon, colour) and `ios.bundleIdentifier`. Use pt-BR/en copy. | N1–N4, N6, N10 | — |
| R2 | **Due-aware rolling schedule** (§5.2): 14 `DATE` triggers, skip empty or finished days, back off after 7 ignored, `active` level. | N4, N8 | `VerseEngine` due forecast |
| R3 | **Tap goes to the review queue**: scheme, response listener, cold-start handling. | N5 | Prior note P1 (scheme), E-R2 (queue) |
| R4 | **Permission flow** (§5.4): explanation screen, time picker and when-and-where plan, shown after the first successful recitation. | N2 | R1 |
| R5 | **On-device counters** for the metrics below, plus a decision on opt-in telemetry (§8 Q4). | — | — |

### Next (1–3 months, M each)
- **iOS widget** with `expo-widgets`: a small and Lock Screen due count with the streak, then the interactive flash card. It also shows up in StandBy and on the Mac. Mark the flash card as disfavoured in CarPlay.
- **Android widget** with `react-native-android-widget` 0.22.x, or `expo-widgets` once SDK 58 is stable.
- **Siri App Shortcuts:** "Revisar meus versículos no ‹App›" (opens the queue) and "Quantos versículos tenho hoje no ‹App›" (spoken answer, no app launch). Both can be assigned to the Action Button. Write them as Swift in the app target now, or use `expo-app-intents` after SDK 58 is stable.
- **Android launcher shortcut** (`expo-quick-actions`) and an optional **"Adicionar ao calendário"**.
- **Adaptive-time suggestion** (§5.2) and copy rotation.

### Later (3–12 months, each gated)
- **A hands-free, screen-off session** is the gate for everything in this stage (prior note P8).
  - Once it exists: an iOS Live Activity, which then appears automatically on the Watch Smart Stack and the CarPlay Dashboard, and an Android microphone foreground-service notification.
- **CarPlay voice-based conversational entitlement request.** Go ahead only if the hands-free loop shows good retention and the product owner is comfortable with reciting while driving (§8).
- **Apple Watch companion** (complication plus dictation recite). Go ahead only if a meaningful share of active users wear a watch, measured with a one-question in-app survey.
- **Spotlight entity indexing**, once Siri AI supports Portuguese.

### Never / not now
Android Auto; WhatsApp Business API reminders; email digests; Alexa / Nest; Google App Actions; a Wear OS app; Focus filters; Time Sensitive notifications.

### Metrics

There is no backend (ADR 0002), so all of these are on-device counters unless opt-in telemetry is approved. **Targets are proposals (inference).** The only external opt-in benchmarks are vendor figures.

| Metric | Definition | Proposed target or guardrail |
|---|---|---|
| Opt-in rate | Granted ÷ explanation screens shown, per OS | ≥ 60%. Vendor medians are iOS 49.4% and Android 59.5% (Airship, *vendor*), and in-context prompts should beat them. |
| Prompt decline rate | "Agora não" ÷ explanation screens | Watch only |
| Reminder → review conversion | Review sessions started ≤ 60 min after a reminder fired ÷ reminders fired. iOS does not tell a closed app when a notification is delivered, so a reminder counts as *fired* when its scheduled time has passed and it was not cancelled by id. | Baseline first. Bell 2023 measured the next-hour window. |
| Tap-through | Notification taps ÷ reminders fired | Baseline first |
| Daily review adherence | Days with all due verses reviewed ÷ days with ≥ 1 due verse (rolling 28 days) | +10 pp vs. the pre-R2 baseline |
| Overdue backlog | Median days overdue across due verses | Should fall after R2/R3 |
| Reminder disable or revoke rate | Users turning the reminder off or revoking permission within 30 days ÷ opted-in users | ≤ 15%. This is the guardrail for fatigue. |
| Widget adoption and taps (Next) | Users with a widget; widget taps → review | Baseline first |
| Siri / shortcut invocations (Next) | Intent runs per weekly active user | Baseline first |

---

## 7. Corrections to the Prior Research Note

These are corrections to `feature-and-improvement-opportunities.md` §4 ("Expo SDK 57 / Platform Capabilities") and its recommendation table.

| # | Prior claim | What is true on 2026-10-08 (source) |
|---|---|---|
| 1 | Live Activities: "your app needs to be in the foreground to start a Live Activity" | **Incomplete.** Apple says "In general", then lists three other ways: a `LiveActivityIntent` while in the background (for example from a Control Center control); push-to-start (iOS 17.2, needs a server); and a scheduled start date (iOS 26) ([ActivityKit](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities), *re-fetched*). |
| 2 | "No maintained React Native CarPlay library supports Expo." `react-native-carplay`: "No Expo support due to Scenes", last publish in 2024. | **Outdated.** The `react-native-carplay` facts are correct (latest `2.4.1-beta.0`, 2024-06-12). But `@iternio/react-native-auto-play` 0.8.1 (2026-10-02, MIT) documents Expo SDK 57 setup and CarPlay voice input through `CPVoiceControlTemplate`. It is pre-1.0, navigation-centric, and needs Xcode 27 (§3.6). |
| 3 | P3 / §1.2 #8: widgets "also show up in CarPlay on iOS 26 with no CarPlay entitlement", presented as a benefit | **True but overstated.** In CarPlay, a widget "can only launch your app … if your app is also a CarPlay app". A widget whose "primary purpose is to launch your app" is "non-functional in CarPlay" and should be marked disfavoured (CarPlay Developer Guide). Only the glanceable count widget has value in the car. |
| 4 | P9: CarPlay "voice-based conversational" app; "Apple's rules … fit the use case"; the 26.4 version was quoted only from the PDF | **Re-verified and sharpened.** The entitlement table lists `com.apple.developer.carplay-voice-based-conversation`, iOS 26.4. The decisive rule was missing: "recording is not supported while in CarPlay", except for navigation and voice-based conversational apps, "only in conjunction with the voice control template". So an *audio-app* framing can never include recitation. |
| 5 | "Android Auto has no voice or conversational category. Categories are media, messaging, calling (labs), navigation, POI, IoT and weather." | **The conclusion stands, but the list is incomplete.** It also has templated messaging (labs) and parked-only video (AAOS), games and browsers (labs). It missed the biggest risk: "If your app does not meet the car requirements … **No** … Any subsequent updates are not available for distribution until the app is approved" ([car app quality](https://developer.android.com/docs/quality-guidelines/car-app-quality), *re-fetched*). `CarAudioRecord` exists for in-app assistants, but only inside the allowed categories. |
| 6 | "Exact Android alarms need `SCHEDULE_EXACT_ALARM`" | **Incomplete.** `expo-notifications` silently falls back to the inexact `setAndAllowWhileIdle` (source, *re-fetched*), which can fire up to about an hour late on Android 12+. Play allows `USE_EXACT_ALARM` only for alarm/timer and calendar apps. The recommendation is to accept inexact timing. |
| 7 | P2: reminder actions "Recite now" (opens the queue) and "Later (1 h)" | **Revise.** The HIG says "Avoid providing an action that merely opens your app", so make the *tap* deep-link instead. "Later" with `opensAppToForeground: false` does not fire its JS listener if the app was killed (Expo types). Ship it only after device testing. |
| 8 | §7 engineering findings (E4) covered only i18n and the always-"due" text | **Missed bugs:** the Android channel is silent, because raw `4` is Expo `LOW` (N1). The modal reports success when permission is denied (N2). `cancelAll…` would wipe future notifications (N3). |
| 9 | "Apple Watch: needs a native watchOS target" | **True for apps and complications, but incomplete.** Notifications are forwarded with no watch app. iPhone Live Activities reach the Smart Stack (since the June 2024 HIG). **No Speech-framework API exists on watchOS**, so on-watch recitation needs dictation or an audio relay (§3.4, *re-fetched*). |
| 10 | P10: Siri via `expo-app-intents` (SDK 58, alpha), "M after SDK 58 GA" | **Confirmed and extended.** SDK 58 is still beta (npm `next` 58.0.6). `expo-app-intents@0.5.3` depends on `@expo/ui ^58.0.14`, so it cannot be used on SDK 57. Only *primary* schema domains reach Apple Intelligence, and none fits, so App Shortcut phrases are the route. Siri AI is English-only until Portuguese ships "next month" (§3.8). |
| 11 | P3: "Android: wait for SDK 58 or use `react-native-android-widget`" | **Still right.** SDK 58 is not stable on 2026-10-08. `react-native-android-widget` v0.22.1 (2026-08-17, MIT) is active. `@bacons/apple-targets` 5.0.0 is the SDK 55 line, and its SDK 57 support is a draft PR. |
| 12 | `expo-widgets` is iOS-only on v57, isolated runtime, interactive widgets iOS 17+ | **Confirmed** (*re-fetched*: `platforms: ['ios']`). New detail: prebuild fails without `ios.bundleIdentifier`, which `app.json` lacks (N6). |

---

## 8. Open Questions for the Product Owner

1. **App name.**
   - Siri phrases must contain the app name, and Apple DTS reports trouble with accented names.
   - What is the final, speakable name in pt-BR and en?
   - Can the display name avoid accents (or offer a non-accented synonym)?
2. **Hands-free commute mode.** Is a screen-off, earbuds-only review session on the roadmap (prior note P8)? It gates Live Activities, CarPlay and most of the Watch value.
3. **Reciting while driving.** Are you comfortable positioning the app for use in the car? Apple's approval is discretionary, the CarPlay icon is visible to everyone once enabled, and there is a reputational angle.
4. **Measurement.** With no backend, the §6 metrics stay on the device. Do you accept opt-in, anonymous telemetry (with LGPD consent), or only an on-device "insights" view?
5. **Lock-screen privacy.**
   - The notification reveals religious practice, which is LGPD-sensitive data.
   - Should the verse reference be shown by default (recommended: yes, with a toggle)?
   - Should verse text ever appear?
6. **Days with nothing due.** Stay completely silent (recommended), or allow an optional weekly "adicionar um novo versículo?" nudge? That second kind is closer to engagement or marketing, and needs separate consent.
7. **Minimum iOS version.** It is currently 16.4 through SDK 57. Interactive widgets need iOS 17, Control Center controls iOS 18, and `supportedModes` iOS 26. Raise the minimum to iOS 17?
8. **SDK 58 timing.** Wait for SDK 58 stable (Android `expo-widgets`, `expo-app-intents`), or ship now with `react-native-android-widget` and hand-written Swift intents?
9. **WhatsApp.** Is a manually posted "versículo da semana" Channel something the team would run? It is a growth channel, not a reminder.
10. **Apple developer account owner.** Is it a legal entity? CarPlay entitlement requests and the prior note's 5.1.1(ix) question both depend on it.

---

## 9. Sources

**Access dates and source notes**
- All pages were accessed on **2026-10-08**. Policy and pricing pages change, so re-check them before quoting externally.
- Apple documentation was read through its DocC JSON feeds (`developer.apple.com/tutorials/data/documentation/…json`).
- GitHub and npm data come from `gh api` and `registry.npmjs.org`.

**App code** (this repository): `src/services/ReminderService.ts`, `src/components/ReminderSettingsModal.tsx`, `src/screens/HomeScreen.tsx`, `src/utils/deckSharing.ts`, `App.tsx`, `app.json`, `package.json`. Prior note: `docs/research/feature-and-improvement-opportunities.md`.

**Apple: notifications and review**
- UNNotificationInterruptionLevel (passive / active / timeSensitive / critical) — <https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel>
- Asking permission to use notifications — <https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications>
- UNAuthorizationOptions.provisional — <https://developer.apple.com/documentation/usernotifications/unauthorizationoptions/provisional>
- Declaring actionable notification types — <https://developer.apple.com/documentation/usernotifications/declaring-your-actionable-notification-types>
- UNNotificationCategory — <https://developer.apple.com/documentation/usernotifications/unnotificationcategory>
- UNNotificationAttachment — <https://developer.apple.com/documentation/usernotifications/unnotificationattachment>
- UNNotificationContentExtension — <https://developer.apple.com/documentation/usernotificationsui/unnotificationcontentextension>
- relevanceScore — <https://developer.apple.com/documentation/usernotifications/unmutablenotificationcontent/relevancescore>
- UILocalNotification (deprecated; the 64-notification limit) — <https://developer.apple.com/documentation/uikit/uilocalnotification>
- Supported capabilities (Time Sensitive) — <https://developer.apple.com/help/account/reference/supported-capabilities-ios>
- HIG Notifications — <https://developer.apple.com/design/human-interface-guidelines/notifications>
- HIG Managing notifications — <https://developer.apple.com/design/human-interface-guidelines/managing-notifications>
- App Store Review Guidelines (last updated June 8, 2026) — <https://developer.apple.com/app-store/review/guidelines/>
- WWDC21 10091, Send communication and Time Sensitive notifications — <https://developer.apple.com/videos/play/wwdc2021/10091/>

**Apple: widgets, Live Activities, CarPlay, watchOS, Speech**
- WidgetKit: keeping a widget up to date — <https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date>
- WidgetKit: adding interactivity — <https://developer.apple.com/documentation/widgetkit/adding-interactivity-to-widgets-and-live-activities>
- WidgetKit: creating controls — <https://developer.apple.com/documentation/widgetkit/creating-controls-to-perform-actions-across-the-system>
- WidgetKit: StandBy and CarPlay support — <https://developer.apple.com/documentation/widgetkit/adding-standby-and-carplay-support-to-your-widget>
- HIG Widgets — <https://developer.apple.com/design/human-interface-guidelines/widgets>
- ActivityKit: displaying live data — <https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities>
- ActivityKit: pushToStartToken — <https://developer.apple.com/documentation/activitykit/activity/pushtostarttoken>
- ActivityKit: push notifications — <https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications>
- HIG Live Activities — <https://developer.apple.com/design/human-interface-guidelines/live-activities>
- CarPlay Developer Guide, June 2026 (rev. 2026-06-08) — <https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf>
- CarPlay developer page — <https://developer.apple.com/carplay/>
- HIG CarPlay — <https://developer.apple.com/design/human-interface-guidelines/carplay>
- watchOS notifications — <https://developer.apple.com/documentation/watchos-apps/notifications>
- watchOS notification forwarding — <https://developer.apple.com/documentation/watchos-apps/taking-advantage-of-notification-forwarding>
- Converting a ClockKit app (75 updates/day) — <https://developer.apple.com/documentation/widgetkit/converting-a-clockkit-app>
- Widget suggestions in Smart Stacks — <https://developer.apple.com/documentation/widgetkit/widget-suggestions-in-smart-stacks>
- SFSpeechRecognizer — <https://developer.apple.com/documentation/speech/sfspeechrecognizer>
- SpeechAnalyzer — <https://developer.apple.com/documentation/speech/speechanalyzer>
- SpeechTranscriber — <https://developer.apple.com/documentation/speech/speechtranscriber>
- DictationTranscriber — <https://developer.apple.com/documentation/speech/dictationtranscriber>
- presentTextInputController — <https://developer.apple.com/documentation/watchkit/wkinterfacecontroller/presenttextinputcontroller(withsuggestions:allowedinputmode:completion:)>
- AVAudioRecorder — <https://developer.apple.com/documentation/avfaudio/avaudiorecorder>
- WCSession.transferFile — <https://developer.apple.com/documentation/watchconnectivity/wcsession/transferfile(_:metadata:)>
- HIG Virtual keyboards — <https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards>
- Apple iOS feature availability (CarPlay, Siri, Dictation, Siri AI by country and language) — <https://www.apple.com/ios/feature-availability/>

**Apple: App Intents, Siri, Action Button**
- App Shortcuts — <https://developer.apple.com/documentation/appintents/app-shortcuts>
- HIG App Shortcuts — <https://developer.apple.com/design/human-interface-guidelines/app-shortcuts>
- HIG Action button — <https://developer.apple.com/design/human-interface-guidelines/action-button>
- OpenIntent — <https://developer.apple.com/documentation/appintents/openintent>
- supportedModes — <https://developer.apple.com/documentation/appintents/appintent/supportedmodes>
- App schema domains — <https://developer.apple.com/documentation/appintents/app-schema-domains>
- Apple Intelligence and Siri AI — <https://developer.apple.com/documentation/appintents/apple-intelligence-and-siri-ai>
- Focus filters — <https://developer.apple.com/documentation/appintents/focus>
- WWDC22 10170 — <https://developer.apple.com/videos/play/wwdc2022/10170/>
- WWDC23 10102 — <https://developer.apple.com/videos/play/wwdc2023/10102/>
- Developer forum thread 838210 (accented app names; DTS reply) — <https://developer.apple.com/forums/thread/838210>
- Apple Newsroom, Sep 14 2026, Siri AI (marketing) — <https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/>
- Apple Newsroom, Jun 8 2026, Siri AI (marketing) — <https://www.apple.com/newsroom/2026/06/apple-introduces-siri-ai-a-profoundly-more-capable-and-personal-assistant/>
- Action Button support article — <https://support.apple.com/en-us/105103>

**Android and Google Play**
- Notification runtime permission — <https://developer.android.com/develop/ui/views/notifications/notification-permission>
- Notification channels — <https://developer.android.com/develop/ui/views/notifications/channels>
- Schedule exact alarms (Android 14 change) — <https://developer.android.com/about/versions/14/changes/schedule-exact-alarms>
- Alarms guide — <https://developer.android.com/develop/background-work/services/alarms>
- Play policy: Exact Alarm Permission (accessed 2026-10-08) — <https://support.google.com/googleplay/android-developer/answer/16558241>
- Play policy: system functionality and notifications (accessed 2026-10-08) — <https://support.google.com/googleplay/android-developer/answer/9969861>
- AOSP AlarmManagerService (500 alarms per UID) — <https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/apex/jobscheduler/service/java/com/android/server/alarm/AlarmManagerService.java>
- Live Updates — <https://developer.android.com/develop/ui/views/notifications/live-update>
- Android 16 progress-centric notifications — <https://developer.android.com/about/versions/16/features/progress-centric-notifications>
- Foreground service types — <https://developer.android.com/develop/background-work/services/fgs/service-types>
- Glance releases — <https://developer.android.com/jetpack/androidx/releases/glance>
- App widgets, advanced — <https://developer.android.com/develop/ui/views/appwidgets/advanced>
- Widget quality — <https://developer.android.com/docs/quality-guidelines/widget-quality>
- Android for Cars (updated 2026-09-22) — <https://developer.android.com/training/cars>
- Car app quality guidelines (updated 2026-09-14) — <https://developer.android.com/docs/quality-guidelines/car-app-quality>
- Media apps for cars — <https://developer.android.com/training/cars/media>
- Car microphone (CarAudioRecord) — <https://developer.android.com/training/cars/apps/library/car-microphone>
- Communicate with the app by voice — <https://developer.android.com/design/ui/cars/guides/ux-requirements/communicate-app-by-voice>
- Wear OS notification bridging — <https://developer.android.com/training/wearables/notifications/bridger>
- Wear OS tiles — <https://developer.android.com/training/wearables/tiles/get_started>
- Wear OS 7 features — <https://developer.android.com/training/wearables/versions/7/features>
- Wear Widgets migration — <https://developer.android.com/training/wearables/widgets/migration>
- Wear OS voice input — <https://developer.android.com/training/wearables/user-input/voice>
- Assistant Conversational Actions sunset — <https://developers.google.com/assistant/ca-sunset>
- App Actions overview — <https://developer.android.com/develop/devices/assistant/overview>
- OPEN_APP_FEATURE built-in intent — <https://developers.google.com/assistant/app/reference/built-in-intents/common/open-app-feature>
- AppFunctions — <https://developer.android.com/ai/appfunctions>
- Android shortcuts — <https://developer.android.com/develop/ui/compose/system/shortcuts>
- Google blog, Assistant → Gemini on mobile (Mar 2025) — <https://blog.google/products-and-platforms/products/gemini/google-assistant-gemini-mobile/>
- Calendar provider (insert intent) — <https://developer.android.com/guide/topics/providers/calendar-provider>

**Expo and React Native**
- expo-notifications v57 — <https://docs.expo.dev/versions/v57.0.0/sdk/notifications/>
- expo-notifications sdk-57 source — <https://github.com/expo/expo/tree/sdk-57/packages/expo-notifications>
- expo-widgets v57 — <https://docs.expo.dev/versions/v57.0.0/sdk/widgets/>
- expo-app-intents v58 (alpha) — <https://docs.expo.dev/versions/v58.0.0/sdk/app-intents/>
- expo-calendar v57 — <https://docs.expo.dev/versions/v57.0.0/sdk/calendar/>
- SDK 56 changelog — <https://expo.dev/changelog/sdk-56>
- SDK 57 changelog — <https://expo.dev/changelog/sdk-57>
- SDK 58 beta changelog — <https://expo.dev/changelog/sdk-58-beta>
- EAS app extensions — <https://docs.expo.dev/build-reference/app-extensions/>
- EAS iOS capabilities — <https://docs.expo.dev/build-reference/ios-capabilities/>
- npm registry (`expo`, `expo-widgets`, `expo-app-intents`, `react-native-carplay`) — <https://registry.npmjs.org/>
- React Native out-of-tree platforms — <https://reactnative.dev/docs/out-of-tree-platforms>
- React Native Share — <https://reactnative.dev/docs/share>

**Libraries** (GitHub; latest release and licence as stated in the body)
- `react-native-carplay` — <https://github.com/birkir/react-native-carplay>
- `@iternio/react-native-auto-play` — <https://github.com/Iternio-Planning-AB/react-native-auto-play>
- `@bradford-tech/expo-carplay` — <https://github.com/bradford-tech/expo-carplay>
- `@bacons/apple-targets` — <https://github.com/EvanBacon/expo-apple-targets>; SDK 57 draft PR #210 — <https://github.com/EvanBacon/expo-apple-targets/pull/210>
- `react-native-android-widget` — <https://github.com/sAleksovski/react-native-android-widget>
- `expo-live-activity` (archived) — <https://github.com/software-mansion-labs/expo-live-activity>
- `react-native-watch-connectivity` — <https://github.com/watch-connectivity/react-native-watch-connectivity>
- `react-native-wear-connectivity` — <https://github.com/fabOnReact/react-native-wear-connectivity>

**WhatsApp, email, LGPD, calendar standards**
- Template categorization (updated Sep 15, 2026) — <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization>
- WhatsApp pricing (updated Sep 30, 2026) — <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
- WhatsApp rate calculator (Brazil rates read 2026-10-08) — <https://whatsappbusiness.com/products/platform-pricing/>
- Per-user marketing limits — <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits/>
- WhatsApp Business Messaging Policy (updated Sep 23, 2026) — <https://whatsappbusiness.com/policy/>
- WhatsApp Channels FAQ — <https://faq.whatsapp.com/549900560675125/?locale=en_US>
- WhatsApp click-to-chat FAQ — <https://faq.whatsapp.com/5913398998672934/?locale=en_US>
- Gmail sender guidelines — <https://support.google.com/a/answer/81126?hl=en>
- Yahoo sender best practices — <https://senders.yahooinc.com/best-practices/>
- RFC 8058 — <https://www.rfc-editor.org/rfc/rfc8058>
- RFC 5545 — <https://www.rfc-editor.org/rfc/rfc5545>
- Amazon SES pricing — <https://aws.amazon.com/ses/pricing/>
- LGPD, Lei 13.709/2018 — <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>
- EventKit: accessing the event store — <https://developer.apple.com/documentation/eventkit/accessing-the-event-store>

**Smart speakers**
- Alexa deprecated features — <https://developer.amazon.com/en-US/docs/alexa/ask-overviews/deprecated-features.html>
- Alexa skill languages — <https://developer.amazon.com/en-US/docs/alexa/custom-skills/develop-skills-in-multiple-languages.html>
- Alexa in Brazil, Oct 2, 2019 (press) — <https://press.aboutamazon.com/2019/10/alexa-and-amazon-echo-now-available-in-brazil>

**Peer-reviewed** (DOIs resolved by sub-agent; the two marked *re-fetched* were re-checked in Europe PMC)
- Bell et al. (2023), JMIR mHealth uHealth — <https://doi.org/10.2196/38342> (*re-fetched*)
- Nobbe et al. (2024), npj Science of Learning — <https://doi.org/10.1038/s41539-024-00253-7> (*re-fetched*)
- Klasnja et al. (2019), Annals of Behavioral Medicine — <https://doi.org/10.1093/abm/kay067>
- Bidargaddi et al. (2018), JMIR mHealth uHealth — <https://doi.org/10.2196/10123>
- Morrison et al. (2017), PLoS ONE — <https://doi.org/10.1371/journal.pone.0169162>
- Alkhaldi et al. (2016), JMIR — <https://doi.org/10.2196/jmir.4790>
- Vervloet et al. (2012), JAMIA — <https://doi.org/10.1136/amiajnl-2011-000748>
- Stawarz, Cox & Blandford (2015), CHI — <https://doi.org/10.1145/2702123.2702230>
- Renfree et al. (2016), CHI EA — <https://doi.org/10.1145/2851581.2892495>
- Lally et al. (2010), EJSP — <https://doi.org/10.1002/ejsp.674>
- Gollwitzer & Sheeran (2006), Adv. Exp. Soc. Psych. — <https://doi.org/10.1016/S0065-2601(06)38002-1>
- Breitwieser et al. (2023), Computers & Education — <https://doi.org/10.1016/j.compedu.2023.104879>
- Bälter et al. (2023), JMIR Formative Research — <https://doi.org/10.2196/43977>
- Pielot et al. (2017), IMWUT — <https://doi.org/10.1145/3130956>
- Kushlev, Proulx & Dunn (2016), CHI — <https://doi.org/10.1145/2858036.2858359>
- Fitz et al. (2019), Computers in Human Behavior — <https://doi.org/10.1016/j.chb.2019.07.016>
- Markum & Toyama (2020), CHI — <https://doi.org/10.1145/3313831.3376356>
- Laird et al. (2024), Journal of Religion and Health (company-affiliated) — <https://doi.org/10.1007/s10943-024-02004-9>
- Yancey & Settles (2020), KDD (Duolingo authors) — <https://doi.org/10.1145/3394486.3403351>
- Elbitar et al. (2021), USENIX Security — <https://www.usenix.org/system/files/sec21-elbitar.pdf>

**Vendor and secondary** (labelled where used)
- Airship 2025 push benchmarks (*vendor*) — <https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf>
- OneSignal 2024 benchmarks (*vendor*) — <https://onesignal.com/mobile-app-benchmarks-2024>
- Duolingo blog, habit-framed opt-in copy (*vendor*) — <https://blog.duolingo.com/putting-in-work-the-habit-of-language-learning/>
- AppleInsider, ChatGPT on CarPlay (*secondary*) — <https://appleinsider.com/articles/26/03/31/openais-chatgpt-now-available-hands-free-via-carplay-with-ios-264>
- Mobile Time / Opinion Box, WhatsApp in Brazil (*secondary*) — <https://www.mobiletime.com.br/noticias/09/06/2026/whatsapp-super-panorama/>
- StatCounter, Brazil mobile OS share (*secondary*, search snippet only, page unreachable) — <https://gs.statcounter.com/os-market-share/mobile/brazil>
