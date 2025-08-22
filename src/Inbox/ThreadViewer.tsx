import { ArrowLeft, ChevronDown, ChevronRight, Paperclip, Download, Reply, ReplyAll, Forward, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ComposeDialog } from "@/components/ComposeDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "./EmailViewer.css";

interface ThreadViewerProps {
  emailId: Id<"emails">;
  onBack: () => void;
}

interface EmailInThread {
  _id: Id<"emails">;
  _creationTime: number;
  gmailId: string;
  gmailThreadId: string;
  userId: Id<"users">;
  subject: string;
  snippet: string;
  internalDate: number;
  from: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  bodyHtml?: string;
  bodyPlain?: string;
  isRead: boolean;
  attachments?: Array<{
    _id: Id<"attachments">;
    filename: string;
    mimeType: string;
    size: number;
  }>;
}

export function ThreadViewer({ emailId, onBack }: ThreadViewerProps) {
  const initialEmail = useQuery(api.emails.getEmailById, { emailId });
  const threadEmails = useQuery(api.emails.getEmailsByThread, 
    initialEmail?.gmailThreadId ? { threadId: initialEmail.gmailThreadId } : "skip"
  );
  const markAsRead = useMutation(api.emails.markAsRead);
  const user = useQuery(api.users.viewer);
  
  // Track which emails are expanded (first one expanded by default)
  const [expandedEmails, setExpandedEmails] = useState<Set<Id<"emails">>>(new Set([emailId]));
  
  // Compose dialog state for replies
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState("");
  const [composeInitialCc, setComposeInitialCc] = useState("");
  const [composeInitialSubject, setComposeInitialSubject] = useState("");
  const [composeInitialBody, setComposeInitialBody] = useState("");
  const [replyMode, setReplyMode] = useState<"reply" | "replyAll" | "forward" | undefined>();

  // Mark initial email as read when viewed
  useEffect(() => {
    if (initialEmail && !initialEmail.isRead) {
      void markAsRead({ emailId, isRead: true });
    }
  }, [initialEmail, emailId, markAsRead]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const toggleEmailExpanded = (emailId: Id<"emails">) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string): string => {
    // Generate a consistent color based on email
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleReply = (email: EmailInThread) => {
    const subject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
    const body = `\n\nOn ${formatDate(email.internalDate)}, ${email.from} <${email.fromEmail}> wrote:\n> ${email.bodyPlain?.split('\n').join('\n> ') || email.snippet}`;
    
    setComposeInitialTo(email.fromEmail);
    setComposeInitialCc("");
    setComposeInitialSubject(subject);
    setComposeInitialBody(body);
    setReplyMode("reply");
    setComposeOpen(true);
  };

  const handleReplyAll = (email: EmailInThread) => {
    const subject = email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`;
    const body = `\n\nOn ${formatDate(email.internalDate)}, ${email.from} <${email.fromEmail}> wrote:\n> ${email.bodyPlain?.split('\n').join('\n> ') || email.snippet}`;
    
    // Include original sender and all recipients except current user
    const allRecipients = [email.fromEmail, ...email.to, ...(email.cc || [])];
    const filteredRecipients = allRecipients.filter(r => r !== user?.email);
    const uniqueRecipients = Array.from(new Set(filteredRecipients));
    
    setComposeInitialTo(uniqueRecipients[0] || "");
    setComposeInitialCc(uniqueRecipients.slice(1).join(", "));
    setComposeInitialSubject(subject);
    setComposeInitialBody(body);
    setReplyMode("replyAll");
    setComposeOpen(true);
  };

  const handleForward = (email: EmailInThread) => {
    const subject = email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`;
    const body = `\n\n---------- Forwarded message ---------\nFrom: ${email.from} <${email.fromEmail}>\nDate: ${formatDate(email.internalDate)}\nSubject: ${email.subject}\nTo: ${email.to.join(", ")}\n\n${email.bodyPlain || email.snippet}`;
    
    setComposeInitialTo("");
    setComposeInitialCc("");
    setComposeInitialSubject(subject);
    setComposeInitialBody(body);
    setReplyMode("forward");
    setComposeOpen(true);
  };

  if (!initialEmail || !threadEmails) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        <div className="border-b dark:border-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Inbox
            </Button>
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Sort emails by date (oldest first for chronological order)
  const sortedEmails = [...(threadEmails as EmailInThread[])].sort((a, b) => a.internalDate - b.internalDate);
  const isThread = sortedEmails.length > 1;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header with Back Button */}
      <div className="border-b dark:border-slate-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 px-3"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Inbox
          </Button>
          {isThread && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {sortedEmails.length} messages in conversation
            </span>
          )}
        </div>
      </div>

      {/* Email Thread Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Subject - show only once at the top */}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            {initialEmail.subject}
          </h1>

          {/* Email Thread */}
          <div className="space-y-3">
            {sortedEmails.map((email, index) => {
              const isExpanded = expandedEmails.has(email._id);
              const isLast = index === sortedEmails.length - 1;
              
              return (
                <div
                  key={email._id}
                  className={`border dark:border-slate-800 rounded-lg ${
                    isExpanded ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-800/50'
                  } transition-all`}
                >
                  {/* Email Header - Always Visible */}
                  <div
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 ${
                      !isExpanded ? 'rounded-lg' : 'rounded-t-lg border-b dark:border-slate-700'
                    }`}
                    onClick={() => toggleEmailExpanded(email._id)}
                  >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(email.fromEmail)}`}>
                      {getInitials(email.from)}
                    </div>

                    {/* Sender Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {email.from}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(email.internalDate)}
                        </span>
                      </div>
                      {!isExpanded && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                          {email.snippet}
                        </div>
                      )}
                      {isExpanded && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          to {email.to.join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Expand/Collapse Icon */}
                    <div className="flex items-center gap-2">
                      {email.attachments && email.attachments.length > 0 && !isExpanded && (
                        <Paperclip className="h-4 w-4 text-gray-400" />
                      )}
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Email Content */}
                  {isExpanded && (
                    <div className="p-4 pt-0">
                      {/* CC Recipients if any */}
                      {email.cc && email.cc.length > 0 && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          Cc: {email.cc.join(', ')}
                        </div>
                      )}

                      {/* Attachments */}
                      {email.attachments && email.attachments.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Paperclip className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {email.attachments.length} Attachment{email.attachments.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {email.attachments.map((attachment) => (
                              <div
                                key={attachment._id}
                                className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border dark:border-slate-700"
                              >
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {attachment.filename}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({(attachment.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  disabled
                                  title="Download not implemented yet"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Email Body */}
                      <div 
                        className="email-content prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200"
                        dangerouslySetInnerHTML={{ 
                          __html: email.bodyHtml || email.bodyPlain?.replace(/\n/g, '<br/>') || '' 
                        }}
                      />

                      {/* Action Buttons */}
                      {isLast && (
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t dark:border-slate-700">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleReply(email)}
                          >
                            <Reply className="h-4 w-4" />
                            Reply
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleReplyAll(email)}
                          >
                            <ReplyAll className="h-4 w-4" />
                            Reply All
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleForward(email)}
                          >
                            <Forward className="h-4 w-4" />
                            Forward
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Print</DropdownMenuItem>
                              <DropdownMenuItem>Report spam</DropdownMenuItem>
                              <DropdownMenuItem>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Compose Dialog for Replies */}
      <ComposeDialog
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        userEmail={user?.email}
        initialTo={composeInitialTo}
        initialCc={composeInitialCc}
        initialSubject={composeInitialSubject}
        initialBody={composeInitialBody}
        replyMode={replyMode}
      />
    </div>
  );
}