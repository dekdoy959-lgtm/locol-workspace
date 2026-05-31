# LOCOL Workspace — Bot Data Integration Spec

> สำหรับ AI Bot ที่ใส่ข้อมูลเข้า LOCOL Workspace (ถ่ายนามบัตร→Contact, อ่านข่าว/งานแข่ง→Opportunity ฯลฯ)
> **เป้าหมาย:** Bot ใส่ข้อมูลได้ **ครบทุก field** ไม่ใช่แค่บางส่วน
> Schema นี้ตรงกับ migrations 0001–0018 · เขียนผ่าน Supabase (`@supabase/supabase-js` หรือ REST/PostgREST)

---

## 0. ภาพรวม — Bot ทำอะไรได้บ้าง

| งาน | เขียนเข้า table | ผลลัพธ์ |
|---|---|---|
| ถ่ายนามบัตร / รู้จักคนใหม่ | `contacts` | สร้าง Contact |
| เจองานแข่ง/ทุน | `opportunities` (track=`apply`) | สร้าง Opportunity |
| เจอข่าว/บทความ | `opportunities` (track=`watch`) | บันทึกข่าวไว้ติดตาม |
| เจออีเวนต์/งานสัมมนา | `opportunities` (track=`event`) | สร้าง Event |
| วางแผนลงพื้นที่ | `opportunities` (track=`trip`) + `trip_stops` | สร้างทริป + จุดแวะ |
| เชื่อมคนกับงาน | `opportunity_people` | ใครจัด/ใครเข้าร่วม opportunity |
| มอบหมายทีมในงาน | `opportunity_team_assignments` | ทีม LOCOL คนไหนทำ role อะไร |
| บันทึกการติดต่อ | `interactions` | log ว่าคุยกับ contact เรื่องอะไร |
| โน้ต/เตือนความจำ | `notes` | โน้ตติดที่ contact/org/opp |
| สิ่งที่สัญญาไว้ | `commitments` | ใครติดอะไรใคร + due date |
| capture ดิบจาก Discord | `discord_inbox` | log การ capture (ก่อนแปลงเป็น contact/opp) |

**กฎสำคัญ:**
- ฟิลด์ที่ "structured ตาม track" ทั้งหมดเก็บใน `opportunities.details` (JSONB) — **นี่คือจุดที่ Bot มักใส่ไม่ครบ**
- `contacts` มี sub-data เป็น JSONB array (phones, emails, orgs, socials, addresses, education)
- ทุก timestamp/created_at มี default — ไม่ต้องใส่
- FK ที่ชี้ `team_members(id)` (owner_id ฯลฯ) = optional, ใส่เมื่อรู้คน

---

## 1. CONTACTS — สร้าง Contact

`insert into contacts (...)`

### ฟิลด์หลัก (top-level columns)
| field | type | required | ความหมาย / ค่า |
|---|---|---|---|
| `first_name` | text | **✅ ต้องมี** | ชื่อ |
| `last_name` | text | – | นามสกุล |
| `nick_name` | text | – | ชื่อเล่น |
| `suffix` | text | – | คำต่อท้าย (Jr., Ph.D.) |
| `bio` | text | – | คำอธิบายสั้น ๆ ว่าเป็นใคร |
| `birthday` | date | – | `YYYY-MM-DD` (ใช้แจ้งเตือนวันเกิด) |
| `tier` | smallint (1–3) | – | 1=Inner, 2=Active, 3=Wide |
| `tie_type` | enum | – | `Strong` / `Bridge` / `Weak` |
| `priority` | enum | – | `High` / `Medium` / `Low` |
| `relationship_status` | enum | – | `known` / `prospect` / `cold` / `archived` (default `prospect` แนะนำสำหรับคนใหม่จาก bot) |
| `freq_days` | int | – | ควรติดต่อทุกกี่วัน (ใช้เตือน cold contact) |
| `last_contact_date` | date | – | ติดต่อล่าสุดเมื่อไหร่ |
| `health` | text | – | สถานะความสัมพันธ์ (free text) |
| `channel` | text | – | ช่องทางหลัก: `Line`/`Email`/`Phone`/`Facebook Messenger`/`WhatsApp`/`WeChat`/`In Person`/`Other` |
| `met_story` | text | – | เจอกันได้ยังไง |
| `value_exchange` | text | – | เราแลกเปลี่ยนคุณค่าอะไรกัน |
| `tags` | text[] | – | `['founder','investor']` |
| `relation_types` | text[] | – | ประเภทความสัมพันธ์ (ดูข้อ 9) |
| `owner_id` | uuid | – | team_member ที่ดูแล |
| `custom_fields` | jsonb | – | `{}` field อื่น ๆ ตามใจ |

### Sub-data (JSONB arrays) — ใส่เป็น array ของ object
```jsonc
phones:    [{ "label": "Mobile", "value": "+66 81 234 5678" }]
           // label: Mobile | Work | Home | Other
emails:    [{ "label": "Work", "value": "somchai@farm.co.th" }]
           // label: Personal | Work | Other
socials:   [{ "platform": "Line", "handle": "@somchai", "url": null }]
           // platform: Line | Facebook | Instagram | LinkedIn | X (Twitter) | WhatsApp | WeChat | Other
addresses: [{ "label": "Work", "country": "Thailand", "province": "เชียงราย",
              "district": "เมือง", "sub_district": "เวียง", "postal_code": "57000", "street": "123 ม.4" }]
orgs:      [{ "org_id": null, "org_name": "ฟาร์มสมชาย", "role": "เจ้าของ",
              "start_date": null, "end_date": null, "is_current": true, "is_primary": true }]
           // org_id: ใส่ถ้า match กับ organization ที่มีอยู่แล้ว · ไม่งั้น null + org_name (free text)
education: [{ "school": "ม.เกษตร", "degree": "วท.บ. สัตวศาสตร์", "year": 2558 }]
```

### ตัวอย่าง insert จากนามบัตร
```jsonc
{
  "first_name": "สมชาย", "last_name": "ใจดี", "nick_name": "ชาย",
  "bio": "เจ้าของฟาร์มโคนม เชียงราย · สนใจ low-carbon",
  "relationship_status": "prospect", "tier": 2, "priority": "Medium",
  "channel": "Line",
  "phones": [{ "label": "Mobile", "value": "081-234-5678" }],
  "emails": [{ "label": "Work", "value": "somchai@farm.co.th" }],
  "socials": [{ "platform": "Line", "handle": "@somchai", "url": null }],
  "orgs": [{ "org_id": null, "org_name": "ฟาร์มใจดี", "role": "เจ้าของ", "is_current": true, "is_primary": true }],
  "tags": ["farmer", "เชียงราย"]
}
```

---

## 2. OPPORTUNITIES — สร้างงาน (4 tracks)

`insert into opportunities (...)`

### ฟิลด์หลัก (ทุก track ใช้เหมือนกัน)
| field | type | required | ความหมาย |
|---|---|---|---|
| `track` | enum | **✅** | `apply` / `watch` / `event` / `trip` |
| `title` | text | **✅** | ชื่องาน |
| `stage` | text | **✅** | ดู stage ต่อ track ด้านล่าง (ใส่ default ได้) |
| `status` | text | – | default `'New'` |
| `priority` | enum | – | `High` / `Medium` / `Low` |
| `source_url` | text | – | ลิงก์ที่มาของข้อมูล |
| `due_date` | date | – | **วันสำคัญหลัก** (apply=deadline สมัคร, event=วันงาน, trip=วันไป) |
| `owner_id` | uuid | – | คนรับผิดชอบ |
| `reviewer_id` | uuid | – | ผู้ตรวจ (apply/event/trip ควรมี · watch ไม่ต้อง) |
| `ai_summary` | text | – | สรุปย่อจาก bot |
| `details` | jsonb | – | **ฟิลด์เฉพาะ track (ข้อ 3) — จุดที่ต้องใส่ให้ครบ** |

### Stages ต่อ track (ใส่ `stage` ให้ตรง track)
| track | stages (ตามลำดับ) | default |
|---|---|---|
| `apply` | Spotted → Fit check → Drafting → Submitted → Won → Lost | `Spotted` |
| `watch` | New → Read → Filed → Promote | `New` |
| `event` | Spotted → Decide attend → Registered → Attended → Follow-ups | `Spotted` |
| `trip` | Planned → Confirmed → Departed → Completed → Follow-ups | `Planned` |

> Bot สร้างใหม่ → ใช้ **default stage** ของ track นั้นเสมอ (ถ้าใส่ stage ผิด track DB จะ reject)

---

## 3. opportunities.details (JSONB) — ฟิลด์เฉพาะ track ⭐ สำคัญสุด

> นี่คือจุดที่ "ใส่ได้แค่บางรายละเอียด" — ใส่ key เหล่านี้ใน `details` ให้ครบที่ bot รู้

### 3.1 track = `apply` (ขอทุน/งานแข่ง)
| key | type | ความหมาย |
|---|---|---|
| `sponsor` | `{org_id, org_name}` | ผู้ให้ทุน/ผู้จัด — `{ "org_id": null, "org_name": "NIA" }` |
| `program_name` | text | ชื่อโครงการ/รอบ เช่น "Spring 2026 Cohort" |
| `jurisdiction` | text | `Thailand`/`APAC`/`Global`/`US`/`EU`/`UK`/`Other` |
| `ask_amount` | number | จำนวนเงินที่ขอ |
| `currency` | text | `THB`/`USD`/`EUR`/`JPY`/`GBP` |
| `eligibility` | text | ใครสมัครได้ · ข้อจำกัด |
| `required_docs` | text | เอกสารที่ต้องเตรียม |
| `submission_url` | url | ลิงก์สมัคร |
| `application_deadline` | date | **= ควร set ใส่ `due_date` ด้วย** |
| `decision_date` | date | วันรู้ผล |
| `eligibility_status` | text | `Eligible`/`Ineligible — Template Only`/`Need Partner`/`Unclear` |

### 3.2 track = `watch` (ติดตามข่าว)
| key | type | ความหมาย |
|---|---|---|
| `category` | text | `Regulation`/`Industry News`/`Research`/`Market`/`Competitor`/`Technology`/`Risk Signal`/`Supply Chain`/`Policy Change`/`Other` |
| `jurisdiction` | text | (เหมือน apply) |
| `published_date` | date | วันที่บทความเผยแพร่ |
| `news_source` | text | แหล่งข่าว เช่น "Carbon Pulse", "Reuters" |
| `takeaway` | text | ใจความสำคัญ 1 บรรทัด |
| `topic_tags` | text | คั่น comma เช่น "methane, cattle, asia" |
| `relevance` | text | เกี่ยวกับ LOCOL ยังไง |
| `related_companies` | text | คั่น comma เช่น "CH4 Global, dsm-firmenich" |

### 3.3 track = `event` (อีเวนต์)
**วันที่/สถานที่:**
| key | type | ความหมาย |
|---|---|---|
| `event_date_start` | date | วันเริ่มงาน (**= ควร set `due_date` ด้วย**) |
| `event_date_end` | date | วันจบ (วันเดียวเว้นไว้) |
| `event_time` | text | เช่น "14:00 - 17:00" |
| `registration_deadline` | date | วันปิดลงทะเบียน |
| `location` | text | สถานที่ เช่น "BITEC Hall 5" / "Online" |
| `format` | text | `Online`/`Offline`/`Hybrid` |
| `jurisdiction` | text | (เหมือน apply) |
| `cost` | number | ค่าเข้าต่อคน (0 = ฟรี) |
| `currency` | text | `THB`/`USD`/... |
| `capacity` | number | จำนวนรับ |
| `dress_code` | text | การแต่งกาย |
| `rsvp_url` | url | ลิงก์ลงทะเบียน |
| `organizer` | text | ผู้จัด (ถ้าไม่ใช่ org ในระบบ) |

**Marketing brief (ทีม marketing ใช้):**
| key | type | ความหมาย |
|---|---|---|
| `agenda` | text | รันดาวน์งาน (หลายบรรทัดได้ ใช้ `\n`) |
| `locol_responsibilities` | text | LOCOL ต้องทำอะไรในงาน |
| `goals` | text | เป้าหมาย/KPI |
| `ideas` | text | ไอเดียที่คิดไว้ |
| `credit_required` | text | `ไม่ต้อง` / `ต้อง` |
| `credit_to` | text | เครดิตให้ใคร (ถ้า "ต้อง") |
| `content_assets_needed` | text | สื่อที่ต้องเตรียม |
| `shot_list` | text | รายการรูปที่ต้องถ่าย |
| `social_media_plan` | text | แผนโพสต์ |
| `hashtags` | text | hashtag + mentions |

### 3.4 track = `trip` (ลงพื้นที่)
**วันที่/สถานที่:**
| key | type | ความหมาย |
|---|---|---|
| `trip_date_start` | date | วันไป (**= ควร set `due_date` ด้วย**) |
| `trip_date_end` | date | วันกลับ |
| `farm_name` | text | ชื่อฟาร์ม |
| `location_name` | text | ชื่อสถานที่/อำเภอ |
| `province` | text | จังหวัด |
| `farm_owner_name` | text | ชื่อเจ้าของฟาร์ม |
| `farm_owner_phone` | text | เบอร์โทร |

**วัตถุประสงค์ + marketing:**
| key | type | ความหมาย |
|---|---|---|
| `purpose` | text | ไปทำอะไร/ทำไม |
| `agenda` | text | แผนวัน |
| `emphasis` | text | มุมที่อยากเน้น |
| `storytelling_angle` | text | narrative สำหรับ content |
| `shot_list` | text | รายการรูป |
| `credit_required` | text | `ไม่ต้อง` / `ต้อง` |
| `credit_to` | text | เครดิตให้ใคร |
| `consent_status` | text | `ยังไม่ได้ขอ`/`ขอแล้ว · ได้`/`ขอแล้ว · ไม่ได้`/`ไม่ต้องขอ` |

**Logistics:**
| key | type | ความหมาย |
|---|---|---|
| `transport` | text | การเดินทาง |
| `accommodation` | text | ที่พัก |
| `estimated_cost` | number | ค่าใช้จ่ายประมาณ |
| `currency` | text | `THB`/... |
| `equipment_list` | text | อุปกรณ์ที่เอาไป |
| `notes` | text | หมายเหตุ |

### ตัวอย่าง insert opportunity (apply) ครบ ๆ
```jsonc
{
  "track": "apply", "stage": "Spotted", "status": "New", "priority": "High",
  "title": "Climate Curve Grant 2026",
  "source_url": "https://climatecurve.org/apply",
  "due_date": "2026-08-15",
  "ai_summary": "ทุน climate สาย agritech $200k · LOCOL eligible",
  "details": {
    "sponsor": { "org_id": null, "org_name": "Climate Curve" },
    "program_name": "Spring 2026 Cohort",
    "jurisdiction": "Global",
    "ask_amount": 200000, "currency": "USD",
    "eligibility": "early-stage climate startup, < $1M revenue",
    "required_docs": "pitch deck, financials, team CVs",
    "submission_url": "https://climatecurve.org/apply",
    "application_deadline": "2026-08-15",
    "decision_date": "2026-10-01",
    "eligibility_status": "Eligible"
  }
}
```

---

## 4. TRIP_STOPS — จุดแวะในทริป (track=trip เท่านั้น)

`insert into trip_stops (...)` — 1 row = 1 จุด · เชื่อมด้วย `opportunity_id`

| field | type | ความหมาย |
|---|---|---|
| `opportunity_id` | uuid | **✅** opp (track=trip) ที่ผูก |
| `day_date` | date | **✅** วันที่ของจุดนี้ |
| `sort_order` | int | ลำดับในวัน (0,1,2…) |
| `start_time` / `end_time` | text | "09:00" (free-form) |
| `stop_type` | text | `farm`/`place`/`workshop`/`meeting`/`lodging`/`transport`/`other` |
| `name` | text | ชื่อฟาร์ม/สถานที่ |
| `province` | text | จังหวัด |
| `location_name` | text | อำเภอ/ตำบล/address |
| `owner_name` | text | เจ้าของ/คนนัด |
| `owner_phone` | text | เบอร์ |
| `purpose` | text | ทำอะไรที่นี่ |
| `agenda` | text | agenda สั้น |
| `emphasis` | text | จุดเน้น (marketing) |
| `notes` | text | หมายเหตุ |

---

## 5. OPPORTUNITY_PEOPLE — เชื่อม contact/org กับ opportunity

`insert into opportunity_people (...)` — เช่น "คนนี้เป็น speaker ในงานนี้"

| field | type | ความหมาย |
|---|---|---|
| `opportunity_id` | uuid | **✅** |
| `contact_id` **หรือ** `org_id` | uuid | **✅ ใส่อย่างใดอย่างหนึ่ง** (ไม่ใช่ทั้งคู่) |
| `role` | text | `organizer` / `attendee` |
| `status` | text | `VVIP`/`Speaker`/`Invitee`/`Sponsor`/`Audience`/`Other` |
| `note` | text | หมายเหตุ |

---

## 6. OPPORTUNITY_TEAM_ASSIGNMENTS — มอบหมายทีม LOCOL

`insert into opportunity_team_assignments (...)`

| field | type | ความหมาย |
|---|---|---|
| `opportunity_id` | uuid | **✅** |
| `team_member_id` | uuid | **✅** (FK → team_members) |
| `role` | text | `owner`/`reviewer`/`document_lead`/`coordinator`/`traveler`/`support` |
| `trip_stop_id` | uuid | – | (option) ผูกกับ stop เฉพาะ (เช่น traveler ไปจุดไหน) |
| `note` | text | – |

---

## 7. INTERACTIONS — บันทึกการติดต่อ contact

`insert into interactions (...)`

| field | type | ความหมาย |
|---|---|---|
| `contact_id` | uuid | **✅** |
| `date` | date | default วันนี้ |
| `channel` | text | Line/Email/Phone/... |
| `direction` | text | `inbound` / `outbound` |
| `summary` | text | **✅** สรุปว่าคุยอะไร |
| `outcome` | text | ผลลัพธ์ |

## 8. NOTES — โน้ต/เตือนความจำ

`insert into notes (...)`

| field | type | ความหมาย |
|---|---|---|
| `scope` | enum | **✅** `contact` / `org` / `opportunity` |
| `target_id` | uuid | **✅** id ของ contact/org/opp นั้น |
| `text` | text | **✅** เนื้อโน้ต |
| `date` | date | default วันนี้ · ถ้า `is_future=true` = วันเตือน |
| `is_future` | bool | true = โน้ตเตือนในอนาคต (ขึ้นปฏิทิน) |
| `tags` | text[] | แท็ก (รองรับ #ไทย) |

## 8b. COMMITMENTS — สิ่งที่สัญญาไว้

`insert into commitments (...)`

| field | type | ความหมาย |
|---|---|---|
| `contact_id` | uuid | **✅** |
| `direction` | enum | `i_owe` (เราติดเขา) / `they_owe` (เขาติดเรา) |
| `description` | text | **✅** เรื่องอะไร |
| `due_date` | date | กำหนด (เลยกำหนด → ขึ้นแจ้งเตือน) |
| `status` | enum | `open`/`done`/`cancelled` (default `open`) |

---

## 9. ENUM / ค่าที่ใช้ได้ (reference รวม)

```
track:               apply | watch | event | trip
priority:            High | Medium | Low
relationship_status: known | prospect | cold | archived
tie_type:            Strong | Bridge | Weak
participant role:    organizer | attendee
participant status:  VVIP | Speaker | Invitee | Sponsor | Audience | Other
team role:           owner | reviewer | document_lead | coordinator | traveler | support
stop_type:           farm | place | workshop | meeting | lodging | transport | other
interaction dir:     inbound | outbound
commitment dir:      i_owe | they_owe
commitment status:   open | done | cancelled
note scope:          contact | org | opportunity
channel:             Line | Email | Phone | SMS | Facebook Messenger | WhatsApp | WeChat | In Person | Other
relation_types (text[]): introduced-by | introduced-to | coworker | co-founder | co-panel |
                         knows-well | family | married-to | mentor | investor | client | vendor
currency:            THB | USD | EUR | JPY | GBP
jurisdiction:        Thailand | APAC | Global | US | EU | UK | Other
```

---

## 10. แนวทางที่แนะนำสำหรับ Bot

1. **สร้าง Contact:** ใส่ `first_name` เป็นอย่างน้อย + `relationship_status: "prospect"` + เก็บทุกอย่างที่อ่านจากนามบัตรลง phones/emails/socials/orgs
2. **สร้าง Opportunity:** เลือก track ให้ถูก → ใส่ default stage → set `due_date` ให้ตรงกับวันสำคัญของ track → **เติม `details` ให้ครบทุก key ที่รู้** (อย่าใส่แค่ title)
3. **ผูกคน:** ถ้ารู้ว่าคนในงานคือใคร → สร้าง contact ก่อน → แล้ว `opportunity_people` (ใช้ contact_id)
4. **ทริปหลายจุด:** สร้าง opp (trip) → แล้ว `trip_stops` ทีละจุด เรียง `sort_order`
5. **ตั้ง owner:** ถ้ารู้ว่า team member ไหนรับผิดชอบ → ใส่ `owner_id` (query `team_members` ด้วย email/ชื่อ)
6. **ค่าวันที่** ใช้ `YYYY-MM-DD` เสมอ · **เลขเงิน** เป็น number ไม่ใส่ comma
7. ถ้าไม่แน่ใจ field ไหน → ใส่เท่าที่รู้ ที่เหลือเว้นได้ (มี default หมด)

---

## 11. หมายเหตุเทคนิค

- เขียนผ่าน Supabase client: `await supabase.from('opportunities').insert({ ... })`
- `details` ส่งเป็น object ปกติ (supabase-js แปลง JSONB ให้)
- RLS: ต้องเป็น authenticated (service_role key สำหรับ bot ฝั่ง server)
- `discord_inbox`: ถ้า bot ทำงานผ่าน Discord capture flow ให้เขียน row ที่นี่ก่อน (มี `ai_extracted_data` jsonb เก็บข้อมูลดิบ + `created_contact_id`/`created_opportunity_id` ผูกหลังแปลงเสร็จ)
- หลังสร้าง opp ที่ผูก contact: ใช้ `contact_opportunities` (contact_id, opportunity_id, role) เพื่อให้ขึ้นใน timeline ของ contact ด้วย
