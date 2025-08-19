import { ArrowLeft, Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import "./EmailViewer.css";

interface EmailViewerProps {
  emailId: Id<"emails">;
  onBack: () => void;
}

export function EmailViewer({ emailId, onBack }: EmailViewerProps) {
  const email = useQuery(api.emails.getEmailById, { emailId });
  const markAsRead = useMutation(api.emails.markAsRead);

  // Mark email as read when viewed
  useEffect(() => {
    if (email && !email.isRead) {
      void markAsRead({ emailId, isRead: true });
    }
  }, [email, emailId, markAsRead]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!email) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-950">
        {/* Loading skeleton for header */}
        <div className="border-b dark:border-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-3"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          </div>
        </div>
        
        {/* Loading skeleton for content */}
        <div className="flex-1 overflow-auto p-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/3 mb-8" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Email Header with Back Button */}
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

      {/* Email Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Subject */}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {email.subject}
          </h1>

          {/* Sender Info */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b dark:border-slate-800">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {email.from}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {email.fromEmail}
              </div>
              {email.to && email.to.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  To: {email.to.join(', ')}
                </div>
              )}
              {email.cc && email.cc.length > 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Cc: {email.cc.join(', ')}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(email.internalDate)}
            </div>
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
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
          <div>
            {email.bodyHtml ? (
              <div
                className="email-content"
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              />
            ) : email.bodyPlain ? (
              <pre className="whitespace-pre-wrap font-sans text-gray-900 dark:text-gray-100">
                {email.bodyPlain}
              </pre>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No content available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}