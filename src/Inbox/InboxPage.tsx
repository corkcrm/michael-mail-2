import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  MoreVertical,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock email data - will be replaced with real data later
const mockEmails = [
  {
    id: "1",
    sender: "GitHub",
    senderEmail: "noreply@github.com",
    subject: "Security alert: new sign-in to your account",
    preview: "We noticed a new sign-in to your GitHub account from a new device...",
    time: "10:30 AM",
    read: false,
    starred: false,
  },
  {
    id: "2",
    sender: "Jane Smith",
    senderEmail: "jane.smith@example.com",
    subject: "Re: Project Update",
    preview: "Thanks for the update! I've reviewed the changes and everything looks good. Let's schedule a call...",
    time: "9:15 AM",
    read: true,
    starred: true,
  },
  {
    id: "3",
    sender: "Newsletter",
    senderEmail: "weekly@techdigest.com",
    subject: "This Week in Tech: AI Updates, New Frameworks, and More",
    preview: "Your weekly digest of the most important tech news, tutorials, and resources...",
    time: "Yesterday",
    read: true,
    starred: false,
  },
  {
    id: "4",
    sender: "Alex Johnson",
    senderEmail: "alex.j@company.com",
    subject: "Meeting Tomorrow at 2 PM",
    preview: "Hi, just a reminder about our meeting tomorrow. We'll be discussing the Q4 roadmap...",
    time: "Yesterday",
    read: false,
    starred: false,
  },
  {
    id: "5",
    sender: "Support Team",
    senderEmail: "support@service.com",
    subject: "Your ticket #4521 has been resolved",
    preview: "Good news! Your support ticket regarding the API integration has been resolved...",
    time: "2 days ago",
    read: true,
    starred: false,
  },
];

export function InboxPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Inbox Header */}
      <div className="border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-medium">Inbox</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search mail"
                className="pl-9 w-64 h-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Email Actions Bar */}
      <div className="flex items-center gap-1 border-b px-4 py-1">
        <Checkbox className="h-4 w-4" />
        <Button variant="ghost" size="sm" className="h-8 px-3">
          <Archive className="h-4 w-4 mr-1.5" />
          Archive
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-3">
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-3">
          <Reply className="h-4 w-4 mr-1.5" />
          Reply
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          1-{mockEmails.length} of {mockEmails.length}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {mockEmails.map((email) => (
          <div
            key={email.id}
            className={`group flex items-center gap-3 px-4 py-2 border-b cursor-pointer transition-all ${
              !email.read 
                ? "bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 font-medium" 
                : "hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <Checkbox className="h-4 w-4" />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Handle star toggle
              }}
            >
              <Star className={`h-4 w-4 ${email.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
            </Button>
            
            <div className="flex items-center flex-1 min-w-0 gap-3">
              {/* Sender */}
              <div className="w-44 flex-shrink-0">
                <span className={`text-sm truncate block ${!email.read ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                  {email.sender}
                </span>
              </div>
              
              {/* Subject and Preview */}
              <div className="flex-1 min-w-0 flex items-center">
                <span className={`text-sm truncate ${!email.read ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                  {email.subject}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate ml-2">
                  <span className="mx-1">–</span>
                  {email.preview}
                </span>
              </div>
              
              {/* Time */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-sm ${!email.read ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                  {email.time}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Mark as read</DropdownMenuItem>
                    <DropdownMenuItem>Star</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                    <DropdownMenuItem>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}