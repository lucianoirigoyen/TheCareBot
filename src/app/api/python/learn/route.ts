import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Call Python learning endpoint
    const response = await fetch("http://localhost:8000/api/learn/pattern", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, error: error.detail || "Unknown error" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Learning API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to connect to Python server" },
      { status: 500 }
    );
  }
}
