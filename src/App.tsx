import { Chat } from "@/Chat/Chat";
import { ChatHeader } from "@/Chat/ChatIntro";
import { Layout } from "@/Layout";
import { SignInFormsShowcase } from "@/auth/SignInFormsShowcase";
import { UserMenu } from "@/components/UserMenu";
import { api } from "../convex/_generated/api";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";

export default function App() {
  const user = useQuery(api.users.viewer);
  return (
    <Layout
      menu={
        <>
          <Authenticated>
            <UserMenu favoriteColor={user?.favoriteColor}>
              {user?.name ?? user?.email ?? user?.phone ?? "Anonymous"}
            </UserMenu>
          </Authenticated>
          <Unauthenticated>{null}</Unauthenticated>
        </>
      }
    >
      <>
        <Authenticated>
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎉 Hello World! Welcome to Michael Mail!
            </h1>
            <p className="text-gray-600">
              You've successfully signed in with Google! Welcome,{" "}
              <span className="font-semibold text-blue-600">
                {user?.name ?? user?.email ?? user?.phone ?? "Anonymous User"}
              </span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Your Gmail clone is ready to go! 📧
            </p>
          </div>
          <ChatHeader />
          {/* eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain */}
          <Chat viewer={user?._id!} />
        </Authenticated>
        <Unauthenticated>
          <SignInFormsShowcase />
        </Unauthenticated>
      </>
    </Layout>
  );
}
