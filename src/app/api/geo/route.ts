import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let ip = '';
    try {
      const headersList = await headers();
      const forwarded = headersList.get('x-forwarded-for');
      ip = forwarded ? forwarded.split(',')[0] : '';
    } catch (e) {
      // Silence header errors
    }

    const url = ip && ip !== '::1' && ip !== '127.0.0.1'
      ? `https://freeipapi.com/api/json/${ip}`
      : `https://freeipapi.com/api/json`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    
    if (!res.ok) throw new Error('API Down');
    
    const data = await res.json();
    
    return NextResponse.json({
      city: data.cityName || 'Unknown',
      country: data.countryName || 'Unknown',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0
    });
  } catch (error) {
    return NextResponse.json({
      city: 'Local Gateway',
      country: 'Vivah Network',
      latitude: 0,
      longitude: 0,
      error: true
    });
  }
}
