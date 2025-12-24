import { NextResponse } from "next/server";

/**
 * Calculate staking entry fee (5% of stake value in SOL)
 *
 * This proxies to the gatekeeper service to get real-time MKIN/SOL prices
 */
export async function POST(request: Request) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Call gatekeeper to calculate fee
    const gatekeeperBase =
      process.env.NEXT_PUBLIC_GATEKEEPER_BASE ||
      "https://gatekeeper-bmvu.onrender.com";
    const response = await fetch(
      `${gatekeeperBase}/api/staking/calculate-fee`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to calculate fee from gatekeeper");
    }

    const feeData = await response.json();
    return NextResponse.json(feeData);
  } catch (error: any) {
    console.error("Error calculating stake fee:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate fee" },
      { status: 500 }
    );
  }
}
