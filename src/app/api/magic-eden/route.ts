import { NextRequest, NextResponse } from 'next/server';

// Simple proxy to call Magic Eden from the server to avoid browser CORS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const limit = searchParams.get('limit') || '500';
    const offset = searchParams.get('offset') || '0';
    const collectionSymbol = searchParams.get('collection_symbol'); // optional

    if (!wallet) {
      return NextResponse.json({ error: 'Missing wallet parameter' }, { status: 400 });
    }

    // Check network - Magic Eden only supports mainnet
    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
    if (network !== 'mainnet' && network !== 'mainnet-beta') {
      // On devnet/testnet, return empty array since Magic Eden doesn't support it
      return NextResponse.json([], { status: 200 });
    }

    // Build URL without forcing a collection symbol; include it only if provided
    const base = `https://api-mainnet.magiceden.dev/v2/wallets/${encodeURIComponent(wallet)}/tokens`;
    const params = new URLSearchParams({ limit, offset });
    if (collectionSymbol) params.set('collection_symbol', collectionSymbol);
    const url = `${base}?${params.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      // Revalidate frequently but allow some caching on the server
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Magic Eden request failed', status: res.status, body: text }, { status: res.status });
    }

    const data = await res.json();

    // Return data to the client (same-origin => no browser CORS issue)
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Magic Eden proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
