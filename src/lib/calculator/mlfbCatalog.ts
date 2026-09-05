export interface SiemensHardwareItem {
  name: string;
  mlfb: string;
  capacityGb: number;
  type: 'sd' | 'usb' | 'ssd';
  descriptionRu: string;
  descriptionEn: string;
  recommendedFor: string;
}

export const SIEMENS_STORAGE_CATALOG: Record<string, SiemensHardwareItem> = {
  sd_512m: {
    name: 'SIMATIC SD Card 512 MB',
    mlfb: '6AV2181-4DB00-0AX0',
    capacityGb: 0.5,
    type: 'sd',
    descriptionRu: 'Официальная карта памяти Siemens для Comfort KP/TP',
    descriptionEn: 'Official Siemens memory card for Comfort panels',
    recommendedFor: 'WinCC Comfort TP/KP',
  },
  sd_2g: {
    name: 'SIMATIC SD Card 2 GB',
    mlfb: '6AV2181-4DB10-0AX0',
    capacityGb: 2,
    type: 'sd',
    descriptionRu: 'Стандартная SD-карта повышенной износостойкости SLC',
    descriptionEn: 'Standard high-endurance SLC SD card for Comfort/Advanced',
    recommendedFor: 'WinCC Comfort / Advanced (Рекомендуемый стандарт)',
  },
  sd_12g: {
    name: 'SIMATIC SD Card 12 GB',
    mlfb: '6AV2181-4DB20-0AX0',
    capacityGb: 12,
    type: 'sd',
    descriptionRu: 'Специализированная карта памяти для SIMATIC Unified Comfort (слот Data X51)',
    descriptionEn: 'Dedicated memory card for SIMATIC Unified Comfort panels (Slot X51)',
    recommendedFor: 'SIMATIC Unified Comfort MTP (Официальный стандарт)',
  },
  sd_32g: {
    name: 'SIMATIC SD Card 32 GB',
    mlfb: '6AV2181-4DB30-0AX0',
    capacityGb: 32,
    type: 'sd',
    descriptionRu: 'Высокоемкая SD-карта Siemens с аппаратным Wear Leveling',
    descriptionEn: 'High-capacity Siemens SD card with hardware Wear Leveling',
    recommendedFor: 'Unified Comfort с длительным периодом хранения',
  },
  usb_128g: {
    name: 'SIMATIC Industrial USB 128 GB',
    mlfb: '6ES7648-0DC60-0AA0',
    capacityGb: 128,
    type: 'usb',
    descriptionRu: 'Промышленный USB 3.0 накопитель Siemens в экранированном корпусе (слот X61)',
    descriptionEn: 'Industrial USB 3.0 flash drive in shielded housing (Slot X61)',
    recommendedFor: 'Unified Comfort (X61) / IPC Runtime',
  },
  ssd_custom: {
    name: 'SIMATIC IPC Enterprise SSD',
    mlfb: '6ES7648-2BF30-0AA0',
    capacityGb: 256,
    type: 'ssd',
    descriptionRu: 'Промышленный NVMe/SATA накопитель для SIMATIC IPC и серверов SCADA',
    descriptionEn: 'Industrial enterprise SSD for SIMATIC IPC and SCADA servers',
    recommendedFor: 'WinCC Unified PC RT / WinCC Professional',
  },
};

export function getSiemensArticle(mediumKey: string): SiemensHardwareItem {
  return SIEMENS_STORAGE_CATALOG[mediumKey] || SIEMENS_STORAGE_CATALOG.sd_12g;
}
