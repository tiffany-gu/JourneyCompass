import AppHeader from '../AppHeader';

export default function AppHeaderExample() {
  return (
    <div className="bg-background">
      <AppHeader isRecording={false} />
      <div className="mt-4">
        <AppHeader isRecording={true} />
      </div>
    </div>
  );
}
