export type TableCategory = string;
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'
export type ReservationStatus = 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'HOLD'

export const CATEGORY_META: Record<
  string,
  { label: string; short: string; color: string; defaultRate: number; description: string; features: string[] }
> = {
  SILVER: {
    label: 'Silver Gaming',
    short: 'S',
    color: '#9CA3AF',
    defaultRate: 75,
    description: 'İnternet ve Oyun',
    features: [],
  },
  GOLD: {
    label: 'Gold Gaming',
    short: 'G',
    color: '#F59E0B',
    defaultRate: 85,
    description: 'Fiyat / Performans',
    features: [],
  },
  PLATINUM: {
    label: 'Platinum Gaming',
    short: 'P',
    color: '#3B82F6',
    defaultRate: 100,
    description: '240Hz Oyun Deneyimi',
    features: [],
  },
  PLATINUM_PLUS: {
    label: 'Platinum Gaming +',
    short: 'P+',
    color: '#6366F1',
    defaultRate: 125,
    description: 'Üstün Performans',
    features: [],
  },
  ELITE: {
    label: 'Elite Gaming',
    short: 'E',
    color: '#EF4444',
    defaultRate: 180,
    description: 'Şansa Bırakma',
    features: [],
  },
  STREAM_RENDER: {
    label: 'Stream Render',
    short: 'R',
    color: '#10B981',
    defaultRate: 270,
    description: 'Oyna, Yap, İş Yap',
    features: [],
  },
  GARDEN: {
    label: 'Bahçe',
    short: 'B',
    color: '#22C55E',
    defaultRate: 0,
    description: 'Yemek ve içecek siparişi — saatlik ücret yok',
    features: [],
  },
}

export const STATUS_LABEL: Record<TableStatus, string> = {
  AVAILABLE: 'Müsait',
  OCCUPIED: 'Dolu',
  MAINTENANCE: 'Bakımda',
}

export const STATUS_COLOR: Record<TableStatus, 'success' | 'warning' | 'default'> = {
  AVAILABLE: 'success',
  OCCUPIED: 'warning',
  MAINTENANCE: 'default',
}

export const RESERVATION_LABEL: Record<ReservationStatus, string> = {
  REQUESTED: 'Talep Edildi',
  CONFIRMED: 'Onaylandı',
  CANCELLED: 'İptal Edildi',
  COMPLETED: 'Tamamlandı',
  HOLD: 'Beklemede',
}

export const RESERVATION_COLOR: Record<
  ReservationStatus,
  'info' | 'success' | 'error' | 'default' | 'warning'
> = {
  REQUESTED: 'info',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'default',
  HOLD: 'warning',
}
