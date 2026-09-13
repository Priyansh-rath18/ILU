import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Only the minimum profile scopes needed to identify the user.
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  // Database sessions (not JWT): a row per session that can be revoked
  // server-side instantly (e.g. by deleting it), rather than a signed token
  // that stays valid until it expires no matter what.
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/" },
  callbacks: {
    async session({ session, user }) {
      // Expose only the internal user id — nothing else from the DB record.
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
