import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, MicOff, Circle, Send } from "lucide-react";
import { useState } from "react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onVoiceClick: () => void;
  isRecording?: boolean;
  isListening?: boolean;
}

export default function MessageInput({
  onSendMessage,
  onVoiceClick,
  isRecording = false,
  isListening = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  // Determine voice button state
  const getVoiceButtonState = () => {
    if (isRecording) {
      return {
        variant: "destructive" as const,
        icon: <Circle className="w-4 h-4 fill-current animate-pulse" />,
        tooltip: "Recording... (speak now)",
        className: "bg-red-600 hover:bg-red-700"
      };
    } else if (isListening) {
      return {
        variant: "default" as const,
        icon: <Mic className="w-4 h-4 animate-pulse" />,
        tooltip: 'Listening for "Hey Journey"',
        className: "bg-blue-600 hover:bg-blue-700"
      };
    } else {
      return {
        variant: "outline" as const,
        icon: <MicOff className="w-4 h-4" />,
        tooltip: "Click to start voice input",
        className: ""
      };
    }
  };

  const voiceState = getVoiceButtonState();

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          isRecording
            ? "Listening..."
            : isListening
            ? 'Say "Hey Journey" to speak'
            : "Type your request or use voice..."
        }
        className="flex-1"
        data-testid="input-message"
      />
      <Button
        type="button"
        size="icon"
        variant={voiceState.variant}
        onClick={onVoiceClick}
        data-testid="button-voice"
        title={voiceState.tooltip}
        className={voiceState.className}
      >
        {voiceState.icon}
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
