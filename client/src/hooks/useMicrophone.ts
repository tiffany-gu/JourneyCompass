import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MicrophoneState,
  startWakeWordDetection,
  startRecordingWithSilenceDetection,
  stopRecording,
  requestMicrophonePermission,
  checkBrowserCompatibility
} from '@/lib/microphoneService';

export interface UseMicrophoneOptions {
  enableWakeWord?: boolean; // Enable "Hey Journey" wake word detection
  onTranscript?: (text: string) => void; // Callback when transcript is received
  autoStart?: boolean; // Auto-start listening on mount (if browser allows)
}

export function useMicrophone(options: UseMicrophoneOptions = {}) {
  const { enableWakeWord = false, onTranscript, autoStart = false } = options;

  const [isListening, setIsListening] = useState(false); // Listening for wake word
  const [isRecording, setIsRecording] = useState(false); // Actively recording user speech
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wakeWordRecognitionRef = useRef<any>(null);
  const recordingStateRef = useRef<MicrophoneState | null>(null);
  const isListeningRef = useRef(false);
  const isTransitioningRef = useRef(false); // Prevent concurrent state transitions

  // Keep ref in sync with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  /**
   * Handle when recording is complete and we have a transcript
   */
  const handleTranscript = useCallback((text: string) => {
    setTranscription(text);
    setIsRecording(false);

    if (onTranscript) {
      onTranscript(text);
    }

    // If wake word is enabled, restart listening after recording
    // Wait longer to avoid catching tail end of previous speech
    if (enableWakeWord && isListeningRef.current) {
      setTimeout(() => {
        if (isListeningRef.current && !wakeWordRecognitionRef.current) {
          console.log('🔄 [useMicrophone] Restarting wake word detection...');
          wakeWordRecognitionRef.current = startWakeWordDetection(
            handleWakeWordDetected,
            () => isListeningRef.current
          );
        }
      }, 2000);
    }
  }, [onTranscript, enableWakeWord]);

  /**
   * Handle stopping the current recording
   */
  const handleStopRecording = useCallback(() => {
    if (recordingStateRef.current) {
      stopRecording(recordingStateRef.current);
      recordingStateRef.current = null;
    }
    setIsRecording(false);
  }, []);

  /**
   * Handle when wake word is detected
   */
  const handleWakeWordDetected = useCallback(async () => {
    // CRITICAL: Prevent concurrent transitions
    if (isTransitioningRef.current) {
      console.log('[useMicrophone] ⚠️ Ignoring wake word - already transitioning');
      return;
    }

    isTransitioningRef.current = true;
    console.log('[useMicrophone] 🎤 Wake word detected! Starting recording...');

    // CRITICAL: Stop wake word recognition FIRST to prevent conflicts
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
        wakeWordRecognitionRef.current = null;
      } catch (e) {
        console.error('❌ [useMicrophone] Error stopping wake word:', e);
      }
    }

    // Wait a moment for the previous recognition to fully stop
    await new Promise(resolve => setTimeout(resolve, 300));

    setIsRecording(true);

    const state = await startRecordingWithSilenceDetection(
      handleTranscript,
      handleStopRecording
    );

    if (state) {
      recordingStateRef.current = state;
    } else {
      console.error('❌ [useMicrophone] Failed to start recording');
      setError('Failed to start recording');
      setIsRecording(false);
    }

    isTransitioningRef.current = false;
  }, [handleTranscript, handleStopRecording]);

  /**
   * Start listening (wake word detection or direct recording)
   */
  const startListening = useCallback(async (isAutoStart = false) => {
    if (!checkBrowserCompatibility()) {
      const errorMsg = 'Your browser does not support speech recognition. Please use Chrome or Edge.';
      setError(errorMsg);
      if (!isAutoStart) {
        alert(errorMsg);
      }
      return false;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      const errorMsg = 'Could not access microphone. Please check permissions.';
      setError(errorMsg);
      if (!isAutoStart) {
        alert(errorMsg);
      }
      return false;
    }

    setError(null);

    if (enableWakeWord) {
      // CRITICAL FIX: Update ref BEFORE starting wake word detection
      isListeningRef.current = true;
      setIsListening(true);

      wakeWordRecognitionRef.current = startWakeWordDetection(
        handleWakeWordDetected,
        () => isListeningRef.current
      );
    } else {
      // Start recording directly
      setIsRecording(true);
      const state = await startRecordingWithSilenceDetection(
        handleTranscript,
        handleStopRecording
      );

      if (state) {
        recordingStateRef.current = state;
      } else {
        console.error('❌ [useMicrophone] Failed to start recording');
        setError('Failed to start recording');
        setIsRecording(false);
        return false;
      }
    }

    return true;
  }, [enableWakeWord, handleWakeWordDetected, handleTranscript, handleStopRecording]);

  /**
   * Stop listening (wake word detection or recording)
   */
  const stopListening = useCallback(() => {
    // CRITICAL FIX: Update ref BEFORE stopping to prevent race conditions
    isListeningRef.current = false;

    // Stop wake word detection
    if (wakeWordRecognitionRef.current) {
      try {
        wakeWordRecognitionRef.current.stop();
      } catch (e) {
        // Silently handle
      }
      wakeWordRecognitionRef.current = null;
    }

    // Stop active recording
    handleStopRecording();

    setIsListening(false);
    setIsRecording(false);
    setError(null);
    console.log('⏹️ [useMicrophone] Stopped');
  }, [handleStopRecording]);

  /**
   * Toggle listening on/off
   */
  const toggleListening = useCallback(async () => {
    if (isListening || isRecording) {
      stopListening();
    } else {
      await startListening(false);
    }
  }, [isListening, isRecording, stopListening, startListening]);

  /**
   * Manually stop recording (useful for manual stop button)
   */
  const manualStopRecording = useCallback(() => {
    if (isRecording) {
      handleStopRecording();
    }
  }, [isRecording, handleStopRecording]);

  /**
   * Clear the current transcription
   */
  const clearTranscription = useCallback(() => {
    setTranscription(null);
  }, []);

  // Auto-start on mount if requested (may fail due to browser requiring user gesture)
  useEffect(() => {
    if (autoStart) {
      startListening(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeWordRecognitionRef.current) {
        try {
          wakeWordRecognitionRef.current.stop();
        } catch (e) {
          // Silently handle
        }
      }
      if (recordingStateRef.current) {
        stopRecording(recordingStateRef.current);
      }
    };
  }, []);

  return {
    isListening,      // Is wake word detection active
    isRecording,      // Is actively recording user speech
    transcription,    // Last transcription received
    error,            // Last error message
    startListening,   // Start listening (wake word or direct recording)
    stopListening,    // Stop all listening
    toggleListening,  // Toggle listening on/off
    manualStopRecording, // Manually stop recording
    clearTranscription,  // Clear transcription
  };
}

