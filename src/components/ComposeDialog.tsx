import { useState, useEffect } from "react";
import { 
  X, 
  Minimize2, 
  Maximize2, 
  Send, 
  Paperclip, 
  Link, 
  Image, 
  Smile,
  MoreVertical,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

interface ComposeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialBody?: string;
  replyMode?: "reply" | "replyAll" | "forward";
}

export function ComposeDialog({ 
  isOpen, 
  onClose, 
  userEmail,
  initialTo = "",
  initialCc = "",
  initialSubject = "",
  initialBody = "",
  replyMode: _replyMode
}: ComposeDialogProps) {
  const sendEmail = useAction(api.gmail.sendEmail);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setCc(initialCc);
      setBcc("");
      setSubject(initialSubject);
      setBody(initialBody);
      setShowCc(!!initialCc);
      setShowBcc(false);
      setIsMinimized(false);
      setIsMaximized(false);
      setSendStatus("idle");
      setErrorMessage("");
    }
  }, [isOpen, initialTo, initialCc, initialSubject, initialBody]);

  const handleSend = async () => {
    // Validate required fields
    if (!to.trim()) {
      setErrorMessage("Please enter a recipient");
      setSendStatus("error");
      return;
    }
    
    if (!subject.trim() && !body.trim()) {
      setErrorMessage("Please enter a subject or message");
      setSendStatus("error");
      return;
    }
    
    setIsSending(true);
    setSendStatus("idle");
    setErrorMessage("");
    
    try {
      const result = await sendEmail({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim() || "(no subject)",
        body: body.trim(),
      });
      
      if (result.success) {
        setSendStatus("success");
        // Show success briefly then close
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setSendStatus("error");
        setErrorMessage(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setSendStatus("error");
      setErrorMessage("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDiscard = () => {
    if (body || subject || to) {
      if (confirm("Discard this message?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed z-50 bg-white dark:bg-slate-900 rounded-t-lg shadow-2xl border border-slate-200 dark:border-slate-700 transition-all duration-300 ${
        isMinimized 
          ? "bottom-0 right-4 w-80 h-10" 
          : isMaximized 
          ? "inset-4" 
          : "bottom-0 right-4 w-[550px] h-[500px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-t-lg">
        <span className="text-sm font-medium dark:text-slate-100">
          {isMinimized ? subject || "New Message" : "New Message"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDiscard}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Body - Hidden when minimized */}
      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-40px)]">
          {/* From field */}
          <div className="px-4 py-2 border-b dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 dark:text-slate-400 min-w-[50px]">From</span>
              <span className="text-slate-900 dark:text-slate-100">{userEmail || "user@example.com"}</span>
            </div>
          </div>

          {/* To field */}
          <div className="px-4 py-2 border-b dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[50px]">To</span>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="Recipients"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border-0 p-0 h-auto text-sm focus-visible:ring-0 dark:bg-transparent"
                />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowCc(!showCc)}
                  >
                    Cc
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowBcc(!showBcc)}
                  >
                    Bcc
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Cc field */}
          {showCc && (
            <div className="px-4 py-2 border-b dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[50px]">Cc</span>
                <Input
                  type="email"
                  placeholder="Cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="border-0 p-0 h-auto text-sm focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Bcc field */}
          {showBcc && (
            <div className="px-4 py-2 border-b dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[50px]">Bcc</span>
                <Input
                  type="email"
                  placeholder="Bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="border-0 p-0 h-auto text-sm focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Subject field */}
          <div className="px-4 py-2 border-b dark:border-slate-700">
            <Input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          {/* Message body */}
          <div className="flex-1 px-4 py-3 overflow-auto">
            <Textarea
              placeholder="Compose email"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full border-0 p-0 text-sm resize-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>

          {/* Footer with actions */}
          <div className="flex flex-col gap-2">
            {/* Error/Success message */}
            {sendStatus === "error" && errorMessage && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              </div>
            )}
            {sendStatus === "success" && (
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Email sent successfully!
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between px-4 py-3 border-t dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => void handleSend()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  size="sm"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              
              <ToggleGroup type="single" className="gap-0">
                <ToggleGroupItem value="formatting" className="px-2" disabled>
                  <span className="text-xs">A</span>
                </ToggleGroupItem>
              </ToggleGroup>

              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Link className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <Image className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Save draft</DropdownMenuItem>
                  <DropdownMenuItem>Full screen</DropdownMenuItem>
                  <DropdownMenuItem>Label</DropdownMenuItem>
                  <DropdownMenuItem>Plain text mode</DropdownMenuItem>
                  <DropdownMenuItem>Print</DropdownMenuItem>
                  <DropdownMenuItem>Check spelling</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleDiscard}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}