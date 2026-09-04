# Siemens WinCC Log & Storage Architect ⚡

<p align="center">
  <b>Comprehensive Engineering Calculator & Storage Architect for Siemens TIA Portal</b><br>
  WinCC Unified (SQLite / MS SQL) • WinCC Comfort / Advanced (RDB / CSV) • WinCC Professional (MS SQL Server)
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.3.3-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Siemens_TIA_Portal-V16--V20-00646E?style=for-the-badge&logo=siemens" alt="Siemens" />
</p>

---

## 🇷🇺 Описание (Russian)

**Siemens WinCC Log & Storage Architect** — это специализированный веб-инструмент и PWA-приложение для инженеров АСУ ТП, проектировщиков и наладчиков, рассчитывающий объемы архивов, размеры сегментов, кольцевые буферы и требуемые емкости носителей данных для всех линеек **Siemens WinCC**:

1. **WinCC Unified** (Панели *SIMATIC Unified Comfort MTP* и *WinCC Unified PC Runtime*):
   - Расчет цикличных тегов и тегов по изменению (`Cyclic` / `On change`).
   - Учет журналов тревог (**Alarm Logs**) и электронного журнала действий (**Audit Trail** по GMP / 21 CFR Part 11).
   - Строгая валидация правил Siemens:
     - Округление размера сегмента SQLite **кратно 4 МБ** (`Math.ceil(size / 4) * 4`).
     - Проверка правила **минимум 3 сегментов** в периоде хранения.
     - Интерактивный спидометр нагрузки: безопасная зона (<300 зап/с), предупреждение (300–500 зап/с), критическая нагрузка (>500 зап/с).
     - Расчет износа Flash-памяти SD-карты (**TBW**) и прогнозируемого срока службы в годах.
2. **WinCC Comfort / Advanced** (Панели *TP/KP Comfort* на Windows CE и *Runtime Advanced*):
   - Поддержка проприетарного бинарного формата **RDB** и текстового **CSV**.
   - Расчет количества циклических файлов (`Sequence of log files`) и числа записей на файл (`Data records per log`).
   - Контроль жесткого системного лимита Siemens — **до 500 000 записей на файл**.
3. **WinCC Professional** (SCADA на базе Microsoft SQL Server):
   - Автоматическое разделение тегов на **Fast Tag Logging** (циклы < 1 мин) и **Slow Tag Logging** (циклы ≥ 1 мин).
   - Расчет первичных файлов баз данных (**MDF**) и журналов транзакций (**LDF**).
   - Предупреждение о превышении порога **10 GB** бесплатной редакции Microsoft SQL Server Express.

### Дополнительные функции:
- 📋 **Шпаргалка TIA Portal**: копирование точных параметров в свойства Data Log в 1 клик.
- 📄 **Отчет для проекта**: генерация чистого листа расчета для вставки в пояснительную записку (с функцией печати в PDF).
- 💾 **Импорт / Экспорт**: сохранение и загрузка конфигураций проектов в формате JSON.
- 🌐 **100% Offline / PWA**: установка как автономное приложение на рабочий стол или мобильное устройство.

---

## 🇬🇧 Overview (English)

**Siemens WinCC Log & Storage Architect** is an industrial-grade engineering calculator and PWA tool designed for automation engineers working with Siemens TIA Portal. It calculates and validates data log footprints, segment boundaries, ring buffer rotations, and storage endurance across all three major WinCC families.

### Key Engineering Rules Implemented:
* **SQLite 4 MB Boundary**: Enforces the Siemens TIA Portal constraint that SQLite segments must be sized in multiples of 4 MB.
* **Rule of 3 Segments**: Validates that ring-buffer retention contains at least 3 segments for seamless cyclic deletion without data loss.
* **Logging Traffic Meter**: Visual gauge monitoring record write rates (<300 safe, 300–500 warning, >500 critical for SQLite).
* **Flash Wear & Lifespan**: Estimates SIMATIC SD Card TBW degradation in 24/7 industrial service.
* **SQL Server Express 10 GB Guard**: Warns when SCADA database growth risks halting SQL Server Express.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16.3.4 (App Router & Turbopack)
- **UI Library**: React 19.2.8
- **Styling**: Tailwind CSS 4.3.3 + Siemens Industrial Glassmorphism
- **Language**: TypeScript 5.8
- **Icons**: Lucide React 1.39.0
- **PWA**: Custom Web App Manifest + Service Worker

---

## 🚀 Quick Start (Локальный запуск)

```bash
# 1. Установите зависимости
npm install

# 2. Запустите сервер разработки
npm run dev

# 3. Откройте в браузере
http://localhost:3000
```

---

## 👤 Author

* **M-Galymzhan** ([GitHub](https://github.com/M-Galymzhan))
* Email: `galymzhan.manarbekuly@gmail.com`
