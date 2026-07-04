import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupProperty } from "@/lib/property/lookup";

const requestSchema = z
  .object({
    address: z.string().trim().optional(),
    zipCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "Zip code must be 5 digits")
      .optional(),
  })
  .refine((data) => Boolean(data.address || data.zipCode), {
    message: "Provide an address or zip code.",
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = lookupProperty(parsed.data);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Property lookup failed. Please try again or enter details manually." },
      { status: 500 }
    );
  }
}