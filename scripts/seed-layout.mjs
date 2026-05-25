#!/usr/bin/env node
/**
 * SelCafe layout seed — service_role ile çalışır.
 *
 * Çalıştır:
 *   node scripts/seed-layout.mjs
 *
 * 1. Yeni rooms kolonlarının (floor, floor_col, ...) varlığını test eder.
 * 2. Yoksa: 6 satırlık ALTER TABLE'ı print eder, SQL Editor'da çalıştırmanı ister.
 * 3. Varsa: tüm reservations + tables + rooms verisini siler ve 18 section + 140 masa
 *    ile sıfırdan doldurur. category_rates fiyatlarını da SelCafe'ye eşitler.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('❌ .env içinde NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY yok.');
  process.exit(1);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// ---------- Step 1: column probe ----------
{
  const { error } = await sb.from('rooms').select('floor').limit(1);
  if (error && /floor/.test(error.message)) {
    console.error('');
    console.error('⚠️  rooms tablosunda yeni kolonlar yok. Önce Supabase SQL Editor\'a şu satırları yapıştır:');
    console.error('');
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor       text          NOT NULL DEFAULT '1';`);
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_col   int           NOT NULL DEFAULT 0;`);
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_row   int           NOT NULL DEFAULT 0;`);
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS col_span    int           NOT NULL DEFAULT 4;`);
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS row_span    int           NOT NULL DEFAULT 3;`);
    console.error(`   ALTER TABLE rooms ADD COLUMN IF NOT EXISTS category    table_category NULL;`);
    console.error('');
    console.error('   Sonra bu scripti tekrar çalıştır.');
    process.exit(1);
  } else if (error) {
    console.error('❌ rooms probe hatası:', error.message);
    process.exit(1);
  }
}

console.log('✅ Yeni kolonlar mevcut, seeding başlıyor...');

// ---------- Step 2: category_rates refresh ----------
{
  const rates = [
    { category: 'SILVER',   hourly_rate: 75 },
    { category: 'GOLD',     hourly_rate: 85 },
    { category: 'PLATINUM', hourly_rate: 100 },
    { category: 'ELITE',    hourly_rate: 180 },
    { category: 'RENDER',   hourly_rate: 270 },
  ];
  const { error } = await sb.from('category_rates').upsert(rates, { onConflict: 'category' });
  if (error) {
    console.error('❌ category_rates upsert hatası:', error.message);
    process.exit(1);
  }
  console.log('  category_rates güncellendi (75/85/100/180/270 ₺)');
}

// ---------- Step 3: wipe existing ----------
{
  console.log('  reservations → siliniyor');
  await sb.from('reservations').delete().not('id', 'is', null);
  console.log('  tables       → siliniyor');
  await sb.from('tables').delete().not('id', 'is', null);
  console.log('  rooms        → siliniyor');
  await sb.from('rooms').delete().not('id', 'is', null);
}

// ---------- Step 4: insert sections ----------
const sectionsSpec = [
  // FLOOR 2 (upper)
  { name: 'E2',            description: 'Elite gaming özel oda', color: '#6B1BBA', display_order: 1,  floor: '2', floor_col: 0,  floor_row: 0, col_span: 8,  row_span: 3, category: 'ELITE' },
  { name: 'E1',            description: 'Elite gaming özel oda', color: '#6B1BBA', display_order: 2,  floor: '2', floor_col: 0,  floor_row: 3, col_span: 2,  row_span: 3, category: 'ELITE' },
  { name: 'STREAM',        description: 'Stream / Render özel oda', color: '#00D4FF', display_order: 3,  floor: '2', floor_col: 8,  floor_row: 0, col_span: 2,  row_span: 4, category: 'RENDER' },
  { name: 'E3',            description: 'Elite gaming özel oda', color: '#6B1BBA', display_order: 4,  floor: '2', floor_col: 10, floor_row: 0, col_span: 3,  row_span: 6, category: 'ELITE' },
  { name: '2.KAT Orta',    description: '2. kat orta sıra',      color: '#5B6DAD', display_order: 5,  floor: '2', floor_col: 3,  floor_row: 6, col_span: 11, row_span: 3, category: 'PLATINUM' },
  { name: '2.KAT Alt',     description: '2. kat alt sıra',       color: '#5B6DAD', display_order: 6,  floor: '2', floor_col: 4,  floor_row: 9, col_span: 9,  row_span: 2, category: 'PLATINUM' },
  { name: '2.KAT Sağ-1',   description: '2. kat sağ blok 1',     color: '#5B6DAD', display_order: 7,  floor: '2', floor_col: 14, floor_row: 6, col_span: 2,  row_span: 5, category: 'PLATINUM' },
  { name: '2.KAT Sağ-2',   description: '2. kat sağ blok 2',     color: '#5B6DAD', display_order: 8,  floor: '2', floor_col: 16, floor_row: 6, col_span: 2,  row_span: 5, category: 'PLATINUM' },
  { name: '2.KAT Sağ-3',   description: '2. kat sağ blok 3',     color: '#5B6DAD', display_order: 9,  floor: '2', floor_col: 18, floor_row: 6, col_span: 2,  row_span: 5, category: 'PLATINUM' },
  { name: '2.KAT Sağ-4',   description: '2. kat sağ blok 4',     color: '#5B6DAD', display_order: 10, floor: '2', floor_col: 20, floor_row: 6, col_span: 1,  row_span: 3, category: 'PLATINUM' },

  // FLOOR 1 (lower)
  { name: '1.KAT Üst',     description: '1. kat üst sıra',        color: '#C9A227', display_order: 11, floor: '1', floor_col: 0,  floor_row: 0, col_span: 18, row_span: 2, category: 'GOLD' },
  { name: '1.KAT Sol-Üst', description: '1. kat sol üst grup',    color: '#C9A227', display_order: 12, floor: '1', floor_col: 3,  floor_row: 2, col_span: 4,  row_span: 2, category: 'GOLD' },
  { name: '1.KAT Sol',     description: '1. kat sol blok',        color: '#C9A227', display_order: 13, floor: '1', floor_col: 0,  floor_row: 4, col_span: 5,  row_span: 3, category: 'GOLD' },
  { name: '1.KAT Sol-Alt', description: '1. kat sol alt sıra',    color: '#C9A227', display_order: 14, floor: '1', floor_col: 0,  floor_row: 7, col_span: 4,  row_span: 1, category: 'GOLD' },
  { name: '1.KAT Alt-Orta',description: '1. kat orta alt grup',   color: '#C9A227', display_order: 15, floor: '1', floor_col: 4,  floor_row: 7, col_span: 3,  row_span: 1, category: 'GOLD' },
  { name: 'AdeksStore',    description: 'Mağaza tarafı Silver',   color: '#C0C0C0', display_order: 16, floor: '1', floor_col: 7,  floor_row: 7, col_span: 7,  row_span: 1, category: 'SILVER' },
  { name: '1.KAT Silver',  description: '1. kat sağ Silver bloğu',color: '#C0C0C0', display_order: 17, floor: '1', floor_col: 13, floor_row: 4, col_span: 6,  row_span: 2, category: 'SILVER' },
  { name: '1.KAT Render',  description: 'Render istasyonları',    color: '#00D4FF', display_order: 18, floor: '1', floor_col: 19, floor_row: 4, col_span: 4,  row_span: 2, category: 'RENDER' },
];

const { data: insertedRooms, error: roomErr } = await sb
  .from('rooms')
  .insert(sectionsSpec)
  .select('id, name');

if (roomErr) {
  console.error('❌ rooms insert hatası:', roomErr.message);
  process.exit(1);
}
console.log(`  ${insertedRooms.length} section eklendi`);

const roomId = (name) => {
  const r = insertedRooms.find((x) => x.name === name);
  if (!r) throw new Error(`Room not found: ${name}`);
  return r.id;
};

// ---------- Step 5: insert tables ----------
// [number, category, x, y, hourly_rate, roomName]
const tablesSpec = [
  // E2 (5x2)
  [117,'ELITE',0,0,180,'E2'],[118,'ELITE',1,0,180,'E2'],[119,'ELITE',2,0,180,'E2'],[120,'ELITE',3,0,180,'E2'],[121,'ELITE',4,0,180,'E2'],
  [113,'ELITE',0,1,180,'E2'],[114,'ELITE',1,1,180,'E2'],[115,'ELITE',2,1,180,'E2'],[116,'ELITE',3,1,180,'E2'],

  // E1 (1x2)
  [110,'ELITE',0,0,180,'E1'],[109,'ELITE',0,1,180,'E1'],

  // STREAM (1x3)
  [122,'RENDER',0,0,270,'STREAM'],[123,'RENDER',0,1,270,'STREAM'],[124,'RENDER',0,2,270,'STREAM'],

  // E3 (2x5)
  [194,'ELITE',0,0,180,'E3'],[195,'ELITE',1,0,180,'E3'],
  [193,'ELITE',0,1,180,'E3'],[196,'ELITE',1,1,180,'E3'],
  [192,'ELITE',0,2,180,'E3'],[197,'ELITE',1,2,180,'E3'],
  [191,'ELITE',0,3,180,'E3'],[198,'ELITE',1,3,180,'E3'],
  [190,'ELITE',0,4,180,'E3'],[199,'ELITE',1,4,180,'E3'],

  // 2.KAT Orta (10x2)
  [125,'PLATINUM',0,0,100,'2.KAT Orta'],[126,'PLATINUM',1,0,100,'2.KAT Orta'],[127,'PLATINUM',2,0,100,'2.KAT Orta'],[128,'PLATINUM',3,0,100,'2.KAT Orta'],[129,'PLATINUM',4,0,100,'2.KAT Orta'],
  [130,'PLATINUM',5,0,100,'2.KAT Orta'],[131,'PLATINUM',6,0,100,'2.KAT Orta'],[132,'PLATINUM',7,0,100,'2.KAT Orta'],[133,'PLATINUM',8,0,100,'2.KAT Orta'],[134,'PLATINUM',9,0,100,'2.KAT Orta'],
  [146,'PLATINUM',0,1,100,'2.KAT Orta'],[145,'PLATINUM',1,1,100,'2.KAT Orta'],[144,'PLATINUM',2,1,100,'2.KAT Orta'],[143,'PLATINUM',3,1,100,'2.KAT Orta'],[142,'PLATINUM',4,1,100,'2.KAT Orta'],
  [141,'PLATINUM',5,1,100,'2.KAT Orta'],[140,'PLATINUM',6,1,100,'2.KAT Orta'],[139,'PLATINUM',7,1,100,'2.KAT Orta'],[138,'PLATINUM',8,1,100,'2.KAT Orta'],[137,'PLATINUM',9,1,100,'2.KAT Orta'],

  // 2.KAT Alt (8x1)
  [105,'PLATINUM',0,0,100,'2.KAT Alt'],[104,'PLATINUM',1,0,100,'2.KAT Alt'],[103,'PLATINUM',2,0,100,'2.KAT Alt'],[102,'PLATINUM',3,0,100,'2.KAT Alt'],
  [101,'PLATINUM',4,0,100,'2.KAT Alt'],[100,'PLATINUM',5,0,100,'2.KAT Alt'],[ 99,'PLATINUM',6,0,100,'2.KAT Alt'],[ 98,'PLATINUM',7,0,100,'2.KAT Alt'],

  // 2.KAT Sağ-1 (2x5)
  [158,'PLATINUM',0,0,100,'2.KAT Sağ-1'],[159,'PLATINUM',1,0,100,'2.KAT Sağ-1'],
  [157,'PLATINUM',0,1,100,'2.KAT Sağ-1'],[160,'PLATINUM',1,1,100,'2.KAT Sağ-1'],
  [156,'PLATINUM',0,2,100,'2.KAT Sağ-1'],[161,'PLATINUM',1,2,100,'2.KAT Sağ-1'],
  [155,'PLATINUM',0,3,100,'2.KAT Sağ-1'],[162,'PLATINUM',1,3,100,'2.KAT Sağ-1'],
  [154,'PLATINUM',0,4,100,'2.KAT Sağ-1'],[163,'PLATINUM',1,4,100,'2.KAT Sağ-1'],

  // 2.KAT Sağ-2 (2x5)
  [168,'PLATINUM',0,0,100,'2.KAT Sağ-2'],[169,'PLATINUM',1,0,100,'2.KAT Sağ-2'],
  [167,'PLATINUM',0,1,100,'2.KAT Sağ-2'],[170,'PLATINUM',1,1,100,'2.KAT Sağ-2'],
  [166,'PLATINUM',0,2,100,'2.KAT Sağ-2'],[171,'PLATINUM',1,2,100,'2.KAT Sağ-2'],
  [165,'PLATINUM',0,3,100,'2.KAT Sağ-2'],[172,'PLATINUM',1,3,100,'2.KAT Sağ-2'],
  [164,'PLATINUM',0,4,100,'2.KAT Sağ-2'],[173,'PLATINUM',1,4,100,'2.KAT Sağ-2'],

  // 2.KAT Sağ-3 (2x5, 174 tek)
  [178,'PLATINUM',0,0,100,'2.KAT Sağ-3'],[179,'PLATINUM',1,0,100,'2.KAT Sağ-3'],
  [177,'PLATINUM',0,1,100,'2.KAT Sağ-3'],[180,'PLATINUM',1,1,100,'2.KAT Sağ-3'],
  [176,'PLATINUM',0,2,100,'2.KAT Sağ-3'],[181,'PLATINUM',1,2,100,'2.KAT Sağ-3'],
  [175,'PLATINUM',0,3,100,'2.KAT Sağ-3'],[182,'PLATINUM',1,3,100,'2.KAT Sağ-3'],
  [174,'PLATINUM',1,4,100,'2.KAT Sağ-3'],

  // 2.KAT Sağ-4 (1x3)
  [188,'PLATINUM',0,0,100,'2.KAT Sağ-4'],[187,'PLATINUM',0,1,100,'2.KAT Sağ-4'],[186,'PLATINUM',0,2,100,'2.KAT Sağ-4'],

  // 1.KAT Üst (10x1)
  [225,'GOLD',0,0,85,'1.KAT Üst'],[209,'GOLD',1,0,85,'1.KAT Üst'],[210,'GOLD',2,0,85,'1.KAT Üst'],[211,'GOLD',3,0,85,'1.KAT Üst'],
  [230,'GOLD',4,0,85,'1.KAT Üst'],[231,'GOLD',5,0,85,'1.KAT Üst'],[235,'GOLD',6,0,85,'1.KAT Üst'],[236,'GOLD',7,0,85,'1.KAT Üst'],
  [237,'GOLD',8,0,85,'1.KAT Üst'],[200,'GOLD',9,0,85,'1.KAT Üst'],

  // 1.KAT Sol-Üst (3x2)
  [221,'GOLD',0,0,85,'1.KAT Sol-Üst'],[219,'GOLD',1,0,85,'1.KAT Sol-Üst'],
  [222,'GOLD',0,1,85,'1.KAT Sol-Üst'],[223,'GOLD',1,1,85,'1.KAT Sol-Üst'],[224,'GOLD',2,1,85,'1.KAT Sol-Üst'],

  // 1.KAT Sol (5x2)
  [216,'GOLD',0,0,85,'1.KAT Sol'],[212,'GOLD',1,0,85,'1.KAT Sol'],[213,'GOLD',2,0,85,'1.KAT Sol'],[214,'GOLD',3,0,85,'1.KAT Sol'],[215,'GOLD',4,0,85,'1.KAT Sol'],
  [202,'GOLD',1,1,85,'1.KAT Sol'],[203,'GOLD',2,1,85,'1.KAT Sol'],[204,'GOLD',3,1,85,'1.KAT Sol'],

  // 1.KAT Sol-Alt (4x1)
  [205,'GOLD',0,0,85,'1.KAT Sol-Alt'],[206,'GOLD',1,0,85,'1.KAT Sol-Alt'],[207,'GOLD',2,0,85,'1.KAT Sol-Alt'],[208,'GOLD',3,0,85,'1.KAT Sol-Alt'],

  // 1.KAT Alt-Orta (3x1)
  [226,'GOLD',0,0,85,'1.KAT Alt-Orta'],[227,'GOLD',1,0,85,'1.KAT Alt-Orta'],[228,'GOLD',2,0,85,'1.KAT Alt-Orta'],

  // AdeksStore (7x1, Silver)
  [52,'SILVER',0,0,75,'AdeksStore'],[51,'SILVER',1,0,75,'AdeksStore'],[50,'SILVER',2,0,75,'AdeksStore'],[49,'SILVER',3,0,75,'AdeksStore'],
  [48,'SILVER',4,0,75,'AdeksStore'],[47,'SILVER',5,0,75,'AdeksStore'],[46,'SILVER',6,0,75,'AdeksStore'],

  // 1.KAT Silver (üst 39-43, alt 90-95)
  [43,'SILVER',0,0,75,'1.KAT Silver'],[42,'SILVER',1,0,75,'1.KAT Silver'],[41,'SILVER',2,0,75,'1.KAT Silver'],[40,'SILVER',3,0,75,'1.KAT Silver'],[39,'SILVER',4,0,75,'1.KAT Silver'],
  [90,'SILVER',0,1,75,'1.KAT Silver'],[91,'SILVER',1,1,75,'1.KAT Silver'],[92,'SILVER',2,1,75,'1.KAT Silver'],[93,'SILVER',3,1,75,'1.KAT Silver'],[94,'SILVER',4,1,75,'1.KAT Silver'],[95,'SILVER',5,1,75,'1.KAT Silver'],

  // 1.KAT Render (üst 246-249, alt 245-242)
  [246,'RENDER',0,0,270,'1.KAT Render'],[247,'RENDER',1,0,270,'1.KAT Render'],[248,'RENDER',2,0,270,'1.KAT Render'],[249,'RENDER',3,0,270,'1.KAT Render'],
  [245,'RENDER',0,1,270,'1.KAT Render'],[244,'RENDER',1,1,270,'1.KAT Render'],[243,'RENDER',2,1,270,'1.KAT Render'],[242,'RENDER',3,1,270,'1.KAT Render'],
];

const tableRows = tablesSpec.map(([number, category, x, y, hourly_rate, roomName]) => ({
  number,
  category,
  status: 'AVAILABLE',
  hourly_rate,
  position_x: x,
  position_y: y,
  room_id: roomId(roomName),
}));

const { error: tblErr } = await sb.from('tables').insert(tableRows);
if (tblErr) {
  console.error('❌ tables insert hatası:', tblErr.message);
  process.exit(1);
}
console.log(`  ${tableRows.length} masa eklendi`);

console.log('');
console.log('🎉 Tamamlandı. Dashboard\'u (http://localhost:3000/dashboard) refresh edebilirsin.');
