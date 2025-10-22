import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Call Python LangGraph server
    const response = await fetch("http://localhost:8000/api/invoke/autofill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { success: false, predictions: [], errors: [error.detail || "Unknown error"] },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Autofill API error:", error);
    return NextResponse.json(
      {
        success: false,
        predictions: [],
        errors: ["Failed to connect to Python server. Is it running on port 8000?"],
      },
      { status: 500 }
    );
  }
}
