import ChatMessage from '../ChatMessage';

export default function ChatMessageExample() {
  return (
    <div className="space-y-4 p-4 bg-background">
      <ChatMessage 
        message="I have 1/4 tank on a RAV4, find me stops so I never go below 50 miles remaining."
        isUser={true}
        timestamp="2:34 PM"
      />
      <ChatMessage 
        message="I'll help you plan gas stops for your trip. First, could you tell me your origin and destination?"
        isUser={false}
        timestamp="2:34 PM"
      />
    </div>
  );
}
