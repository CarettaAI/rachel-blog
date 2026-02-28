import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const isDev = process.env.NODE_ENV === "development";

export const middleware = isDev ? () => NextResponse.next() : auth;

export const config = {
  matcher: ["/vault/:path*"],
};
