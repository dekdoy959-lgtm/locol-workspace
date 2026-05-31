# LOCOL Workspace — Multi-Agent Review Findings

> รันโดย 14-agent workflow (4 reviewers → 4 verifiers → 4 smoke testers → synthesizer → UX/polish)
> Raw findings: **178** จาก reviewers → **159** ผ่าน cross-verify (≥2 agents) → **+83** จาก smoke test → **242 confirmed**
> Synthesized + deduped เป็น: **10 must-fix · 48 should-fix · 49 nice-to-have · 15 polish ideas**

สถานะ: `✅` = แก้แล้ว (Sprint 1+2, commits a093a14/004bae8/b2866d9) · `🔲` = ยังไม่แก้ · `⏳` = แก้บางส่วน

---

## 📈 PROGRESS LOG (post-Sprint, bench-based)

> ทำงานต่อเป็น "Bench" เรียงตามผลกระทบ × ความเสี่ยง · build เขียว + push ทุก batch

**✅ SHOULD-FIX ครบแล้ว** (รอบ should-fix sweep — `3a685b8`→`c6aee66`): นอกจากที่ทำใน Bench 1-3 แล้ว เก็บที่เหลือ:
#23 Discord trip category · #31 unique CSV filename · #9 NotificationBell respect alert prefs · #41 traveler picker touch · #35 notification N+1 cache + rate limit · #34 incoming relation inverse label + two-way delete warning · #25 settings #alerts anchor + functional commitment_overdue toggle (bell แสดง overdue commitments) · #27 (subtitle เป็น '4 tracks' แล้ว · today-hover ทำใน #4 · ไม่มี dead span) · #18 N/A (URL input).
⏭️ เหลือเฉพาะ #26 unbounded fetches = ต้อง **pagination feature** (silent .limit() เสี่ยง drop rows — ไม่ทำแบบมักง่าย)

- **Bench 0 · Migrations** (`ad138e9`) — run 0009→0016→0017→0018 บน cloud (0009 ไม่เคยรัน + แก้ bug INSERT policy `using(true)`)
- **Bench 1 · Security + Data** (`a105bc3`, `b1a549d`) — ✅ should #11,13,14,20 · sec #10(mitigated) · nice #38,45
  - #6 calendar queryKey by user.id · #13 org roll-up by org_id · #14 duplicate copies people+team assignments · #20 discord restore ไม่ clobber status · #11 discord bucket private + signed URLs (migration 0018)
- **Bench 2 · Correctness** (`26afb2a`, `6d28cd6`, `1c2c842`) — ✅ should #5,15,16,17,19,32,36,37,39,40,42,43,44 (13/14)
  - #18 (avatar) = N/A: เป็น URL text input (`type="url"`) ไม่ใช่ file upload — premise ของ finding ไม่ตรงโค้ดจริง
- **Bench 3 · a11y + UX** — ⏳ ส่วนใหญ่เสร็จ (`a26a661`, `04ca935`, `6a632de`, `ed1a4e2`, `09ef115`, `eaf372f`, `69156ff`)
  - ✅ #47 Thai IME (MultiValueField stable keys) · #28 trip time inputs type=time · #29 budget variance · #21 nested button-in-Link · #48 delete onError · #30 AlertRow inert เมื่อ master off · #33 MergeContactsPage useMemo→useEffect
  - ✅ **#24 modal focus trap** — ConfirmModal: focus trap + Escape + role=dialog/aria-modal/aria-label + autofocus + focus-return
  - ✅ **#4 ConfirmModal** — วาง `ConfirmProvider` + `useConfirm()` (promise-based, mount ที่ root) แล้วแปลง **ครบทั้ง 14 จุด** window.confirm → modal (components + 5 ฟอร์ม + sub-components)
  - ✅ **#22 accessible names** — LLabel รับ htmlFor + LInput/LTextarea/LSelect fallback aria-label จาก placeholder (ทุกช่องมี accessible name โดยไม่ override label จริง); การ wire htmlFor ราย field เป็น follow-up
  - ✅ **#3 kanban keyboard a11y** — การ์ด focusable (tabIndex/role=button/aria-label ทั้ง 3 density) · Enter/Space เปิด · Ctrl/⌘+←/→ ย้าย track (mirror drag) + restore focus + green focus ring
  - **→ Bench 3 ครบทุกข้อที่ทำได้แล้ว** (เหลือเฉพาะ follow-up เล็ก: prompt 1 + alert 3 จุด, และ ⏭️ ข้าม #25/#27/#34/#46)
  - 🔲 follow-up เล็ก: window.prompt 1 จุด (duplicate-trip day-shift — ต้องมี input modal) + alert() 3 จุดใน mutation onError (ควรเป็น toast)
  - ⏭️ ข้าม (ไม่ใช่ bug ชัด): #25 commitment_overdue = feature ใหม่ (ต้องมี runner) · #27 '5 tracks' subtitle หาไม่เจอ · #34 relations incoming label ต้องมี reverse-label semantics · #46 /team nav = product decision
- **Bench 4 · Cleanup (nice-to-have)** — ⏳ ~26/49 (`88954a1` `4359fd0` `af85a0b` `8f82ab0` `f21ff25` `52a1be9` `9617631` `3ed41a6` `bea54d5` `3c0b36b`)
  - ✅ #4 (ลบ trackColors/statusColors dead) · #8 (Bench1 DiscordAttachment) · #9 teamById memo · #12 stale reviewer msg · #13 tier 'all' chip · #15 · #16 · #17/#41 today hover · #18 Feb29 · #19 online regex · #20 ICS disable · #21 l-fade-in keyframe · #22 MonthGrid key · #23 · #29 PriorityChip tooltip · #30 BottomNav safe-area · #32 initials · #34 void hacks · #35 ternary · #36 ellipsis · #37 name casing · #38 · #40 LAvatar · #42 Placeholder · #43 span · #44 comment · #45 · #46 OfflineBanner timer · #49 BottomNav useLocation
  - ✅ (รอบ user-decided) #1 plane icon · #6 z-index scale · #7 agenda newline · #10/#11 mig comments · #12 reviewer msg · #14 RuleEditor between · #24 form step · #26 login deco · #28 PDF page-break · #31 token by user.id · #33 full_name required · #47 (มีอยู่แล้ว) · #48 trip conflict badge — **~43/49**
  - ⏭️ #27 คงไว้ (print contrast — user เลือกไม่แก้)
  - ✅ **#5 hex → token เสร็จ** (`c31edc5` `674be80` `6aa7ef0`) — เพิ่ม semantic tokens (danger/warn/olive/greenBg/discord) + replace hex ทุกจุดนอก tokens.ts (quoted · JSX props · compound border strings · 251 modules build เขียว)
  - ⏳ **#2/#39 emoji → LIcon** (`eabeed7` `13f0eb7`): icon foundation + verified workflow พร้อม
    - ✅ เพิ่ม pin/camera/palette เข้า LIcon · **verify ใน browser** (temp /icon-test → DOM ยืนยัน geometry → ลบ route)
    - ✅ swap **~33 จุด** functional emoji → LIcon ทั่ว UI + Brief PDF (`13f0eb7`→`d9d58dc`): 📍→pin · ✈→plane · 👤→user · 👥→users · 💰→money · 🔔→bell · 📅→cal · 🎯→target · 📋→doc · 📊→graph · เพิ่ม icon prop ให้ Brief Section (cal/pin/users/palette/plane)
    - ✅ verify: 3 icon ใหม่ DOM-checked + app run healthy หลัง HMR ทุก change + build เขียวทุก commit
    - 🔲 **เหลือ (ไม่ทำ — เหตุผลชัด):** (a) mixed-group ที่บาง emoji ไม่มี icon (🔥🌐🚗 ใน CalendarPage smart sections → swap บางตัวจะปน) · (b) tab/chip ที่สีเปลี่ยนตาม active state (icon สีคงที่จะไม่ตาม) · (c) data form-field labels (เก็บ emoji ได้) · (d) decorative 💡🙏⭐🎉🐄☕🎂 (เก็บไว้)
    - 💡 วิธี verify: `preview_start` dev → temp public route render icon → `preview_eval` เช็ค getBoundingClientRect/children (screenshot tool เพี้ยนเป็นเส้นบาง ใช้ eval แทน)
  - ✅ **#3 chip labels:** ตรวจแล้ว — chip/option labels เป็นอังกฤษอยู่แล้ว (T1·Inner, Strong/Bridge/Weak, VVIP/Speaker, High, CAPTURE, STALE); Thai อยู่แค่ subtitle/help ซึ่งถูกต้องสำหรับ Thai UI → ไม่ต้องแก้
  - **→ ทุก decision ที่ user อนุมัติ (16 ข้อ) ทำครบ/addressed แล้ว** · #5 hex sweep ครบทั้ง semantic family ใหม่ + token เดิม
  - เก่า (subjective ที่ยังไม่ถาม): —
    - **subjective/design:** #2 emoji vs LIcon · #3 Thai/Eng chip · #5 hardcoded hex → tokens · #6 z-index scale · #24 form step '4→4.5→5' · #26 Login deco · #27 print brand color (อาจตั้งใจเพื่อ contrast) · #39 emoji headings mono
    - **ต้อง asset/feature:** #1 trip plane icon (ต้องวาด SVG ใน LIcon) · #47 Brief PDF trip team section · #28 Brief PDF page-break trip table · #48 trip same-day CONFLICT badge
    - **อ่านลึก/by-design:** #7 agenda \n · #14 RuleEditor between pre-fill · #25 LocalItineraryEditor (by-design: edit ใช้ TripItinerary) · #31 provider token leak · #33 TeamPage delete full_name warn
    - **doc-only:** #10/#11 migration RLS/rollback comments · #5/#6 token migration sweep
- **Bench 5 · Polish (animation)** — ✅ **15/15 ครบ!** (`c2e48a5`→`3681fde`) · ปรัชญา "calm choreography" · ทุก animation gated หลัง prefers-reduced-motion + verified ใน browser
  - ✅ #1 count-up · #2 View Transitions · #3 stagger kanban · #4 today pulse · #5 confetti ตอน Won · #6 save checkmark · #7 illustrated empty states (4 หน้า) · #8 hover lift · #9 skeletons · #10 bell bounce · #11 trip drag-reorder · #12 stage segmented pipeline · #13 mobile long-press sheet · #14 onboarding first-run tip · #15 track-stripe ink sweep
  - ⚠️ #11 drag / #13 long-press = logic+build verified แต่ **gesture UX ควร confirm hands-on ในเครื่องที่ login ได้** (headless preview login ไม่ได้)
  - 🛠 utils ใหม่: global.css l-skeleton/l-lift/l-rise/l-stagger/l-pulse-ring/l-bell-bounce/l-ink-sweep/l-slide-up · LSkeleton · LCountUp · LEmptyState · FirstRunTip · lib/confetti.ts · lib/viewTransition.ts

---

## 🔴 MUST-FIX (10) — ทั้งหมดแก้แล้ว ✅

| # | สถานะ | Effort | ปัญหา |
|---|---|---|---|
| 1 | ✅ | M | **Reminder email crash** — `alert_type='event_reminder'` ไม่อยู่ใน enum + entity_id ไม่ใช่ UUID → cron crash หรือ spam ส่งซ้ำ (แก้ด้วย migration 0016 + variant column) |
| 2 | ✅ | S | **Discord cancel** เขียน `relationship_status='inactive'` (ไม่อยู่ใน enum) → transaction abort (แก้เป็น 'archived' + onError) |
| 3 | ✅ | M | **Contact merge ทำลายข้อมูล** — RPC เก่าไม่ reassign opportunity_people → cascade delete (แก้ด้วย migration 0017 merge_contacts v2) |
| 4 | ✅ | S | **PII cache leak** — query cache (contacts/notes/calendar) ค้างใน localStorage ไม่ clear ตอน sign-out → user ถัดไปเห็น (แก้ใน AuthContext.signOut + dehydrate key) |
| 5 | ✅ | M | **Timezone off-by-one** — `toISOString().slice(0,10)` คำนวณ "วันนี้" ผิดใน Bangkok ก่อน 7 โมง/หลัง 5 โมง (25 sites · แก้ด้วย lib/dateUtil.ts) |
| 6 | ✅ | M | **owner_id ไม่ sync** — TeamAssignments กับ opportunities.owner_id แยกกัน (แก้ write-through ใน useCreateAssignment) |
| 7 | ✅ | M | **Realtime + pull-to-refresh ขาด** trip_stops + opportunity_team_assignments + ใช้ query key ผิด (แก้ใน useRealtimeSync + InboxPage) |
| 8 | ✅ | S | **Trip create swallow error** → orphan opp (มี error banner แล้วก่อนหน้านี้) |
| 9 | ✅ | M | **Track leftover** — stale 'act'/'contract' + 5-col grids เหลือ empty column (sweep 4 files) |
| 10 | ✅ | S | **iCal export พัง** — inclusive DTEND + double-escaped `\n` + UTF-8 mid-codepoint fold (แก้ทั้งหมด) |

---

## 🟡 SHOULD-FIX (48)

### แก้แล้ว ✅ (Sprint 1+2)
| # | ปัญหา |
|---|---|
| 1 | ⏳ Calendar TRIPS&EVENTS รวม trip-stop แล้ว (แต่ conflict badge ยังต้องเช็ค) |
| 2 | ✅ DELETE button → relabel "CANCEL" (มันแค่ cancel/archive ไม่ใช่ลบจริง) |
| 6 | ✅ TripBudgetCard race — refetch latest ก่อน save |
| 7 | ✅ Owner == Reviewer validation (two-person rule) |
| 8 | ✅ Briefing TEAM mode labels (MY → TEAM STALE ITEMS) |
| 12 | ⏳ Smart group empty rule ไม่ match ทุกคนแล้ว (แต่ list 0 members + cycle ยังไม่แก้) |
| 38 | ✅ Briefing responsive mobile (grid → single column) |

### ยังไม่แก้ 🔲

**Bugs / correctness:**
- 5 🔲 Trip data ซ้ำใน details + trip_stops — Brief PDF ขัดแย้งกันเอง (ต้องเลือก canonical source)
- 11 🔲 **Discord attachment bucket เป็น PUBLIC** — ใครมี path ก็อ่านได้ (security)
- 13 🔲 Org roll-up match by org NAME ไม่ใช่ org_id → rename แล้ว people list ว่าง
- 14 🔲 Duplicate trip ไม่ copy team assignments/people + ไม่ transactional
- 15 🔲 InboxSummary UPCOMING EVENTS bucket by due_date แต่ events เก็บใน details.event_date_start
- 16 🔲 navigate() ถูกเรียกด้วย Google Calendar external URL → routing พัง
- 17 🔲 Track change ตอน edit ไม่ reset stage → invalid stage saved
- 18 🔲 Avatar upload รับไฟล์ทุก type/size + ทับของเก่า
- 19 🔲 useAllOpenCommitments define 2 ครั้ง · filter ต่าง · query key เดียวกัน
- 20 🔲 Discord cancel restore เขียน relationship_status='known' ทับของเดิมเสมอ
- 23 🔲 Discord category filter ไม่มี tab 'trip' → capture route ไป trip ไม่ได้
- 32 🔲 Form swallow enum error → โชว์ Postgres internals · track URL param ไม่ validate
- 36 🔲 Email โชว์ "stale threshold" ผิด (daysSinceUpdate-1 แทน threshold จริง)
- 37 🔲 Discord attachment shape ไม่ validate → crash ถ้า bot เขียนรูปแบบแปลก
- 39 🔲 InboxPage Focus tab counts ไม่นับ active filter chips
- 40 🔲 Brief PDF โชว์ event-only marketing fields ใน track=trip + raw stop_type enum
- 42 🔲 MilestonesPage โชว์ "NO TIER · 4" แต่ 0 rows (dangling milestones จาก contact ที่ลบ)
- 43 🔲 Milestone cache invalidate พึ่ง realtime — stale ถ้า socket หลุด
- 44 🔲 Contact CONTACT METHODS card ซ่อน socials/addresses ถ้า phone+email ว่าง

**a11y (accessibility):**
- 3 🔲 (L) Inbox kanban + card lists เข้าด้วย keyboard ไม่ได้ · drag-drop mouse-only พังเงียบบน mobile
- 4 🔲 window.confirm/alert/prompt ใช้ 13+ จุด ควรเป็น ConfirmModal
- 22 🔲 LLabel ไม่มี htmlFor · inputs ไม่มี id → screen reader อ่านไม่ associate
- 24 🔲 Modal ขาด focus trap / Escape / aria-modal / focus return (ConfirmModal, DayPanel, BottomNav drawer, UserMenu)

**Security:**
- 10 🔲 Google provider_token plaintext localStorage (⏳ clear ตอน signout แล้ว แต่ scope ตาม user.id ยังไม่ทำ)
- 45 🔲 alert_log ไม่มี select policy ให้ user audit alert ตัวเอง (⏳ migration 0016 เพิ่มแล้ว)

**UX / consistency:**
- 9 🔲 NotificationBell โชว์ cold/birthday/milestone ทั้ง workspace · ไม่เคารพ user_alert_prefs
- 21 🔲 nested `<button>` ใน `<Link>` ใน DiscordInboxPage → invalid HTML
- 25 🔲 Settings #alerts hash ไปไหนไม่ได้ · commitment_overdue pref มีใน DB แต่ไม่มี UI/runner
- 27 🔲 Calendar 'today' hover skip · '5 tracks' subtitle · dead span (track restructure polish)
- 28 🔲 TripItinerary date/time inputs ใช้ type=text → mobile keyboard ผิด
- 29 🔲 TripBudgetCard variance ซ่อนเมื่อ estimated=0 แม้ actual มี
- 30 🔲 Settings AlertRow toggles ยัง fire onChange แม้ master switch off
- 31 🔲 InboxTable archived filter hardcoded · CSV filename ชนกันวันเดียวกัน
- 33 🔲 MergeContactsPage init state ใน useMemo (anti-pattern)
- 34 🔲 RelationsSection incoming relations label ผิด · delete affect relation คนอื่นไม่เตือน
- 41 🔲 Trip per-stop traveler picker cramped บน mobile · ไม่ reset clean
- 46 🔲 Sidebar 'Goals' → /milestones · /team เข้าได้แค่ UserMenu บน desktop
- 47 🔲 MultiValueField ใช้ array index เป็น React key → IME focus หลุด (พิมพ์ไทยพัง)
- 48 🔲 Discord error UI โชว์ '[object Object]' · mutations ไม่มี onError

**Perf:**
- 26 🔲 (L) Unbounded full-table fetches หลาย hooks — perf cliff เมื่อ data เยอะ
- 35 🔲 Notification runner ไม่มี rate limit + N+1 queries

---

## 🟢 NICE-TO-HAVE (49)

### Design tokens / consistency
1. Trip card ใช้ 'cal' icon เหมือน event — แยกไม่ออก (ควรใช้ plane icon)
2. emoji vs LIcon ปนกัน — screen reader อ่าน emoji แปลก · ไม่ theme
3. Thai/English chip ปนกันไม่มีกฎ ('+ assign', 'CAPTURE', 'STALE')
4. trackColors/TrackKey/statusColors/fontSize/radius tokens เป็น dead code (ยัง act/contract ไม่มี trip)
5. hardcoded hex (#d96a66 etc.) ไม่ดึงจาก tokens → drift risk
6. z-index ไม่สม่ำเสมอ (modals 100/200/500 · dropdowns 1000 · banners 80/99/150)
7. agenda placeholder ใช้ \n ที่ HTML collapse เป็น space
8. Supabase storage URL ซ้ำ 3 components (ควร extract helper)
9. teamById/contactById สร้างนอก useMemo บาง render
10. Migration 0014/0015 RLS ใช้ 'to authenticated' ต่างจากที่อื่น
11. Migration 0013 rollback comment ไม่ครบ + lossy
12. error 'ยกเว้น Watch track' จะ stale ถ้ามี track noReviewer เพิ่ม
13. Tier filter chip null label 'TIER' ดูเหมือน section ไม่ใช่ปุ่ม
14. RuleEditor 'between' ไม่ pre-fill values
15. Note tag regex พลาด Thai hashtag (#เพื่อน highlight แค่ #) — ใช้ /[#@][\w฀-๿]+/gu
16. RelationshipGraph index รันทุก render ทั้ง table
17. Calendar month grid hover skip today
18. Birthday Feb 29 roll → Mar 1 ปีไม่อธิกสุรทิน (fire ผิดวัน)
19. Travel view 'online' regex พลาดไทย (ออนไลน์, ทางไกล)
20. Calendar EXPORT .ICS ไม่ disable เมื่อ 0 items
21. DayPanel backdrop ref keyframe undefined l-fade-in
22. MonthGrid cell key ใช้ iso+idx → remount ตอนเปลี่ยนเดือน
23. (ทำแล้ว) track-picker repeat(5,1fr)
24. Form step '4 → 4.5 → 5' ดู unfinished
25. LocalItineraryEditor ไม่ enable ใน edit mode
26. Login 'BRAND · 5 : 15 : 80' deco งง (designer note หลุด prod)
27. Print brand color #1a5800 แทน LOCOL green
28. Brief PDF page-break ไม่ครอบ trip-itinerary table rows
29. InboxTable PriorityChip H/M/L ไม่มี tooltip · colorblind อ่านไม่ได้
30. BottomNav 60px ถูก safe-area บีบ <44px บน iPhone home-bar
31. Provider token leak ถ้าไม่มี token ใหม่จาก getSession()
32. TeamPage initials .toUpperCase().slice(3) พังกับ Thai combining mark
33. TeamPage ลบ full_name ได้ไม่เตือน
34. InboxTable dead `void X;` imports
35. OpportunityPeople ternary ซ้ำ 'Audience' : 'Audience'
36. source_url .slice(60) ไม่มี ellipsis
37. ContactDetailPage บังคับ Latin name เป็น uppercase
38. Discord attachment img onError ซ่อน img แต่เหลือ empty `<a>`
39. Emoji headings render mono บน Linux/Windows
40. LAvatar default initials='JD' โชว์ placeholder ถ้าลืมส่ง
41. Calendar 'TODAY' cell exclude hover
42. Placeholder.tsx import ไม่มีที่ไหน — dead file
43. InboxSummary `<span display:none>{TRACKS.length}</span>` dead code
44. Timeline comment 'matches Contract track' (track ลบแล้ว)
45. useWideCalendarEvents cache key ไม่มี user id → leak ข้าม sign-in
46. OfflineBanner setTimeout pile-up เมื่อ toggle เร็ว
47. Brief PDF ไม่มี trip team assignments section
48. (ซ้ำ #1) Trip stops วันเดียวกันโชว์ ⚠ CONFLICT badge
49. BottomNav popstate dead listener (NavLink pushState ไม่ fire popstate)

---

## 🎨 POLISH IDEAS (15) — animation / micro-interaction

ปรัชญา designer: **"Calm choreography"** — ทุก state change ควรมี motion/color หนึ่งชิ้นบอก user ว่าเกิดอะไรขึ้น แล้วหายไป · ตอนนี้ LOCOL เงียบเกินไป (filter ไม่มี sweep · save ไม่มี ack · stage move ไม่มี celebration)

| # | Effort | Area | Idea | ทำไม |
|---|---|---|---|---|
| 1 | M | hero-stats | Briefing animated number counters + gradient orb | 2 วิแรกตอนเปิดเช้า ควรรู้สึก "app รู้ว่าฉันแคร์อะไร" |
| 2 | M | page-transition | View Transitions API card→detail (shared element morph) | รู้ว่ามาจากการ์ดไหน · กล้าคลิกสำรวจ |
| 3 | S | list-animation | Stagger-in kanban cards (30ms) ตอน first paint + filter | filter feedback · mask latency |
| 4 | S | calendar | 'Today' heartbeat pulse + day-cell hover preview | month view หนาแน่น · เน้น today |
| 5 | M | celebration | 🎉 Confetti + brand chime ตอน Apply opp = Won | grant ได้ = win หายาก · ควรมี reaction · screenshot ให้ investor |
| 6 | M | form-feedback | Inline save indicator + checkmark sweep | แก้ 8 fields ต้องเชื่อว่า server ได้ครบ |
| 7 | M | empty-state | Illustrated empty states (cattle/coffee motif) + 1-tap CTA | first impression สำหรับ user ใหม่ |
| 8 | S | hover-focus | Card lift + track-colored glow ring on hover | บอกว่า "คลิกได้" + ตอกย้ำ color system |
| 9 | S | loading-skeleton | Shimmer skeletons รูปทรง kanban card | perception of speed · ไม่ reflow |
| 10 | S | notification | Bell badge bounce + radial pulse on new unread | trip-day stand-up T-1 reminder |
| 11 | L | drag-drop | Trip itinerary stop reorder + auto-scroll + rubber-band | trip planning = most-edited surface |
| 12 | M | micro | Stage Select → segmented pipeline (ไม่ใช่ dropdown) | stage = the workflow · เห็น journey |
| 13 | M | mobile-gesture | Long-press contact card → context sheet quick actions | marketing on the road · field-CRM |
| 14 | L | onboarding | First-run coachmarks 4 tracks + Me/Team toggle | discoverability = 0 ตอนนี้ · high team turnover |
| 15 | S | micro | Track-stripe ink sweep 600ms ตอน tap track tab | track switching = orientation moment |

---

## 📋 แผน Sprint ที่แนะนำต่อ

**Sprint 3 (security + data — ควรทำก่อน):**
- #11 Discord bucket → private · #13 org roll-up by id · #14 duplicate transactional · #10 token scope by user · #45 alert_log policy

**Sprint 4 (a11y):**
- #4 ConfirmModal แทน window.* · #22 LLabel htmlFor · #24 modal focus trap · #3 keyboard kanban

**Sprint 5 (polish — เลือก quick wins ก่อน):**
- #9 skeletons · #3 stagger · #8 hover lift · #4 today pulse · #10 bell bounce · #5 confetti (signature moment)

**Cleanup pass (nice-to-have batch):**
- ลบ dead code (#42 Placeholder · #43 span · #34 void) · token migration (#4,#5) · Thai regex (#15 tags · #19 venue) · Feb29 birthday (#18)
