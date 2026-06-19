export const CacheKeys = {
  CEO_SUMMARY: 'ceo:summary',
  CRM_SUMMARY: 'crm:summary',
  CRM_CONVERSION: (from: string, to: string) => `crm:conversion:${from}:${to}`,
  CRM_SETTINGS: (key: string) => `crm:settings:${key}`,
  HR_SETTINGS: (key: string) => `hr:settings:${key}`,
} as const;

export const CacheTTL = {
  CEO_SUMMARY: 60,
  CRM_SUMMARY: 300,
  CRM_CONVERSION: 3600,
  CRM_SETTINGS: 86400,
  HR_SETTINGS: 86400,
} as const;
