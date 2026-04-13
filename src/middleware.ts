import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_REDIRECT: Record<string, string> = {
  VENDEDOR: "/dashboard/vendedor",
  SDR:      "/dashboard/vendedor",
  GERENTE:  "/dashboard/gerente",
  ADMIN:    "/dashboard/gerente",
  GESTOR:   "/dashboard/gerente",
};

// Rotas restritas a gerentes — VENDEDOR/SDR são redirecionados
const GERENTE_ONLY = ["/dashboard/gerente", "/dashboard/configuracoes"];

// Rotas restritas a vendedores — GERENTE/ADMIN/GESTOR são redirecionados
const VENDEDOR_ONLY = ["/dashboard/vendedor"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token  = req.nextauth.token;
    const perfil = (token?.perfil as string) ?? "";

    const destino = ROLE_REDIRECT[perfil] ?? "/dashboard/vendedor";

    // Usuário autenticado tentando acessar /login → redireciona para o dashboard
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(destino, req.url));
    }

    // Raiz → redireciona para o dashboard correto
    if (pathname === "/") {
      if (!token) return NextResponse.redirect(new URL("/login", req.url));
      return NextResponse.redirect(new URL(destino, req.url));
    }

    // Proteção: VENDEDOR/SDR não acessam rotas de gerente
    if (["VENDEDOR", "SDR"].includes(perfil)) {
      if (GERENTE_ONLY.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/dashboard/vendedor", req.url));
      }
    }

    // Proteção: GERENTE/ADMIN/GESTOR não acessam rotas exclusivas de vendedor
    if (["GERENTE", "ADMIN", "GESTOR"].includes(perfil)) {
      if (VENDEDOR_ONLY.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL("/dashboard/gerente", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (pathname === "/login" || pathname === "/") return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
