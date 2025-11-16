import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const state = req.nextUrl.searchParams.get('state') || '';
  
  // Extract Firebase token and wallet address from state if embedded
  let firebaseToken = '';
  let walletAddress = '';
  
  if (state.includes('__firebase_token:')) {
    const parts = state.split('__firebase_token:');
    if (parts.length > 1) {
      firebaseToken = parts[1].split('__')[0]; // Extract token before next delimiter
    }
  }
  
  if (state.includes('__wallet_address:')) {
    const parts = state.split('__wallet_address:');
    if (parts.length > 1) {
      walletAddress = parts[1].split('__')[0]; // Extract wallet address before next delimiter
    }
  }
  
  if (error) {
    return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=${encodeURIComponent(error)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/discord/linked?status=error&reason=missing_code', req.url));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/discord/linked?status=error&reason=server_config', req.url));
  }

  interface DiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    refresh_token?: string;
  }

  interface DiscordUser {
    id: string;
    username: string;
    discriminator?: string;
    global_name?: string;
  }

  try {
    // Exchange code for token
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    
    console.log('[discord:callback] Token exchange request:', {
      url: 'https://discord.com/api/oauth2/token',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code?.substring(0, 10) + '...',
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    
    const tokenText = await tokenRes.text();
    console.log('[discord:callback] Token response status:', tokenRes.status);
    console.log('[discord:callback] Token response body:', tokenText);

    if (!tokenRes.ok) {
      console.error('[discord:callback] Token exchange failed:', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        body: tokenText,
      });
      return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=token_exchange&detail=${encodeURIComponent(tokenText)}`, req.url));
    }
    
    const tokenJson: DiscordTokenResponse = JSON.parse(tokenText);
    const accessToken = tokenJson.access_token;
    console.log('[discord:callback] Token exchange successful, access_token received');

    // Fetch user profile
    console.log('[discord:callback] Fetching user profile with access token');
    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    
    const meText = await meRes.text();
    console.log('[discord:callback] User profile response status:', meRes.status);
    console.log('[discord:callback] User profile response body:', meText);

    if (!meRes.ok) {
      console.error('[discord:callback] Fetch user profile failed:', {
        status: meRes.status,
        statusText: meRes.statusText,
        body: meText,
      });
      return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=fetch_me&detail=${encodeURIComponent(meText)}`, req.url));
    }
    
    const me: DiscordUser = JSON.parse(meText);
    const discordId = me.id;
    const username = me.username;
    const discriminator = me.discriminator;
    console.log('[discord:callback] User profile fetched successfully:', { discordId, username });

    // Redirect to client page to complete linking using Firebase token and wallet address
    const url = new URL('/discord/linked', req.url);
    url.searchParams.set('status', 'ok');
    url.searchParams.set('discordId', discordId);
    if (username) url.searchParams.set('username', username);
    if (discriminator) url.searchParams.set('disc', discriminator);
    if (walletAddress) url.searchParams.set('wallet', walletAddress); // Pass wallet address through
    if (firebaseToken) url.searchParams.set('firebase_token', firebaseToken); // Pass Firebase token through
    console.log('[discord:callback] Redirecting to linked page with status=ok');
    return NextResponse.redirect(url);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    console.error('[discord:callback] Exception caught:', message, e);
    return NextResponse.redirect(new URL(`/discord/linked?status=error&reason=exception&detail=${encodeURIComponent(message)}`, req.url));
  }
}