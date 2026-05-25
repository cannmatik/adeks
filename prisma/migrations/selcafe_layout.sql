-- =============================================================
-- SelCafe-style floor layout: sections (rooms) with absolute
-- positions + per-section table grids.
-- Run this in Supabase SQL Editor (or psql) as a single batch.
-- Idempotent: re-running wipes & re-seeds tables + sections.
-- =============================================================

-- 1. Add new columns to rooms (idempotent)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor       text          NOT NULL DEFAULT '1';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_col   int           NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_row   int           NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS col_span    int           NOT NULL DEFAULT 4;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS row_span    int           NOT NULL DEFAULT 3;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS category    table_category NULL;

-- 2. Refresh category prices to match SelCafe legend
INSERT INTO category_rates (category, hourly_rate) VALUES
  ('SILVER',   75),
  ('GOLD',     85),
  ('PLATINUM', 100),
  ('ELITE',    180),
  ('RENDER',   270)
ON CONFLICT (category) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate;

-- 3. Wipe existing data and reseed
DO $$
DECLARE
  r_e2          uuid;
  r_e1          uuid;
  r_stream      uuid;
  r_e3          uuid;
  r_k2_orta     uuid;
  r_k2_alt      uuid;
  r_k2_sag1     uuid;
  r_k2_sag2     uuid;
  r_k2_sag3     uuid;
  r_k2_sag4     uuid;
  r_k1_ust      uuid;
  r_k1_sol_ust  uuid;
  r_k1_sol      uuid;
  r_k1_sol_alt  uuid;
  r_k1_alt_orta uuid;
  r_store       uuid;
  r_k1_silver   uuid;
  r_k1_render   uuid;
BEGIN
  DELETE FROM reservations;
  DELETE FROM tables;
  DELETE FROM rooms;

  -- ----------- FLOOR 2 (upper) -----------
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('E2', 'Elite gaming özel oda', '#6B1BBA', 1, '2', 0, 0, 8, 3, 'ELITE') RETURNING id INTO r_e2;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('E1', 'Elite gaming özel oda', '#6B1BBA', 2, '2', 0, 3, 2, 3, 'ELITE') RETURNING id INTO r_e1;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('STREAM', 'Stream / Render özel oda', '#00D4FF', 3, '2', 8, 0, 2, 4, 'RENDER') RETURNING id INTO r_stream;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('E3', 'Elite gaming özel oda', '#6B1BBA', 4, '2', 10, 0, 3, 6, 'ELITE') RETURNING id INTO r_e3;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Orta', '2. kat orta sıra', '#5B6DAD', 5, '2', 3, 6, 11, 3, 'PLATINUM') RETURNING id INTO r_k2_orta;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Alt', '2. kat alt sıra', '#5B6DAD', 6, '2', 4, 9, 9, 2, 'PLATINUM') RETURNING id INTO r_k2_alt;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Sağ-1', '2. kat sağ blok 1', '#5B6DAD', 7, '2', 14, 6, 2, 5, 'PLATINUM') RETURNING id INTO r_k2_sag1;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Sağ-2', '2. kat sağ blok 2', '#5B6DAD', 8, '2', 16, 6, 2, 5, 'PLATINUM') RETURNING id INTO r_k2_sag2;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Sağ-3', '2. kat sağ blok 3', '#5B6DAD', 9, '2', 18, 6, 2, 5, 'PLATINUM') RETURNING id INTO r_k2_sag3;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('2.KAT Sağ-4', '2. kat sağ blok 4', '#5B6DAD', 10, '2', 20, 6, 1, 3, 'PLATINUM') RETURNING id INTO r_k2_sag4;

  -- ----------- FLOOR 1 (lower) -----------
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Üst', '1. kat üst sıra', '#C9A227', 11, '1', 0, 0, 18, 2, 'GOLD') RETURNING id INTO r_k1_ust;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Sol-Üst', '1. kat sol üst grup', '#C9A227', 12, '1', 3, 2, 4, 2, 'GOLD') RETURNING id INTO r_k1_sol_ust;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Sol', '1. kat sol blok', '#C9A227', 13, '1', 0, 4, 5, 3, 'GOLD') RETURNING id INTO r_k1_sol;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Sol-Alt', '1. kat sol alt sıra', '#C9A227', 14, '1', 0, 7, 4, 1, 'GOLD') RETURNING id INTO r_k1_sol_alt;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Alt-Orta', '1. kat orta alt grup', '#C9A227', 15, '1', 4, 7, 3, 1, 'GOLD') RETURNING id INTO r_k1_alt_orta;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('AdeksStore', 'Mağaza tarafı Silver hattı', '#C0C0C0', 16, '1', 7, 7, 7, 1, 'SILVER') RETURNING id INTO r_store;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Silver', '1. kat sağ Silver bloğu', '#C0C0C0', 17, '1', 13, 4, 6, 2, 'SILVER') RETURNING id INTO r_k1_silver;
  INSERT INTO rooms (name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)
    VALUES ('1.KAT Render', 'Render istasyonları', '#00D4FF', 18, '1', 19, 4, 4, 2, 'RENDER') RETURNING id INTO r_k1_render;

  -- ----------- TABLES -----------
  -- (category, status, hourly_rate default; status defaults via column)
  INSERT INTO tables (number, category, status, hourly_rate, position_x, position_y, room_id) VALUES
    -- E2 (5x2 grid, last row 4 tables)
    (117, 'ELITE', 'AVAILABLE', 180, 0, 0, r_e2),
    (118, 'ELITE', 'AVAILABLE', 180, 1, 0, r_e2),
    (119, 'ELITE', 'AVAILABLE', 180, 2, 0, r_e2),
    (120, 'ELITE', 'AVAILABLE', 180, 3, 0, r_e2),
    (121, 'ELITE', 'AVAILABLE', 180, 4, 0, r_e2),
    (113, 'ELITE', 'AVAILABLE', 180, 0, 1, r_e2),
    (114, 'ELITE', 'AVAILABLE', 180, 1, 1, r_e2),
    (115, 'ELITE', 'AVAILABLE', 180, 2, 1, r_e2),
    (116, 'ELITE', 'AVAILABLE', 180, 3, 1, r_e2),

    -- E1 (1x2)
    (110, 'ELITE', 'AVAILABLE', 180, 0, 0, r_e1),
    (109, 'ELITE', 'AVAILABLE', 180, 0, 1, r_e1),

    -- STREAM (1x3, RENDER category)
    (122, 'RENDER', 'AVAILABLE', 270, 0, 0, r_stream),
    (123, 'RENDER', 'AVAILABLE', 270, 0, 1, r_stream),
    (124, 'RENDER', 'AVAILABLE', 270, 0, 2, r_stream),

    -- E3 (2x5)
    (194, 'ELITE', 'AVAILABLE', 180, 0, 0, r_e3),
    (195, 'ELITE', 'AVAILABLE', 180, 1, 0, r_e3),
    (193, 'ELITE', 'AVAILABLE', 180, 0, 1, r_e3),
    (196, 'ELITE', 'AVAILABLE', 180, 1, 1, r_e3),
    (192, 'ELITE', 'AVAILABLE', 180, 0, 2, r_e3),
    (197, 'ELITE', 'AVAILABLE', 180, 1, 2, r_e3),
    (191, 'ELITE', 'AVAILABLE', 180, 0, 3, r_e3),
    (198, 'ELITE', 'AVAILABLE', 180, 1, 3, r_e3),
    (190, 'ELITE', 'AVAILABLE', 180, 0, 4, r_e3),
    (199, 'ELITE', 'AVAILABLE', 180, 1, 4, r_e3),

    -- 2.KAT Orta (10x2)
    (125, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_orta),
    (126, 'PLATINUM', 'AVAILABLE', 100, 1, 0, r_k2_orta),
    (127, 'PLATINUM', 'AVAILABLE', 100, 2, 0, r_k2_orta),
    (128, 'PLATINUM', 'AVAILABLE', 100, 3, 0, r_k2_orta),
    (129, 'PLATINUM', 'AVAILABLE', 100, 4, 0, r_k2_orta),
    (130, 'PLATINUM', 'AVAILABLE', 100, 5, 0, r_k2_orta),
    (131, 'PLATINUM', 'AVAILABLE', 100, 6, 0, r_k2_orta),
    (132, 'PLATINUM', 'AVAILABLE', 100, 7, 0, r_k2_orta),
    (133, 'PLATINUM', 'AVAILABLE', 100, 8, 0, r_k2_orta),
    (134, 'PLATINUM', 'AVAILABLE', 100, 9, 0, r_k2_orta),
    (146, 'PLATINUM', 'AVAILABLE', 100, 0, 1, r_k2_orta),
    (145, 'PLATINUM', 'AVAILABLE', 100, 1, 1, r_k2_orta),
    (144, 'PLATINUM', 'AVAILABLE', 100, 2, 1, r_k2_orta),
    (143, 'PLATINUM', 'AVAILABLE', 100, 3, 1, r_k2_orta),
    (142, 'PLATINUM', 'AVAILABLE', 100, 4, 1, r_k2_orta),
    (141, 'PLATINUM', 'AVAILABLE', 100, 5, 1, r_k2_orta),
    (140, 'PLATINUM', 'AVAILABLE', 100, 6, 1, r_k2_orta),
    (139, 'PLATINUM', 'AVAILABLE', 100, 7, 1, r_k2_orta),
    (138, 'PLATINUM', 'AVAILABLE', 100, 8, 1, r_k2_orta),
    (137, 'PLATINUM', 'AVAILABLE', 100, 9, 1, r_k2_orta),

    -- 2.KAT Alt (8x1)
    (105, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_alt),
    (104, 'PLATINUM', 'AVAILABLE', 100, 1, 0, r_k2_alt),
    (103, 'PLATINUM', 'AVAILABLE', 100, 2, 0, r_k2_alt),
    (102, 'PLATINUM', 'AVAILABLE', 100, 3, 0, r_k2_alt),
    (101, 'PLATINUM', 'AVAILABLE', 100, 4, 0, r_k2_alt),
    (100, 'PLATINUM', 'AVAILABLE', 100, 5, 0, r_k2_alt),
    ( 99, 'PLATINUM', 'AVAILABLE', 100, 6, 0, r_k2_alt),
    ( 98, 'PLATINUM', 'AVAILABLE', 100, 7, 0, r_k2_alt),

    -- 2.KAT Sağ-1 (2x5)
    (158, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_sag1),
    (159, 'PLATINUM', 'AVAILABLE', 100, 1, 0, r_k2_sag1),
    (157, 'PLATINUM', 'AVAILABLE', 100, 0, 1, r_k2_sag1),
    (160, 'PLATINUM', 'AVAILABLE', 100, 1, 1, r_k2_sag1),
    (156, 'PLATINUM', 'AVAILABLE', 100, 0, 2, r_k2_sag1),
    (161, 'PLATINUM', 'AVAILABLE', 100, 1, 2, r_k2_sag1),
    (155, 'PLATINUM', 'AVAILABLE', 100, 0, 3, r_k2_sag1),
    (162, 'PLATINUM', 'AVAILABLE', 100, 1, 3, r_k2_sag1),
    (154, 'PLATINUM', 'AVAILABLE', 100, 0, 4, r_k2_sag1),
    (163, 'PLATINUM', 'AVAILABLE', 100, 1, 4, r_k2_sag1),

    -- 2.KAT Sağ-2 (2x5)
    (168, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_sag2),
    (169, 'PLATINUM', 'AVAILABLE', 100, 1, 0, r_k2_sag2),
    (167, 'PLATINUM', 'AVAILABLE', 100, 0, 1, r_k2_sag2),
    (170, 'PLATINUM', 'AVAILABLE', 100, 1, 1, r_k2_sag2),
    (166, 'PLATINUM', 'AVAILABLE', 100, 0, 2, r_k2_sag2),
    (171, 'PLATINUM', 'AVAILABLE', 100, 1, 2, r_k2_sag2),
    (165, 'PLATINUM', 'AVAILABLE', 100, 0, 3, r_k2_sag2),
    (172, 'PLATINUM', 'AVAILABLE', 100, 1, 3, r_k2_sag2),
    (164, 'PLATINUM', 'AVAILABLE', 100, 0, 4, r_k2_sag2),
    (173, 'PLATINUM', 'AVAILABLE', 100, 1, 4, r_k2_sag2),

    -- 2.KAT Sağ-3 (2x5, son satırda tek 174)
    (178, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_sag3),
    (179, 'PLATINUM', 'AVAILABLE', 100, 1, 0, r_k2_sag3),
    (177, 'PLATINUM', 'AVAILABLE', 100, 0, 1, r_k2_sag3),
    (180, 'PLATINUM', 'AVAILABLE', 100, 1, 1, r_k2_sag3),
    (176, 'PLATINUM', 'AVAILABLE', 100, 0, 2, r_k2_sag3),
    (181, 'PLATINUM', 'AVAILABLE', 100, 1, 2, r_k2_sag3),
    (175, 'PLATINUM', 'AVAILABLE', 100, 0, 3, r_k2_sag3),
    (182, 'PLATINUM', 'AVAILABLE', 100, 1, 3, r_k2_sag3),
    (174, 'PLATINUM', 'AVAILABLE', 100, 1, 4, r_k2_sag3),

    -- 2.KAT Sağ-4 (1x3)
    (188, 'PLATINUM', 'AVAILABLE', 100, 0, 0, r_k2_sag4),
    (187, 'PLATINUM', 'AVAILABLE', 100, 0, 1, r_k2_sag4),
    (186, 'PLATINUM', 'AVAILABLE', 100, 0, 2, r_k2_sag4),

    -- 1.KAT Üst (10x1, sparse spacing yok — sıralı)
    (225, 'GOLD', 'AVAILABLE', 85, 0, 0, r_k1_ust),
    (209, 'GOLD', 'AVAILABLE', 85, 1, 0, r_k1_ust),
    (210, 'GOLD', 'AVAILABLE', 85, 2, 0, r_k1_ust),
    (211, 'GOLD', 'AVAILABLE', 85, 3, 0, r_k1_ust),
    (230, 'GOLD', 'AVAILABLE', 85, 4, 0, r_k1_ust),
    (231, 'GOLD', 'AVAILABLE', 85, 5, 0, r_k1_ust),
    (235, 'GOLD', 'AVAILABLE', 85, 6, 0, r_k1_ust),
    (236, 'GOLD', 'AVAILABLE', 85, 7, 0, r_k1_ust),
    (237, 'GOLD', 'AVAILABLE', 85, 8, 0, r_k1_ust),
    (200, 'GOLD', 'AVAILABLE', 85, 9, 0, r_k1_ust),

    -- 1.KAT Sol-Üst (3x2)
    (221, 'GOLD', 'AVAILABLE', 85, 0, 0, r_k1_sol_ust),
    (219, 'GOLD', 'AVAILABLE', 85, 1, 0, r_k1_sol_ust),
    (222, 'GOLD', 'AVAILABLE', 85, 0, 1, r_k1_sol_ust),
    (223, 'GOLD', 'AVAILABLE', 85, 1, 1, r_k1_sol_ust),
    (224, 'GOLD', 'AVAILABLE', 85, 2, 1, r_k1_sol_ust),

    -- 1.KAT Sol (5x2)
    (216, 'GOLD', 'AVAILABLE', 85, 0, 0, r_k1_sol),
    (212, 'GOLD', 'AVAILABLE', 85, 1, 0, r_k1_sol),
    (213, 'GOLD', 'AVAILABLE', 85, 2, 0, r_k1_sol),
    (214, 'GOLD', 'AVAILABLE', 85, 3, 0, r_k1_sol),
    (215, 'GOLD', 'AVAILABLE', 85, 4, 0, r_k1_sol),
    (202, 'GOLD', 'AVAILABLE', 85, 1, 1, r_k1_sol),
    (203, 'GOLD', 'AVAILABLE', 85, 2, 1, r_k1_sol),
    (204, 'GOLD', 'AVAILABLE', 85, 3, 1, r_k1_sol),

    -- 1.KAT Sol-Alt (4x1)
    (205, 'GOLD', 'AVAILABLE', 85, 0, 0, r_k1_sol_alt),
    (206, 'GOLD', 'AVAILABLE', 85, 1, 0, r_k1_sol_alt),
    (207, 'GOLD', 'AVAILABLE', 85, 2, 0, r_k1_sol_alt),
    (208, 'GOLD', 'AVAILABLE', 85, 3, 0, r_k1_sol_alt),

    -- 1.KAT Alt-Orta (3x1)
    (226, 'GOLD', 'AVAILABLE', 85, 0, 0, r_k1_alt_orta),
    (227, 'GOLD', 'AVAILABLE', 85, 1, 0, r_k1_alt_orta),
    (228, 'GOLD', 'AVAILABLE', 85, 2, 0, r_k1_alt_orta),

    -- AdeksStore (7x1, Silver)
    (52, 'SILVER', 'AVAILABLE', 75, 0, 0, r_store),
    (51, 'SILVER', 'AVAILABLE', 75, 1, 0, r_store),
    (50, 'SILVER', 'AVAILABLE', 75, 2, 0, r_store),
    (49, 'SILVER', 'AVAILABLE', 75, 3, 0, r_store),
    (48, 'SILVER', 'AVAILABLE', 75, 4, 0, r_store),
    (47, 'SILVER', 'AVAILABLE', 75, 5, 0, r_store),
    (46, 'SILVER', 'AVAILABLE', 75, 6, 0, r_store),

    -- 1.KAT Silver (üst: 39-43 / alt: 90-95)
    (43, 'SILVER', 'AVAILABLE', 75, 0, 0, r_k1_silver),
    (42, 'SILVER', 'AVAILABLE', 75, 1, 0, r_k1_silver),
    (41, 'SILVER', 'AVAILABLE', 75, 2, 0, r_k1_silver),
    (40, 'SILVER', 'AVAILABLE', 75, 3, 0, r_k1_silver),
    (39, 'SILVER', 'AVAILABLE', 75, 4, 0, r_k1_silver),
    (90, 'SILVER', 'AVAILABLE', 75, 0, 1, r_k1_silver),
    (91, 'SILVER', 'AVAILABLE', 75, 1, 1, r_k1_silver),
    (92, 'SILVER', 'AVAILABLE', 75, 2, 1, r_k1_silver),
    (93, 'SILVER', 'AVAILABLE', 75, 3, 1, r_k1_silver),
    (94, 'SILVER', 'AVAILABLE', 75, 4, 1, r_k1_silver),
    (95, 'SILVER', 'AVAILABLE', 75, 5, 1, r_k1_silver),

    -- 1.KAT Render (üst 246-249 / alt 245-242, hepsi RENDER)
    (246, 'RENDER', 'AVAILABLE', 270, 0, 0, r_k1_render),
    (247, 'RENDER', 'AVAILABLE', 270, 1, 0, r_k1_render),
    (248, 'RENDER', 'AVAILABLE', 270, 2, 0, r_k1_render),
    (249, 'RENDER', 'AVAILABLE', 270, 3, 0, r_k1_render),
    (245, 'RENDER', 'AVAILABLE', 270, 0, 1, r_k1_render),
    (244, 'RENDER', 'AVAILABLE', 270, 1, 1, r_k1_render),
    (243, 'RENDER', 'AVAILABLE', 270, 2, 1, r_k1_render),
    (242, 'RENDER', 'AVAILABLE', 270, 3, 1, r_k1_render);
END $$;

-- 4. Sanity check
SELECT
  r.floor,
  r.name,
  r.floor_col,
  r.floor_row,
  r.col_span,
  r.row_span,
  r.category,
  COUNT(t.id) AS table_count
FROM rooms r
LEFT JOIN tables t ON t.room_id = r.id
GROUP BY r.id
ORDER BY r.floor DESC, r.display_order;
