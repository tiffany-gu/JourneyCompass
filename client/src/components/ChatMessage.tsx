import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

export default function ChatMessage({ message, isUser, timestamp }: ChatMessageProps) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] space-y-1")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-card border border-card-border"
          )}
        >
          <p className={cn("text-base", isUser ? "font-medium" : "font-normal")}>
            {message}
          </p>
        </div>
        {timestamp && (
          <p className="text-xs text-muted-foreground px-2">
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
