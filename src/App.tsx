import { Chat } from "@/Chat/Chat";
import { ChatHeader } from "@/Chat/ChatIntro";
import { Layout } from "@/Layout";
import { SignInFormsShowcase } from "@/auth/SignInFormsShowcase";
import { UserMenu } from "@/components/UserMenu";
import { api } from "../convex/_generated/api";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { 
  Inbox, 
  Send, 
  File, 
  Trash2, 
  Star, 
  Archive,
  Mail,
  PenTool
} from "lucide-react";

// Gmail-style navigation items
const mailNavItems = [
  { title: "Inbox", icon: Inbox, count: 12 },
  { title: "Starred", icon: Star },
  { title: "Sent", icon: Send },
  { title: "Drafts", icon: File },
  { title: "Archive", icon: Archive },
  { title: "Trash", icon: Trash2 },
];

function GmailSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Mail className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Michael Mail</span>
                <span className="truncate text-xs">Gmail Clone</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Mail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mailNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon />
                    <span>{item.title}</span>
                    {item.count && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function App() {
  const user = useQuery(api.users.viewer);
  
  return (
    <>
      <Unauthenticated>
        <Layout
          menu={
            <UserMenu favoriteColor={undefined}>
              Sign In
            </UserMenu>
          }
        >
          <SignInFormsShowcase />
        </Layout>
      </Unauthenticated>

      <Authenticated>
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <GmailSidebar />
            <div className="flex flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-16 border-b bg-background/80 backdrop-blur">
                <div className="flex w-full items-center gap-4 px-4">
                  <SidebarTrigger />
                  <div className="flex flex-1 items-center justify-between">
                    <h1 className="text-lg font-semibold">Michael Mail</h1>
                    <UserMenu favoriteColor={user?.favoriteColor}>
                      {user?.name ?? user?.email ?? user?.phone ?? "Anonymous"}
                    </UserMenu>
                  </div>
                </div>
              </header>
              <main className="flex-1 overflow-auto p-6">
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
              </main>
            </div>
          </div>
        </SidebarProvider>
      </Authenticated>
    </>
  );
}
