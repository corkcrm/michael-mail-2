import { SignInFormsShowcase } from "@/auth/SignInFormsShowcase";
import { InboxPage } from "@/Inbox/InboxPage";
import { useAuthActions } from "@convex-dev/auth/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "../convex/_generated/api";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Inbox, 
  Send, 
  File, 
  Trash2, 
  Star, 
  Archive,
  Mail,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu
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

function GmailSidebarContent({ user }: { user: any }) {
  const { signOut } = useAuthActions();
  const { state, toggleSidebar } = useSidebar();
  
  return (
    <>
      <SidebarHeader className="bg-slate-900">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              className="hover:bg-slate-700" 
              tooltip="Michael Mail"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Mail className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-slate-100">Michael Mail</span>
                <span className="truncate text-xs text-slate-400">Gmail Clone</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="hidden md:flex">
            <SidebarMenuButton
              onClick={toggleSidebar}
              className="hover:bg-slate-700"
              tooltip={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
            >
              {state === "collapsed" ? (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-slate-400" />
              )}
              <span>Menu</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="bg-slate-900">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 font-semibold">Mail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mailNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    className="hover:bg-slate-700 text-slate-300 hover:text-slate-100 w-full"
                  >
                    <item.icon className="text-slate-400 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {item.count && (
                      <span className="ml-auto shrink-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
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
      <SidebarFooter className="bg-slate-900 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton 
              size="lg" 
              className="hover:bg-slate-700 w-full justify-start"
              tooltip={user?.name ?? user?.email ?? "Account"}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-slate-700 text-white">
                <User className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-slate-100">
                  {user?.name ?? user?.email ?? user?.phone ?? "Anonymous"}
                </span>
                <span className="truncate text-xs text-slate-400">
                  {user?.email ?? "Signed in"}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 bg-slate-800 border-slate-700 text-slate-100"
          >
            <DropdownMenuLabel className="text-slate-300">
              {user?.name ?? user?.email ?? user?.phone ?? "Anonymous"}
            </DropdownMenuLabel>
            {user?.favoriteColor && (
              <DropdownMenuLabel className="flex items-center text-slate-300">
                Favorite color:
                <div
                  style={{ backgroundColor: user.favoriteColor }}
                  className="inline-block ml-1 w-5 h-5 border border-gray-600 rounded-sm"
                >
                  &nbsp;
                </div>
              </DropdownMenuLabel>
            )}
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuLabel className="flex items-center gap-2 py-2 font-normal text-slate-300">
              Theme
              <ThemeToggle />
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem 
              onClick={() => void signOut()}
              className="text-slate-300 hover:bg-slate-700 hover:text-slate-100 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </>
  );
}

function GmailSidebar({ user }: { user: any }) {
  return (
    <Sidebar collapsible="icon" className="bg-slate-900 border-r border-slate-700">
      <GmailSidebarContent user={user} />
    </Sidebar>
  );
}

export default function App() {
  const user = useQuery(api.users.viewer);
  
  return (
    <>
      <Unauthenticated>
        <SignInFormsShowcase />
      </Unauthenticated>

      <Authenticated>
        <SidebarProvider>
          <div className="flex h-screen w-full">
            <GmailSidebar user={user} />
            <div className="flex flex-1 flex-col">
              <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
                <SidebarTrigger className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </SidebarTrigger>
                <h1 className="text-lg font-semibold">Michael Mail</h1>
              </header>
              <main className="flex-1 overflow-hidden">
                <InboxPage />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </Authenticated>
    </>
  );
}
