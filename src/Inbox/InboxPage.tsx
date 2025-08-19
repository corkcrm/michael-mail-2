import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  MoreVertical,
  Search,
  Filter,
  Loader2,
  AlertCircle
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
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";

interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
  starred: boolean;
}

export function InboxPage() {
  const fetchEmails = useAction(api.gmail.fetchEmails);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmails = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedEmails = await fetchEmails();
        setEmails(fetchedEmails || []);
      } catch (err) {
        console.error("Error fetching emails:", err);
        setError(err instanceof Error ? err.message : "Failed to load emails");
      } finally {
        setLoading(false);
      }
    };

    loadEmails();
  }, [fetchEmails]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Inbox Header */}
      <div className="border-b dark:border-slate-800 px-4 py-2">
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
      <div className="flex items-center gap-1 border-b dark:border-slate-800 px-4 py-1">
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
          {emails.length > 0 ? `1-${emails.length} of ${emails.length}` : ""}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading emails...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Failed to load emails</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-lg font-medium mb-2">No emails found</p>
            <p className="text-sm text-muted-foreground">Your inbox is empty</p>
          </div>
        ) : (
          emails.map((email) => (
          <div
            key={email.id}
            className={`group flex items-center gap-3 px-4 py-2 border-b dark:border-slate-800 cursor-pointer transition-all ${
              !email.read 
                ? "bg-blue-50 dark:bg-slate-800/50 hover:bg-blue-100 dark:hover:bg-slate-700 font-medium" 
                : "bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-800/30"
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
              <Star className={`h-4 w-4 ${email.starred ? "fill-yellow-400 text-yellow-400" : "text-gray-400 dark:text-gray-500"}`} />
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
                      <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                    <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Mark as read</DropdownMenuItem>
                    <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Star</DropdownMenuItem>
                    <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Archive</DropdownMenuItem>
                    <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}