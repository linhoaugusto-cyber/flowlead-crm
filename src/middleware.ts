import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_REDIRECT: Record<string, string> = {
  VENDEDOR: "/dashboard/vendedor",
  SDR:      "/dashboard/vendedor",
  GERENTE:  "/dashboard/gerente",
  ADMIN:    "/dashboard/gerente",
  GESTOR:   "/dashboard/gerente",
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    const destino =
      ROLE_REDIRECT[(token?.perfil as string) ?? ""] ?? "/dashboard/vendedor";

    // Usuário autenticado tentando acessar /login → redireciona para o dashboard
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL(destino, req.url));
    }

    // Raiz → redireciona para o dashboard correto
    if (pathname === "/") {
      if (!token) return NextResponse.redirect(new URL("/login", req.url));
      return NextResponse.redirect(new URL(destino, req.url));
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
