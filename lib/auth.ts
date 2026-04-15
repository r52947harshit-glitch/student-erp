import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth/next"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password ||
          !credentials?.role
        ) {
          throw new Error("All fields are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          throw new Error("No account found with this email")
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact admin.")
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!passwordMatch) {
          throw new Error("Incorrect password")
        }

        if (user.role !== credentials.role) {
          throw new Error(
            `This account is not registered as ${credentials.role}`
          )
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
}

// Use this in all API routes instead of auth()
export async function getAuthSession() {
  return getServerSession(authOptions)
}
