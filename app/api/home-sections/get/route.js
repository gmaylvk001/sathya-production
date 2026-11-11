import { NextResponse } from "next/server";

// Simulating DB for now
const fakeDB = [
  { id: "section1", name: "Category Section" },
  { id: "section2", name: "Product Section" },
  { id: "section3", name: "Offer Section" },
];

export async function GET() {
  return NextResponse.json({ sections: fakeDB });
}
