import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Which role owns each route prefix. AMS is shared by superadmin + school_admin.
const PREFIX_ROLES: Record<string, string[]> = {
  "/superadmin": ["superadmin"],
  "/admin": ["school_admin"],
  "/teacher": ["teacher"],
  "/parent": ["parent"],
  "/ams": ["superadmin", "school_admin"],
};
const PROTECTED_PREFIXES = Object.keys(PREFIX_ROLES);

const ROLE_HOME: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  school_admin: "/admin/classes",
  teacher: "/teacher/classes",
  parent: "/parent",
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const matchedPrefix = PROTECTED_PREFIXES.find((p) => path.startsWith(p));

  if (matchedPrefix && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (matchedPrefix && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as string | undefined;
    const allowedRoles = PREFIX_ROLES[matchedPrefix];

    if (!role || !allowedRoles.includes(role)) {
      const home = role ? ROLE_HOME[role] : "/login";
      return NextResponse.redirect(new URL(home ?? "/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
