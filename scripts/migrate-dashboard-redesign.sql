-- ADEKS Dashboard Redesign Migration
-- Çalıştırma sırası:
-- 1. Supabase Dashboard → SQL Editor → New query
-- 2. Aşağıdaki SQL'leri sırayla çalıştır

-- ============================================
-- 1. reservation_status enum'una HOLD ekle
-- ============================================
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'HOLD';

-- ============================================
-- 2. categories tablosu oluştur
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  color TEXT NOT NULL DEFAULT '#C0C0C0',
  description TEXT
);

-- ============================================
-- 3. category_rates'ten categories'a migrate
-- ============================================
INSERT INTO categories (name, label, hourly_rate, color, description)
SELECT 
  category as name,
  CASE category
    WHEN 'SILVER' THEN 'Silver'
    WHEN 'GOLD' THEN 'Gold'
    WHEN 'PLATINUM' THEN 'Platinum'
    WHEN 'ELITE' THEN 'Elite'
    WHEN 'RENDER' THEN 'Render'
  END as label,
  hourly_rate,
  CASE category
    WHEN 'SILVER' THEN '#C0C0C0'
    WHEN 'GOLD' THEN '#C9A227'
    WHEN 'PLATINUM' THEN '#5B6DAD'
    WHEN 'ELITE' THEN '#6B1BBA'
    WHEN 'RENDER' THEN '#00D4FF'
  END as color,
  CASE category
    WHEN 'SILVER' THEN 'Standart oyun ve internet kullanımı'
    WHEN 'GOLD' THEN 'Yüksek performans, popüler kategorilerde rahatlık'
    WHEN 'PLATINUM' THEN 'Üst seviye donanım, mekanik klavye + 240Hz monitör'
    WHEN 'ELITE' THEN 'Profesyonel oyuncular için ayrılmış özel istasyon'
    WHEN 'RENDER' THEN 'İş istasyonu — 3D render, video editing, AI workload'
  END as description
FROM category_rates
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label,
  hourly_rate = EXCLUDED.hourly_rate,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- ============================================
-- 4. tables.hourly_rate kaldır (veri yedekle)
-- ============================================
-- Önce yedekle
CREATE TABLE IF NOT EXISTS tables_hourly_rate_backup AS
SELECT id, number, hourly_rate FROM tables;

-- Kolonu kaldır
ALTER TABLE tables DROP COLUMN IF EXISTS hourly_rate;

-- ============================================
-- 5. Gerekli index'ler
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(start_time, end_time);
