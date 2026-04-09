import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { PerfilUsuario } from "@prisma/client";

export const ROLE_REDIRECT: Record<PerfilUsuario, string> = {
  VENDEDOR: "/dashboard/vendedor",
  SDR:      "/dashboard/vendedor",
  GERENTE:  "/dashboard/gerente",
  ADMIN:    "/dashboard/gerente",
  GESTOR:   "/dashboard/gerente",
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "E-mail",  type: "email"    },
        password: { label: "Senha",   type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id:        true,
            nome:      true,
            email:     true,
            senha:     true,
            perfil:    true,
            ativo:     true,
            unidadeId: true,
          },
        });

        if (!usuario || !usuario.ativo) return null;

        const senhaValida = await bcrypt.compare(
          credentials.password,
          usuario.senha
        );
        if (!senhaValida) return null;

        return {
          id:        usuario.id,
          name:      usuario.nome,
          email:     usuario.email,
          perfil:    usuario.perfil,
          unidadeId: usuario.unidadeId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.perfil    = (user as { perfil: PerfilUsuario }).perfil;
        token.unidadeId = (user as { unidadeId: string }).unidadeId;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id        = token.id        as string;
        session.user.perfil    = token.perfil    as PerfilUsuario;
        session.user.unidadeId = token.unidadeId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  session: {
    strategy: "jwt",
    maxAge:   8 * 60 * 60, // 8 horas
  },

  secret: process.env.NEXTAUTH_SECRET,
};
