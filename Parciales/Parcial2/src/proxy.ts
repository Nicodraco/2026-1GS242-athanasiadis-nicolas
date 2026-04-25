import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isClerkConfigured } from "@/lib/env";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/admin(.*)"]);
const clerkConfigured = isClerkConfigured();

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

function bypassClerk() {
  return NextResponse.next();
}

export default clerkConfigured ? withClerk : bypassClerk;

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
