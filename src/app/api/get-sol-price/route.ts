import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/get-sol-price?usd=X.XX
 * Returns SOL amount needed for specified USD amount
 * Uses CoinGecko API to get current SOL price
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const usdAmount = parseFloat(searchParams.get('usd') || '0');

    if (isNaN(usdAmount) || usdAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid USD amount' },
        { status: 400 }
      );
    }

    // Fetch SOL price from CoinGecko (no CORS issues on server-side)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch SOL price from CoinGecko');
    }

    const data = await response.json();
    const solPrice = data.solana?.usd;

    if (!solPrice || solPrice <= 0) {
      throw new Error('Invalid SOL price from API');
    }

    // Calculate SOL amount needed
    const solAmount = usdAmount / solPrice;

    console.log(`💵 SOL Price API: $${usdAmount} USD = ${solAmount.toFixed(6)} SOL (SOL price: $${solPrice})`);

    return NextResponse.json({
      success: true,
      usdAmount,
      solAmount,
      solPrice,
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error('Error in get-sol-price API:', error);
    
    // Fallback: Use approximate price if API fails
    const fallbackSolPrice = 86; // Approximate SOL price
    const usdAmount = parseFloat(request.nextUrl.searchParams.get('usd') || '0');
    const solAmount = usdAmount / fallbackSolPrice;

    console.warn(`⚠️ Using fallback SOL price: $${fallbackSolPrice}`);

    return NextResponse.json({
      success: true,
      usdAmount,
      solAmount,
      solPrice: fallbackSolPrice,
      timestamp: Date.now(),
      fallback: true,
      error: error.message,
    });
  }
}
