import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { PerfilUsuario } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id:        string;
      perfil:    PerfilUsuario;
      unidadeId: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    perfil:    PerfilUsuario;
    unidadeId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id:        string;
    perfil:    PerfilUsuario;
    unidadeId: string;
  }
}
