import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas publicas (sem autenticacao)
  const publicRoutes = [
    "/login", "/cadastro", "/privacidade", "/apoio/confirmar", "/esqueci-senha", "/redefinir-senha", "/api/auth/", "/api/support/confirm", "/api/webhook/",
    "/api/addiction/cron/", "/api/cron/", "/api/tasks/morning-brief",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Se nao esta autenticado e nao e rota publica, redireciona para login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Se esta autenticado, verifica se a conta foi aprovada (is_active)
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, is_active, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_active) {
      // Derruba a sessão e redireciona para login com aviso
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("pendente", "1");
      return NextResponse.redirect(url);
    }

    const adminPaths = ["/usuarios", "/aprovacoes", "/whatsapp", "/ia-config", "/tokens", "/logs", "/api/admin/", "/api/approvals/", "/api/contacts", "/api/whatsapp/", "/api/ia-config", "/api/logs"];
    if (adminPaths.some((path) => pathname === path || pathname.startsWith(path + "/") || (path.endsWith("/") && pathname.startsWith(path))) && profile.role !== "admin") {
      return pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Sem permissão" }, { status: 403 })
        : NextResponse.redirect(new URL("/addiction", request.url));
    }

    const modulePaths: [string, string][] = [
      ["/addiction", "addiction"], ["/api/addiction/", "addiction"], ["/api/community/", "addiction"],
      ["/financeiro", "financeiro"], ["/api/expenses", "financeiro"],
      ["/lembretes", "lembretes"], ["/api/reminders", "lembretes"],
      ["/agenda", "agenda"], ["/projetos", "projetos"],
      ["/documentos", "documentos"], ["/listas", "listas"],
      ["/desejos", "desejos"], ["/viagens", "viagens"],
      ["/integracoes", "integracoes"],
    ];
    const match = modulePaths.find(([path]) => pathname === path || pathname.startsWith(path.endsWith("/") ? path : path + "/"));
    if (match && match[1] !== "addiction" && profile.role !== "admin") {
      const { data: access } = await supabase.from("user_module_access")
        .select("enabled, expires_at")
        .eq("user_profile_id", profile.id).eq("module_key", match[1]).maybeSingle();
      if (!access?.enabled || (access.expires_at && new Date(access.expires_at) <= new Date())) {
        return pathname.startsWith("/api/")
          ? NextResponse.json({ error: "Módulo não liberado" }, { status: 403 })
          : NextResponse.redirect(new URL("/addiction", request.url));
      }
    }

    if (pathname === "/dashboard" && profile.role !== "admin") {
      const { data: accesses } = await supabase.from("user_module_access")
        .select("module_key, enabled")
        .eq("user_profile_id", profile.id).eq("enabled", true).neq("module_key", "addiction").limit(1);
      if (!accesses?.length) return NextResponse.redirect(new URL("/addiction", request.url));
    }
  }

  // Se esta autenticado e tenta acessar login/cadastro, redireciona para dashboard
  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Redireciona / para /dashboard ou /login
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/dashboard" : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
