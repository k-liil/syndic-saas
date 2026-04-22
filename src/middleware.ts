import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // More robust redirection from apex to www
  const isApex = hostname.split(':')[0] === "syndicly.ma" || hostname === "syndicly-production.up.railway.app";
  
  if (isApex) {
    const url = req.nextUrl.clone();
    url.hostname = "www.syndicly.ma";
    url.port = ""; // Ensure no port is carried over for production
    return NextResponse.redirect(url, 301);
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/ops") ||
    pathname.startsWith("/organisation")
  ) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|fonts).*)",
  ],
};