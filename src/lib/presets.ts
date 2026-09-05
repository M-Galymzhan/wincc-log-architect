import { UnifiedTag, ComfortTag, ProfessionalTag } from './types';

export interface IndustryPreset {
  id: string;
  nameRu: string;
  nameEn: string;
  descRu: string;
  descEn: string;
  icon: string;
  unifiedTags: Omit<UnifiedTag, 'id'>[];
  comfortTags: Omit<ComfortTag, 'id'>[];
  proTags: Omit<ProfessionalTag, 'id'>[];
}

export const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'pump_station',
    nameRu: 'КНС / Насосная станция',
    nameEn: 'Pumping Station / Water',
    descRu: 'Давления нагнетания, уровни в резервуарах, токи двигателей насосов, моточасы и суточные расходы',
    descEn: 'Discharge pressures, sump levels, motor currents, pump runtimes, and total flows',
    icon: 'Droplets',
    unifiedTags: [
      { description: 'Давление в напорном коллекторе (0.5с)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 6, dataType: 'Real' },
      { description: 'Уровни в приемном резервуаре (1с)', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 4, dataType: 'Real' },
      { description: 'Токи и температуры обмоток насосов (2с)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 18, dataType: 'Real' },
      { description: 'Суточные счетчики расходомеров (10с)', mode: 'cyclic', cycleSec: 10, entriesPerSec: 0.1, count: 8, dataType: 'DInt' },
      { description: 'Концевики и аварии задвижек AUMA (По изм.)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 24, dataType: 'Bool' },
    ],
    comfortTags: [
      { description: 'Давление в коллекторе (0.5с)', mode: 'cyclic', cycleSec: 0.5, count: 4 },
      { description: 'Уровни в резервуарах (1с)', mode: 'cyclic', cycleSec: 1, count: 4 },
      { description: 'Токи насосов (2с)', mode: 'cyclic', cycleSec: 2, count: 12 },
      { description: 'Наработка и счетчики (10с)', mode: 'cyclic', cycleSec: 10, count: 6 },
      { description: 'Статусы агрегатов (По изм.)', mode: 'onchange', cycleSec: 60, count: 16 },
    ],
    proTags: [
      { description: 'Вибрация и подшипники агрегатов (0.1с Fast)', cycleSec: 0.1, count: 12, archiveType: 'fast' },
      { description: 'Давления и расходы коллектора (1с Fast)', cycleSec: 1, count: 20, archiveType: 'fast' },
      { description: 'Суточный баланс водоподачи (60с Slow)', cycleSec: 60, count: 30, archiveType: 'slow' },
      { description: 'Наработка насосных агрегатов (60с Slow)', cycleSec: 60, count: 16, archiveType: 'slow' },
    ],
  },
  {
    id: 'boiler_house',
    nameRu: 'Котельная / ИТП',
    nameEn: 'Boiler House / Heating',
    descRu: 'Температуры подачи/обратки, давление газа и теплоносителя, расход пара, отсечные клапаны',
    descEn: 'Supply/return temps, gas/feed pressures, steam flow, and safety shutoff valves',
    icon: 'Flame',
    unifiedTags: [
      { description: 'Давление пара и газа в магистрали (0.5с)', mode: 'cyclic', cycleSec: 0.5, entriesPerSec: 2, count: 8, dataType: 'Real' },
      { description: 'Температуры подачи и обратки контуров (1с)', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 24, dataType: 'Real' },
      { description: 'Температура уходящих газов котлов (2с)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 12, dataType: 'Real' },
      { description: 'Тепловая мощность и расход Гкал (5с)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 10, dataType: 'Real' },
      { description: 'Отсечные электромагнитные клапаны (По изм.)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 32, dataType: 'Bool' },
    ],
    comfortTags: [
      { description: 'Давления котлов (1с)', mode: 'cyclic', cycleSec: 1, count: 8 },
      { description: 'Температуры теплосети (2с)', mode: 'cyclic', cycleSec: 2, count: 16 },
      { description: 'Учет тепла и газа (10с)', mode: 'cyclic', cycleSec: 10, count: 8 },
      { description: 'Аварийные блокировки (По изм.)', mode: 'onchange', cycleSec: 60, count: 20 },
    ],
    proTags: [
      { description: 'ПИД-регуляторы горения и давления (0.5с Fast)', cycleSec: 0.5, count: 24, archiveType: 'fast' },
      { description: 'Температурные профили котлов (2с Fast)', cycleSec: 2, count: 48, archiveType: 'fast' },
      { description: 'Почасовые архивы расхода топлива (60с Slow)', cycleSec: 60, count: 40, archiveType: 'slow' },
      { description: 'КПД и тепловые потери (60с Slow)', cycleSec: 60, count: 20, archiveType: 'slow' },
    ],
  },
  {
    id: 'pharma_gmp',
    nameRu: 'Фармацевтика / GMP (21 CFR)',
    nameEn: 'Pharmaceutical / GMP (21 CFR)',
    descRu: 'Перепады давления чистых помещений, автоклавы, циклы CIP/SIP с обязательным Audit Trail',
    descEn: 'Cleanroom differential pressures, autoclave temps, CIP/SIP cycles with strict Audit Trail',
    icon: 'ShieldCheck',
    unifiedTags: [
      { description: 'Температура стерилизации автоклава (1с)', mode: 'cyclic', cycleSec: 1, entriesPerSec: 1, count: 16, dataType: 'Real' },
      { description: 'Перепад давления в шлюзах и чистых зонах (2с)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 24, dataType: 'Real' },
      { description: 'Относительная влажность и точка росы (5с)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 16, dataType: 'Real' },
      { description: 'Электронные подписи и авторизация рецептов (По изм.)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 50, dataType: 'String' },
    ],
    comfortTags: [
      { description: 'Температура чистой зоны (1с)', mode: 'cyclic', cycleSec: 1, count: 10 },
      { description: 'Давление в боксах (2с)', mode: 'cyclic', cycleSec: 2, count: 12 },
      { description: 'Статусы циклов мойки CIP (По изм.)', mode: 'onchange', cycleSec: 60, count: 20 },
    ],
    proTags: [
      { description: 'Критические параметры батча (0.5с Fast)', cycleSec: 0.5, count: 30, archiveType: 'fast' },
      { description: 'Давление стерильного воздуха (1с Fast)', cycleSec: 1, count: 20, archiveType: 'fast' },
      { description: 'Климатические параметры зон класса A/B (60с Slow)', cycleSec: 60, count: 60, archiveType: 'slow' },
      { description: 'Долговременный архив партий батча (60с Slow)', cycleSec: 60, count: 40, archiveType: 'slow' },
    ],
  },
  {
    id: 'hvac_vent',
    nameRu: 'Вентиляция и климат (HVAC)',
    nameEn: 'Ventilation & Climate (HVAC)',
    descRu: 'Температуры притока/вытяжки, заслонки рекуперации, перепады на фильтрах, частотники вентиляторов',
    descEn: 'Supply/exhaust air temps, heat recovery dampers, filter dP switches, fan VFD speeds',
    icon: 'Wind',
    unifiedTags: [
      { description: 'Температура приточного и вытяжного воздуха (2с)', mode: 'cyclic', cycleSec: 2, entriesPerSec: 0.5, count: 16, dataType: 'Real' },
      { description: 'Положение воздушных заслонок 0-100% (5с)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 12, dataType: 'Real' },
      { description: 'Скорость и ток ЧРП вентиляторов (5с)', mode: 'cyclic', cycleSec: 5, entriesPerSec: 0.2, count: 8, dataType: 'Real' },
      { description: 'Засорение фильтров и датчики протока (По изм.)', mode: 'onchange', cycleSec: 60, entriesPerSec: 0.0167, count: 20, dataType: 'Bool' },
    ],
    comfortTags: [
      { description: 'Температуры приточных установок (2с)', mode: 'cyclic', cycleSec: 2, count: 12 },
      { description: 'Процент открытия клапанов КЗР (5с)', mode: 'cyclic', cycleSec: 5, count: 8 },
      { description: 'Перепады давления фильтров (По изм.)', mode: 'onchange', cycleSec: 60, count: 14 },
    ],
    proTags: [
      { description: 'ПИД-регулирование температуры каналов (1с Fast)', cycleSec: 1, count: 20, archiveType: 'fast' },
      { description: 'Частота и энергопотребление вентиляторов (5с Fast)', cycleSec: 5, count: 30, archiveType: 'fast' },
      { description: 'Суточные графики энергоэффективности (60с Slow)', cycleSec: 60, count: 50, archiveType: 'slow' },
    ],
  },
];
