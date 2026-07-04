import { NextResponse } from "next/server";
import { getAddressSuggestions } from "@/lib/property/address-autocomplete";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      suggestions: [],
      provider: "local",
      googleEnabled: false,
    });
  }

  try {
    const result = await getAddressSuggestions(query);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Address suggestions unavailable." },
      { status: 500 }
    );
  }
}