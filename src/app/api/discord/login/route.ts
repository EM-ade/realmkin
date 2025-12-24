import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  // Get Firebase token from cookies or query params
  const firebaseToken = req.cookies.get("firebase_token")?.value || req.nextUrl.searchParams.get("token") || "";
  
  // Get wallet address if provided
  const walletAddress = req.nextUrl.searchParams.get("wallet") || "";
  
  // Optional state passthrough (e.g., return path)
  const state = req.nextUrl.searchParams.get("state") || "";

  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error("[discord:login] Missing NEXT_PUBLIC_DISCORD_CLIENT_ID or NEXT_PUBLIC_DISCORD_REDIRECT_URI");
    return NextResponse.redirect(new URL("/discord/linked?status=error&reason=server_config", req.url));
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "identify",
    redirect_uri: redirectUri,
  });
  
  // Embed both Firebase token and wallet address in the state parameter
  let stateParam = state || '';
  if (firebaseToken) {
    stateParam = `${stateParam}__firebase_token:${firebaseToken}`;
  }
  if (walletAddress) {
    stateParam = `${stateParam}__wallet_address:${walletAddress}`;
  }
  if (stateParam) {
    params.set("state", stateParam);
  }

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log("[discord:login] Redirecting to Discord authorize:", authorizeUrl);
  return NextResponse.redirect(authorizeUrl);
}
