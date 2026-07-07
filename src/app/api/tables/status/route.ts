import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth gerekli' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const excludeReservationId = searchParams.get('excludeReservationId');

  if (!start || !end) {
    return NextResponse.json({ error: 'start ve end zorunlu' }, { status: 400 });
  }
  if (new Date(end) <= new Date(start)) {
    return NextResponse.json({ error: 'Bitiş başlangıçtan sonra olmalı' }, { status: 400 });
  }

  // Çalışma saatleri kontrolü
  try {
    const { data: settings } = await supabase.from('cafe_settings').select('*').eq('id', 'default').single();
    if (settings && settings.open_time && settings.close_time) {
      const openMinutes = parseInt(settings.open_time.split(':')[0]) * 60 + parseInt(settings.open_time.split(':')[1]);
      const closeMinutes = parseInt(settings.close_time.split(':')[0]) * 60 + parseInt(settings.close_time.split(':')[1]);
      
      const getTRDate = (isoString: string) => new Date(new Date(isoString).getTime() + 3 * 60 * 60 * 1000);
      const startTR = getTRDate(start as string);
      const endTR = getTRDate(end as string);
      
      const getCafeDayStartMs = (trDate: Date, openMins: number, closeMins: number) => {
        const currentMins = trDate.getUTCHours() * 60 + trDate.getUTCMinutes();
        const dayStart = new Date(Date.UTC(trDate.getUTCFullYear(), trDate.getUTCMonth(), trDate.getUTCDate(), 0, 0, 0));
        
        if (closeMins <= openMins) {
          if (currentMins < closeMins) dayStart.setUTCDate(dayStart.getUTCDate() - 1);
        } else {
          if (currentMins < openMins) dayStart.setUTCDate(dayStart.getUTCDate() - 1);
        }
        return dayStart.getTime() + openMins * 60 * 1000;
      };

      const shiftStartMsTR = getCafeDayStartMs(startTR, openMinutes, closeMinutes);
      const shiftDurationMins = closeMinutes <= openMinutes ? (24 * 60 - openMinutes + closeMinutes) : (closeMinutes - openMinutes);
      const shiftEndMsTR = shiftStartMsTR + shiftDurationMins * 60 * 1000;

      const startMsTR = startTR.getTime();
      const endMsTR = endTR.getTime();

      if (startMsTR < shiftStartMsTR || startMsTR >= shiftEndMsTR || endMsTR > shiftEndMsTR) {
        return NextResponse.json(
          { error: `Çalışma saatleri dışına veya gün aşırı rezervasyon yapılamaz. (Mesaî: ${settings.open_time} - ${settings.close_time})` },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    console.error('Working hours check error:', e);
  }

  // 1) Çakışan rezervasyonları bul (HOLD + CONFIRMED)
  let overlapQuery = supabase
    .from('reservations')
    .select('id, status, reservation_tables(table_id)')
    .in('status', ['HOLD', 'CONFIRMED'])
    .lt('start_time', end)
    .gt('end_time', start);
  if (excludeReservationId) {
    overlapQuery = overlapQuery.neq('id', excludeReservationId);
  }
  const { data: overlappingRes, error: rErr } = await overlapQuery;

  // HOLD enum değeri yoksa sadece CONFIRMED'a düş
  const reservationMap = new Map<string, 'HOLD' | 'CONFIRMED'>();
  if (!rErr) {
    for (const r of overlappingRes ?? []) {
      const status = r.status as 'HOLD' | 'CONFIRMED';
      const rts = (r as any).reservation_tables ?? [];
      for (const rt of rts) {
        reservationMap.set(rt.table_id, status);
      }
    }
  } else {
    console.warn('status reservations query failed (HOLD may not exist yet):', rErr.message);
  }

  // 2) Aktif table_sessions bul (Sadece 'start' bugünün cafe günündeyse)
  let sessionIds = new Set<string>();
  
  function getCafeDate(d: Date) {
    const trTimeMs = d.getTime() + (3 * 60 * 60 * 1000);
    const trDate = new Date(trTimeMs);
    trDate.setUTCHours(trDate.getUTCHours() - 2);
    return trDate.toISOString().split('T')[0];
  }

  const isSameCafeDay = getCafeDate(new Date(start)) === getCafeDate(new Date());

  if (isSameCafeDay) {
    try {
      const { data: activeSessions } = await supabase
        .from('table_sessions')
        .select('table_id')
        .is('ended_at', null);
      sessionIds = new Set((activeSessions ?? []).map((s: any) => s.table_id));
    } catch {
      // table_sessions tablosu yoksa yoksay
    }
  }

  // 3) Tüm masaları çek — oda ve kategori fiyatı ile
  const { data: tables, error: tErr } = await supabase
    .from('tables')
    .select('id, number, category, status, pc_id, position_x, position_y, notes, shape, room:rooms(id, name, description, color, display_order, floor, floor_col, floor_row, col_span, row_span, category)')
    .order('number', { ascending: true });

  if (tErr) {
    console.error('status tables error:', tErr);
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  const { data: rates } = await supabase.from('categories').select('name, hourly_rate');
  const rateMap: Record<string, number> = {};
  for (const r of rates ?? []) rateMap[(r as any).name] = Number((r as any).hourly_rate);

  const result = (tables ?? []).map((t: any) => {
    let booking_status: 'AVAILABLE' | 'HOLD' | 'CONFIRMED' | 'IN_USE' = 'AVAILABLE';
    if (t.status === 'MAINTENANCE') {
      booking_status = 'AVAILABLE';
    } else if (sessionIds.has(t.id)) {
      booking_status = 'IN_USE';
    } else if (reservationMap.has(t.id)) {
      booking_status = reservationMap.get(t.id)!;
    }

    return {
      ...t,
      booking_status,
      hourly_rate: rateMap[t.category] ?? null,
    };
  });

  return NextResponse.json({ tables: result });
}
