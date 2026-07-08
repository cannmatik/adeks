import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../../src/generated/prisma/index.js';

const prisma = new PrismaClient();

export async function GET() {
  return NextResponse.json({ success: true, message: 'Already seeded' });
}
