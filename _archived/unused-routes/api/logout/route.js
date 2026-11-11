import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  cookies().delete("admin_session");
  return NextResponse.json({ message: "Logged out successfully" });
}
