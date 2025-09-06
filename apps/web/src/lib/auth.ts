import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SiweMessage } from 'siwe';
import { getCsrfToken } from 'next-auth/react';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: '0x0',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: '0x0',
        },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.message || !credentials?.signature) {
            return null;
          }

          const siwe = new SiweMessage(JSON.parse(credentials.message));

          const result = await siwe.verify({
            signature: credentials.signature,
          });

          if (!result.success) {
            return null;
          }

          return {
            id: siwe.address,
            address: siwe.address,
            name: `User ${siwe.address.slice(0, 6)}...${siwe.address.slice(-4)}`,
          };
        } catch (error) {
          console.error('SIWE authorization error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = user.address;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.address) {
        session.user.address = token.address as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/', // We'll handle sign-in on the main page
  },
};
