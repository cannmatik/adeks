import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Auth gerekli', status: 401 } as const;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!['admin', 'super_admin'].includes(profile?.role)) return { error: 'Yetkisiz', status: 403 } as const;
  return { supabase } as const;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, label, hourly_rate, color, description, features } = await req.json();

    if (!name || !label || hourly_rate == null) {
      return NextResponse.json(
        { error: 'name, label ve hourly_rate zorunlu' },
        { status: 400 }
      );
    }

    // Uppercase category name for standard storage
    const categoryName = name.trim().toUpperCase();

    // Check if category already exists
    const { data: existing } = await auth.supabase
      .from('categories')
      .select('name')
      .eq('name', categoryName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Bu isimde bir kategori zaten mevcut' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase
      .from('categories')
      .insert({
        name: categoryName,
        label: label.trim(),
        hourly_rate: Number(hourly_rate),
        color: color || '#C0C0C0',
        description: description || null,
        features: Array.isArray(features) ? features : [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ category: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, label, hourly_rate, color, description, features } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'name alanı zorunlu' }, { status: 400 });
    }

    const updates: any = {};
    if (label !== undefined) updates.label = label.trim();
    if (hourly_rate !== undefined) updates.hourly_rate = Number(hourly_rate);
    if (color !== undefined) updates.color = color;
    if (description !== undefined) updates.description = description || null;
    if (features !== undefined && Array.isArray(features)) updates.features = features;

    const { data, error } = await auth.supabase
      .from('categories')
      .update(updates)
      .eq('name', name)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ category: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'name parametresi zorunlu' }, { status: 400 });
    }

    const categoryName = name.trim().toUpperCase();

    // Check if category is used by any tables
    const { data: tablesUse, error: tablesErr } = await auth.supabase
      .from('tables')
      .select('number')
      .eq('category', categoryName)
      .limit(1);

    if (tablesErr) {
      return NextResponse.json({ error: tablesErr.message }, { status: 400 });
    }

    if (tablesUse && tablesUse.length > 0) {
      return NextResponse.json(
        { error: `Bu kategoriye atanmış masalar (örn: Masa #${tablesUse[0].number}) bulunduğundan silinemez.` },
        { status: 400 }
      );
    }

    // Check if category is used by any rooms
    const { data: roomsUse, error: roomsErr } = await auth.supabase
      .from('rooms')
      .select('name')
      .eq('category', categoryName)
      .limit(1);

    if (roomsErr) {
      return NextResponse.json({ error: roomsErr.message }, { status: 400 });
    }

    if (roomsUse && roomsUse.length > 0) {
      return NextResponse.json(
        { error: `Bu kategoriye atanmış salonlar/odalar (örn: ${roomsUse[0].name}) bulunduğundan silinemez.` },
        { status: 400 }
      );
    }

    const { error: delErr } = await auth.supabase
      .from('categories')
      .delete()
      .eq('name', categoryName);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
