import { NetworkMetrics, UnifiedTag, ComfortTag, ProfessionalTag } from '../types';

export function calculateUnifiedNetwork(tags: UnifiedTag[]): NetworkMetrics {
  let totalEntriesPerSec = 0;
  let totalWireBytesPerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    let rate = 0;
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.01, tag.cycleSec || 1);
      rate = 1 / cycle;
    } else {
      rate = Math.max(0, tag.entriesPerSec || 0.0167);
    }

    // Payload size by data type
    let payloadBytes = 4;
    switch (tag.dataType) {
      case 'Bool':
        payloadBytes = 1;
        break;
      case 'Int':
        payloadBytes = 2;
        break;
      case 'Real':
      case 'DInt':
        payloadBytes = 4;
        break;
      case 'LReal':
        payloadBytes = 8;
        break;
      case 'String':
        payloadBytes = 32;
        break;
      default:
        payloadBytes = 4;
    }

    // Industrial Ethernet + S7comm-plus / OPC UA Binary overhead per item
    // Packaging ~10 items/PDU: 62B frame/10 + 16B item header = ~22B overhead
    const wireBytesPerSample = payloadBytes + 24;

    totalEntriesPerSec += rate * count;
    totalWireBytesPerSec += rate * count * wireBytesPerSample;
  });

  return formatNetworkMetrics(totalEntriesPerSec, totalWireBytesPerSec);
}

export function calculateComfortNetwork(tags: ComfortTag[]): NetworkMetrics {
  let totalEntriesPerSec = 0;
  let totalWireBytesPerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    let rate = 0;
    if (tag.mode === 'cyclic') {
      const cycle = Math.max(0.01, tag.cycleSec || 1);
      rate = 1 / cycle;
    } else {
      rate = 0.0167; // on change default ~1/min
    }

    // Standard S7comm polling overhead (Comfort Panel PDU 240B, avg 4B payload + 28B overhead)
    const wireBytesPerSample = 32;

    totalEntriesPerSec += rate * count;
    totalWireBytesPerSec += rate * count * wireBytesPerSample;
  });

  return formatNetworkMetrics(totalEntriesPerSec, totalWireBytesPerSec);
}

export function calculateProfessionalNetwork(tags: ProfessionalTag[]): NetworkMetrics {
  let totalEntriesPerSec = 0;
  let totalWireBytesPerSec = 0;

  tags.forEach((tag) => {
    const count = Math.max(0, Math.floor(tag.count || 0));
    if (count === 0) return;

    const cycle = Math.max(0.01, tag.cycleSec || 1);
    const rate = 1 / cycle;

    // WinCC Professional / SCADA polling tag items
    const wireBytesPerSample = tag.archiveType === 'fast' ? 28 : 34;

    totalEntriesPerSec += rate * count;
    totalWireBytesPerSec += rate * count * wireBytesPerSample;
  });

  return formatNetworkMetrics(totalEntriesPerSec, totalWireBytesPerSec);
}

function formatNetworkMetrics(totalEntriesPerSec: number, totalWireBytesPerSec: number): NetworkMetrics {
  if (totalEntriesPerSec <= 0 || totalWireBytesPerSec <= 0) {
    return {
      bandwidthKbps: 0,
      bandwidthMbps: 0,
      fastEthernetSaturationPct: 0,
      dailyTrafficMb: 0,
      monthlyTrafficGb: 0,
      telegramsPerSec: 0,
      networkStatus: 'safe',
      recommendationRu: 'Теги не заданы. Сетевой трафик архивации отсутствует.',
      recommendationEn: 'No tags configured. Network archiving traffic is zero.',
    };
  }

  const bandwidthKbps = Number(((totalWireBytesPerSec * 8) / 1000).toFixed(2));
  const bandwidthMbps = Number((bandwidthKbps / 1000).toFixed(3));
  const fastEthernetSaturationPct = Number(((bandwidthMbps / 100) * 100).toFixed(2));
  const dailyTrafficMb = Number(((totalWireBytesPerSec * 86400) / (1024 * 1024)).toFixed(2));
  const monthlyTrafficGb = Number(((dailyTrafficMb * 30) / 1024).toFixed(2));
  const telegramsPerSec = Math.max(1, Math.round(totalEntriesPerSec / 8));

  let networkStatus: NetworkMetrics['networkStatus'] = 'safe';
  let recommendationRu = 'Нагрузка на Industrial Ethernet минимальна (< 2%). Трафик архивации не влияет на циклический обмен PROFINET RT.';
  let recommendationEn = 'Industrial Ethernet load is minimal (< 2%). Archiving traffic has no impact on cyclic PROFINET RT communication.';

  if (bandwidthMbps >= 10) {
    networkStatus = 'critical';
    recommendationRu = 'Высокая сетевая нагрузка (> 10% Fast Ethernet). Риск задержек коммуникации ПЛК. Рекомендуется Gigabit Ethernet (1000BASE-T) и физическая изоляция сети.';
    recommendationEn = 'High network saturation (> 10% Fast Ethernet). Risk of PLC communication buffer overruns. Gigabit Ethernet (1000BASE-T) and subnet isolation recommended.';
  } else if (bandwidthMbps >= 2) {
    networkStatus = 'warning';
    recommendationRu = 'Умеренная сетевая нагрузка (2–10% Fast Ethernet). Рекомендуется использовать второй порт ПЛК (X2) или выделить отдельный VLAN под SCADA.';
    recommendationEn = 'Moderate network load (2–10% Fast Ethernet). Recommended to use secondary PLC port (X2) or separate VLAN for SCADA.';
  }

  return {
    bandwidthKbps,
    bandwidthMbps,
    fastEthernetSaturationPct,
    dailyTrafficMb,
    monthlyTrafficGb,
    telegramsPerSec,
    networkStatus,
    recommendationRu,
    recommendationEn,
  };
}
