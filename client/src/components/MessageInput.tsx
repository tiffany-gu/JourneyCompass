import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send } from "lucide-react";
import { useState } from "react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onVoiceClick: () => void;
  isRecording?: boolean;
}

export default function MessageInput({
  onSendMessage,
  onVoiceClick,
  isRecording = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your request or use voice..."
        className="flex-1"
        data-testid="input-message"
      />
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={onVoiceClick}
        data-testid="button-voice"
      >
        <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
      </Button>
      <Button
        type="submit"
        size="icon"
        disabled={!message.trim()}
        data-testid="button-send"
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
