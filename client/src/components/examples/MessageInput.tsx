import MessageInput from '../MessageInput';

export default function MessageInputExample() {
  return (
    <div className="p-4 bg-background">
      <MessageInput
        onSendMessage={(msg) => console.log('Sent message:', msg)}
        onVoiceClick={() => console.log('Voice clicked')}
        isRecording={false}
      />
    </div>
  );
}
