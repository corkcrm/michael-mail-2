import { 
  Archive, 
  Trash2, 
  Reply, 
  MoreVertical,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { EmailViewer } from "@/Inbox/EmailViewer";

interface EmailListViewProps {
  title: string;
  filter: "inbox" | "sent" | "drafts" | "archive" | "trash" | "all";
  selectedEmailId: Id<"emails"> | null;
  setSelectedEmailId: (id: Id<"emails"> | null) => void;
}

export function EmailListView({ title, filter, selectedEmailId, setSelectedEmailId }: EmailListViewProps) {
  const syncEmails = useAction(api.gmail.syncEmails);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsQuery = useQuery(api.emails.getEmails, { 
    filter,
    page: currentPage,
    pageSize: 50 
  });
  const markAsRead = useMutation(api.emails.markAsRead);
  
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<Id<"emails">>>(new Set());

  // Sync emails on mount for inbox view only
  useEffect(() => {
    if (filter === "inbox") {
      const performInitialSync = async () => {
        try {
          setSyncing(true);
          setSyncError(null);
          await syncEmails({ fullSync: false });
        } catch (err) {
          console.error("Error syncing emails:", err);
          setSyncError(err instanceof Error ? err.message : "Failed to sync emails");
        } finally {
          setSyncing(false);
        }
      };

      void performInitialSync();
    }
  }, [syncEmails, filter]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedEmails(new Set());
  }, [filter]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncError(null);
      await syncEmails({ fullSync: false });
      setCurrentPage(1);
      setSelectedEmails(new Set());
    } catch (err) {
      console.error("Error syncing emails:", err);
      setSyncError(err instanceof Error ? err.message : "Failed to sync emails");
    } finally {
      setSyncing(false);
    }
  };

  const handleMarkAsRead = async (emailId: Id<"emails">, isRead: boolean) => {
    try {
      await markAsRead({ emailId, isRead });
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  const toggleEmailSelection = (emailId: Id<"emails">) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length && emails.length > 0) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e._id)));
    }
  };

  const formatEmailTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return "Just now";
      return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const emails = emailsQuery?.emails || [];
  const totalCount = emailsQuery?.totalCount || 0;
  const hasNext = emailsQuery?.hasNext || false;
  const hasPrev = emailsQuery?.hasPrev || false;
  const loading = emailsQuery === undefined;

  // Calculate display range
  const startRange = totalCount === 0 ? 0 : ((currentPage - 1) * 50) + 1;
  const endRange = Math.min(currentPage * 50, totalCount);

  // Navigation handlers
  const handlePrevPage = () => {
    if (hasPrev) {
      setCurrentPage(currentPage - 1);
      setSelectedEmails(new Set());
    }
  };

  const handleNextPage = () => {
    if (hasNext) {
      setCurrentPage(currentPage + 1);
      setSelectedEmails(new Set());
    }
  };

  // If an email is selected, show the email viewer
  if (selectedEmailId) {
    return (
      <EmailViewer 
        emailId={selectedEmailId} 
        onBack={() => setSelectedEmailId(null)} 
      />
    );
  }

  // Get empty state message based on filter
  const getEmptyMessage = () => {
    switch (filter) {
      case "sent":
        return "No sent emails";
      case "drafts":
        return "No drafts";
      case "archive":
        return "No archived emails";
      case "trash":
        return "Trash is empty";
      default:
        return "No emails found";
    }
  };

  // Determine if we should show "To" or "From" column
  const showRecipient = filter === "sent" || filter === "drafts";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="border-b dark:border-slate-800 px-2 sm:px-4 py-2 w-full overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-medium flex-shrink-0">{title}</h1>
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hidden sm:flex">
              <Filter className="h-4 w-4" />
            </Button>
            <div className="relative min-w-0 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search mail"
                className="pl-9 w-full h-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-1 border-b dark:border-slate-800 px-2 sm:px-4 py-1 w-full overflow-hidden">
        {/* Left side actions */}
        <div className="flex items-center gap-1">
          <Checkbox 
            className="h-4 w-4 flex-shrink-0"
            checked={selectedEmails.size === emails.length && emails.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 sm:px-3"
                  onClick={() => void handleSync()}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sync with Gmail to get new emails</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="hidden sm:flex items-center gap-1">
            {filter !== "archive" && (
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                <Archive className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden lg:inline">Archive</span>
              </Button>
            )}
            {filter !== "trash" && (
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                <Trash2 className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden lg:inline">Delete</span>
              </Button>
            )}
            {filter !== "drafts" && (
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 hidden md:flex">
                <Reply className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden lg:inline">Reply</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Pagination Controls - Right side */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {totalCount > 0 && (
            <>
              <span className="text-xs text-muted-foreground mr-1 sm:mr-2">
                {startRange}-{endRange} of {totalCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevPage}
                disabled={!hasPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextPage}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading emails...</span>
          </div>
        ) : syncError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Failed to sync emails</p>
            <p className="text-sm text-muted-foreground mb-4">{syncError}</p>
            <Button 
              onClick={() => void handleSync()}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : emails.length === 0 && !syncing ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-lg font-medium mb-2">{getEmptyMessage()}</p>
            {filter === "inbox" && (
              <>
                <p className="text-sm text-muted-foreground mb-4">Click the refresh button to sync your Gmail</p>
                <Button 
                  onClick={() => void handleSync()}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Gmail
                </Button>
              </>
            )}
          </div>
        ) : (
          emails.map((email) => (
          <div
            key={email._id}
            className={`group flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b dark:border-slate-800 cursor-pointer transition-all ${
              !email.isRead 
                ? "bg-blue-50 dark:bg-slate-800/50 hover:bg-blue-100 dark:hover:bg-slate-700" 
                : "bg-white dark:bg-slate-950 hover:bg-gray-50 dark:hover:bg-slate-800/30"
            }`}
            onClick={() => setSelectedEmailId(email._id)}
          >
            <Checkbox 
              className="h-4 w-4 flex-shrink-0"
              checked={selectedEmails.has(email._id)}
              onCheckedChange={() => toggleEmailSelection(email._id)}
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex-1 min-w-0 flex items-start sm:items-center overflow-hidden">
              {/* Mobile Layout - Stacked */}
              <div className="sm:hidden flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                    {showRecipient ? (email.to?.[0] || "No recipient") : email.from}
                  </span>
                  <span className={`text-xs ml-2 flex-shrink-0 ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                    {formatEmailTime(email.internalDate)}
                  </span>
                </div>
                <div className={`text-sm truncate ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                  {email.subject}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {email.snippet}
                </div>
              </div>

              {/* Desktop Layout - Horizontal */}
              <div className="hidden sm:flex items-center flex-1 min-w-0 gap-3 overflow-hidden">
                {/* Sender/Recipient */}
                <div className="w-32 md:w-44 flex-shrink-0 overflow-hidden">
                  <span className={`text-sm truncate block ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                    {showRecipient ? (email.to?.[0] || "No recipient") : email.from}
                  </span>
                </div>
                
                {/* Subject and Preview */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center min-w-0 overflow-hidden">
                    <span className={`text-sm truncate flex-shrink-0 max-w-[200px] lg:max-w-[300px] ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
                      {email.subject}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 truncate min-w-0">
                      <span className="mr-1">–</span>
                      {email.snippet}
                    </span>
                  </div>
                </div>
                
                {/* Time and Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-sm ${!email.isRead ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                    {formatEmailTime(email.internalDate)}
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
                      <DropdownMenuItem 
                        className="dark:text-slate-200 dark:hover:bg-slate-700"
                        onClick={() => void handleMarkAsRead(email._id, !email.isRead)}
                      >
                        {email.isRead ? 'Mark as unread' : 'Mark as read'}
                      </DropdownMenuItem>
                      {filter !== "archive" && (
                        <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Archive</DropdownMenuItem>
                      )}
                      {filter !== "trash" && (
                        <DropdownMenuItem className="dark:text-slate-200 dark:hover:bg-slate-700">Delete</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}