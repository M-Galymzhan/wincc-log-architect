# Siemens WinCC Log & Storage Architect: Community Distribution Kit

Practical, ready-to-use distribution and outreach templates designed under the `marketingskills` framework (`community-marketing`, `directory-submissions`, `ai-seo`).

---

## 1. Reddit Post Draft (Target: r/PLC & r/SCADA)

**Target Subreddits:** `r/PLC` (120k+ members), `r/SCADA` (25k+ members)  
**Tone:** Practical engineering, open-source, no marketing fluff, solving real-world hardware & configuration issues.

### Title:
> I built a free, offline-ready sizing calculator & TIA Portal tag generator for WinCC Unified (SQLite WAL), Comfort (RDB), and Professional (SQL) — with Flash endurance (TBW) checks

### Body:
```markdown
Hi everyone,

Over the past few projects migrating from Comfort Panels to Unified Comfort (MTP), one of the most frustrating things was sizing the historical logging archives correctly:
1. WinCC Unified uses SQLite with Write-Ahead Logging (WAL) and allocates storage strictly in **discrete 4 MB multiples** (purging entire 4 MB files on circular rotation to prevent SD card fragmentation).
2. The **1.5x Write Amplification factor** (WAL log append -> checkpoint to DB3 -> B-tree index updates) chews through cheap consumer SD cards surprisingly fast.
3. Comfort Panels are constrained by the **500,000 records per RDB/CSV file** and FAT32 32 GB volume ceiling.
4. WinCC Professional partitions tags into **Fast (<= 1s)** and **Slow (> 1s)** streams on MS SQL Server, often hitting the 10 GB limit on SQL Server Express.

To solve this for our team, I built **Siemens WinCC Log & Storage Architect**:
🔗 Live App (Free, PWA, 0 Ads): https://wincc-log-architect.vercel.app
📂 GitHub Repo (MIT): https://github.com/M-Galymzhan/wincc-log-architect

### Key Features:
- **WinCC Unified Sizing**: Exact 4 MB segment math, circular buffer health checks (>= 3 segments, 200 MB min), and Flash lifespan estimation (TBW / P/E cycles for SLC, pSLC, MLC, TLC).
- **WinCC Comfort / Advanced**: Sizing against the 500k-record limit and FAT32 32 GB SD card ceiling, with SIMATIC Audit trail sizing (~250 bytes/entry).
- **WinCC Professional & V7/V8**: Fast vs. Slow Tag Logging separation, MDF/LDF disk footprint, and SQL Server Express 10 GB threshold warnings.
- **Master Tag Hub & TIA Portal 30-Column XLSX Export**: Universal tag configurator with Deadband, Limits, and Swinging Door smoothing adapters. Generates standardized 30-column Excel (`Hmi Tags.xlsx` + `Substitute Value Usage` sheet) directly importable into TIA Portal V14 through V21+.
- **ISA-18.2 / IEC 62682 Alarm Rationalization**: Workload assessment (< 6 alm/hr manageable, >= 30 alm/hr alarm flood alert).
- **Offline / PWA Capable**: Runs completely client-side in the browser on your laptop or field programming device (PG) even without internet on the plant floor.

Dedicated landing links if you only need one section:
- Unified Calculator: https://wincc-log-architect.vercel.app/unified
- Comfort Calculator: https://wincc-log-architect.vercel.app/comfort
- Professional Calculator: https://wincc-log-architect.vercel.app/professional
- TIA Portal HMI Tags Hub: https://wincc-log-architect.vercel.app/master-tags

Would love feedback, edge cases you have encountered in the field, or feature requests!
```

---

## 2. Siemens Industry Online Support (SIOS) Forum Post

**Target Category:** *Conference: SIMATIC WinCC Unified Systems* / *SIMATIC WinCC (TIA Portal)*  
**Tone:** Professional, standards-aligned (referencing SIOS Entry IDs).

### Subject:
> Engineering Tool: Open-source WinCC Unified SQLite WAL & Comfort/Professional Storage Sizing Calculator

### Post Content:
```text
Dear Community,

When designing logging architectures for SIMATIC WinCC (Unified, Comfort Panels, and Professional), estimating required archive volumes and flash card longevity according to Siemens best practices often requires tedious spreadsheet calculations.

To simplify this process, I have developed a free open-source engineering web tool:
Siemens WinCC Log & Storage Architect: https://wincc-log-architect.vercel.app
Source Code: https://github.com/M-Galymzhan/wincc-log-architect

The calculation models align directly with official Siemens documentation:
- SIOS Entry ID 109772222: WinCC Unified SQLite WAL 4 MB segment allocation rules, circular buffer recommendations (>= 3 segments), and 1.5x write amplification.
- SIOS Entry ID 109746939: WinCC Comfort/Advanced 500,000 record limits per RDB file and FAT32 32 GB volume limits.
- SIOS Entry ID 109810540: Standard 30-column HMI Tag XLSX export structure for TIA Portal V14–V21+.
- ANSI/ISA-18.2 / IEC 62682: Operator alarm rate rationalization.

The application runs completely locally in the browser as a PWA, making it safe for field engineers without internet access on site.

I hope this helps fellow engineers during commissioning and project sizing.
```

---

## 3. Habr (Хабр) Article Draft Outline (Russian)

**Хабы:** АСУ ТП, Разработка под Siemens, Промышленное программирование, Хранилища данных.  
**Заголовок:** «Как не убить SD-карту за полгода: точный расчет архивов WinCC Unified (SQLite WAL), лимитов Comfort и генерация тегов для TIA Portal»

### Структура статьи:
1. **Введение**: Почему миграция с Comfort на Unified Comfort часто оборачивается сбоями архивации.
   - Как работает SQLite в режиме WAL (Write-Ahead Logging).
   - Почему сегменты выделяются строго кратно 4 МБ и почему циклическая перезапись удаляет файлы целиком.
2. **Проблема Write Amplification 1.5x и выбор карты памяти**:
   - SLC (SIMATIC SD 60 000 P/E) vs pSLC (20 000 P/E) vs Consumer TLC (1 000 P/E).
   - Расчет срока службы (TBW) по формуле:
     $$Life = \frac{\text{Емкость (ГБ)} \times \text{P/E}}{\text{Суточный объем (ГБ)} \times 1.5 \times 365}$$
   - Почему слот X52 не читает exFAT из коробки и требует NTFS/FAT32.
3. **Ограничения WinCC Comfort и WinCC Professional**:
   - «Стеклянный потолок» в 500 000 строк на RDB-файл в Windows CE 6.0.
   - Разделение тегов на Fast (<= 1 с) и Slow в MS SQL Server и лимит 10 ГБ SQL Express.
4. **Обзор открытого инструмента**:
   - Демонстрация работы калькулятора: https://wincc-log-architect.vercel.app
   - Интеллектуальный экспорт 30-колоночных таблиц Excel для мгновенного импорта в TIA Portal V14–V21+.
   - Валидация аварий по ISA-18.2 / EEMUA 191 (защита от лавины тревог).
5. **Заключение и ссылка на GitHub**: Инструмент полностью открыт под лицензией MIT, без рекламы и телеметрии.

---

## 4. Каталоги и Awesome-листы (Backlink Checklist)

| Платформа | Ссылка | Статус |
| :--- | :--- | :--- |
| **GitHub Awesome** | `github.com/scadaresearch/awesome-industrial-automation` | PR заявка на добавление |
| **GitHub Siemens** | `github.com/topics/tia-portal`, `github.com/topics/wincc` | Присутствует в топе тем |
| **PLCS.net Interactive Q&A** | `forums.mrplc.com` & `plcs.net/forum` | Рекомендация в профильных темах по архивам |
| **Telegram АСУ ТП** | Крупнейшие каналы инженеров АСУ ТП и TIA Portal | Анонс статьи и инструмента |
