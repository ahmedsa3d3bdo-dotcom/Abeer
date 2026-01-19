import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { z } from "zod";

/**
 * NextAuth.js v5 Configuration
 * https://authjs.dev/getting-started/migrating-to-v5
 */
export const authConfig = {
  pages: {
    signIn: "/login-v2",
    signOut: "/login-v2",
    error: "/login-v2",
    newUser: "/register-v2",
  },
  callbacks: {
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

      if (isOnDashboard) {
        if (!isLoggedIn) return false; // middleware/layout will handle redirect
        return true;
      }
      // Do not force redirect to /dashboard after login to keep homepage default
      if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      // Initial sign in
      if (user) {
        token.email = user.email;
        // If roles present from credentials flow, we also have our DB id on user.id
        if ((user as any)?.roles && (user as any)?.permissions) {
          token.id = (user as any).id;
          token.roles = (user as any).roles || [];
          token.permissions = (user as any).permissions || [];
        } else if (user.email) {
          // For OAuth users, map to our DB user to get the correct DB id
          try {
            const { userRepository } = await import("./server/repositories/user.repository");
            const dbUser = await userRepository.findByEmail(user.email);
            if (dbUser) {
              token.id = dbUser.id;
              token.email = dbUser.email;
              token.roles = dbUser.roles?.map((r) => r.slug) || [];
              token.permissions = dbUser.permissions?.map((p) => p.slug) || [];
            }
          } catch {}
        }
      }

      // Rehydrate from DB if token was created previously without roles/id (edge cases)
      if (!user && token?.email && (!token?.roles || !(token as any).id)) {
        try {
          const { userRepository } = await import("./server/repositories/user.repository");
          const dbUser = await userRepository.findByEmail(String(token.email));
          if (dbUser) {
            (token as any).id = dbUser.id;
            token.email = dbUser.email;
            (token as any).roles = dbUser.roles?.map((r) => r.slug) || [];
            (token as any).permissions = dbUser.permissions?.map((p) => p.slug) || [];
          }
        } catch {}
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Handle OAuth users: ensure they exist in our DB and have default role
      try {
        if (account && account.provider !== "credentials") {
          const email = (user?.email || (profile as any)?.email || "").toString();
          if (!email) return false;
          const name = (user?.name || (profile as any)?.name || "").toString();
          const [firstName, ...rest] = name.split(" ");
          const lastName = rest.join(" ").trim();

          const { userRepository } = await import("./server/repositories/user.repository");
          const exists = await userRepository.emailExists(email);
          if (!exists) {
            const { authService } = await import("./server/services/auth.service");
            const randomPass = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
            await authService.register({
              email,
              password: randomPass,
              firstName: firstName || email.split("@")[0],
              lastName: lastName || "",
            });
          }
          // Mark email verified for OAuth sign-ins (best effort)
          try {
            const dbUser = await userRepository.findByEmail(email);
            if (dbUser && !dbUser.emailVerified) {
              await userRepository.verifyEmail(dbUser.id);
            }
          } catch {}
        }
        return true;
      } catch {
        return false;
      }
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate input
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;
        // Authenticate user (lazy import to avoid bundling Node-only code in edge/middleware)
        const { authService } = await import("./server/services/auth.service");
        const result = await authService.login({ email, password }, "server");

        if (!result.success) {
          return null;
        }

        const user = result.data;

        // Return user object
        return {
          id: user.id,
          email: user.email,
          name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email,
          image: user.avatar,
          roles: user.roles,
          permissions: user.permissions,
        };
      },
    }),
    // Conditionally add Google/Apple based on env
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? [
          Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: process.env.APPLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig;
