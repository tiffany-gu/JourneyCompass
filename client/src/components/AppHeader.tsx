import { Navigation, Settings, Ear, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  isListening?: boolean;
  isRecording?: boolean;
}

export default function AppHeader({ isListening = false, isRecording = false }: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-background">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <Navigation className="w-5 h-5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-semibold">Journey Assistant</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Listening for wake word indicator */}
        {isListening && !isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 rounded-full border border-blue-200 dark:border-blue-800">
            <Ear className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Say "Hey Journey"
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950 rounded-full border border-red-200 dark:border-red-800">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Listening...
            </span>
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => console.log('Settings clicked')}
        data-testid="button-settings"
      >
        <Settings className="w-5 h-5" />
      </Button>
    </header>
  );
}
