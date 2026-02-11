import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in and trying to access protected routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/leader"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If logged in, check role-based access
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const pathname = request.nextUrl.pathname;

    // Admin routes - only admins can access
    if (pathname.startsWith("/admin")) {
      if (profile?.role !== "admin") {
        // Non-admins trying to access admin routes
        if (profile?.role === "event_leader") {
          return NextResponse.redirect(
            new URL("/leader/dashboard", request.url),
          );
        }
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    // Leader routes - only event leaders (and admins) can access
    if (pathname.startsWith("/leader")) {
      if (profile?.role !== "event_leader" && profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/leader/:path*"],
};
