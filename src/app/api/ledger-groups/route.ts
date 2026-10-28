import { NextResponse } from 'next/server';
import { STANDARD_ACCOUNTING_GROUPS } from '@/data/standardGroups';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: STANDARD_ACCOUNTING_GROUPS,
    count: STANDARD_ACCOUNTING_GROUPS.length,
  });
}
