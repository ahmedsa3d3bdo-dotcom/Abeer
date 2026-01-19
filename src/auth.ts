import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * NextAuth.js v5 Instance
 */
export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);
