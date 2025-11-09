// Enhanced microphone service for wake word detection and audio monitoring
export interface MicrophoneState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  javascriptNode: ScriptProcessorNode | null;
  currentStream: MediaStream | null;
  recognition: any; // SpeechRecognition type
  silenceCheckInterval: NodeJS.Timeout | null;
}

// Timeouts based on industry standards (Google Cloud Speech-to-Text, Alexa)
const SPEECH_END_TIMEOUT = 2000; // 2s after speech stops (allow for longer pauses mid-sentence)
const MAX_RECORDING_TIME = 30000; // 30s maximum recording duration
const INITIAL_SPEECH_TIMEOUT = 8000; // 8s timeout if user never speaks after wake word
const SILENCE_THRESHOLD = -25; // -25 dB threshold for silence detection (more sensitive)
const WAKE_WORD = 'hey journey'; // Wake word to activate recording

/**
 * Calculate audio level in decibels
 */
export function getAudioLevel(analyser: AnalyserNode): number {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const sum = dataArray.reduce((a, b) => a + b, 0);
  const average = sum / bufferLength;
  const dB = 20 * Math.log10(average / 255);

  return dB;
}

/**
 * Start continuous wake word detection
 */
export function startWakeWordDetection(
  onWakeWordDetected: () => void,
  isListeningRef: () => boolean
): any {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('[Wake Word Detection] Speech recognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true; // Keep listening
  recognition.interimResults = false; // Use final results only to prevent duplicate detections
  recognition.lang = 'en-US';

  // Track recognition state to prevent race conditions
  let isStarting = false;
  let isStopping = false;
  let lastDetectionTime = 0;
  const DETECTION_COOLDOWN = 2000; // 2 second cooldown between detections

  const safeStart = () => {
    if (isStarting || isStopping || !isListeningRef()) {
      return;
    }

    isStarting = true;
    try {
      recognition.start();
      console.log('🎤 [Wake Word Detection] ✅ Listening for "Hey Journey"...');
      isStarting = false;
    } catch (e: any) {
      isStarting = false;
      // If already started, that's okay - we're already listening
      if (e.message.includes('already started')) {
        console.log('🎤 [Wake Word Detection] Already active');
      } else {
        console.error('❌ [Wake Word Detection] Failed to start:', e.message);
      }
    }
  };

  recognition.onresult = (event: any) => {
    const transcript = Array.from(event.results)
      .map((result: any) => result[0].transcript)
      .join('')
      .toLowerCase()
      .trim();

    // Only match exact wake word or very close variations
    const variations = [
      'hey journey',
      'heyjourney',
      'hey jorney',
    ];

    const matchedVariation = variations.find(v => transcript.includes(v));

    if (isListeningRef() && matchedVariation) {
      // Debounce: Check if enough time has passed since last detection
      const now = Date.now();
      if (now - lastDetectionTime < DETECTION_COOLDOWN) {
        console.log('⏳ [Wake Word Detection] Cooldown active, ignoring duplicate');
        return;
      }

      lastDetectionTime = now;
      console.log('✅ [Wake Word Detection] "Hey Journey" detected!');
      isStopping = true;

      try {
        recognition.stop();
      } catch (e) {
        console.error('❌ [Wake Word Detection] Error stopping:', e);
      }

      // Wait for recognition to fully stop before triggering callback
      setTimeout(() => {
        isStopping = false;
        onWakeWordDetected();
      }, 500);
    }
  };

  recognition.onerror = (event: any) => {
    // Handle different error types
    if (event.error === 'no-speech') {
      // Expected when no speech detected - just restart on end event
      return;
    } else if (event.error === 'audio-capture') {
      // Microphone access issue - wait longer before retry
      console.error('⚠️ [Wake Word Detection] Microphone busy, retrying...');
      setTimeout(() => {
        if (isListeningRef() && !isStarting && !isStopping) {
          safeStart();
        }
      }, 1000);
    } else if (event.error === 'not-allowed') {
      console.error('❌ [Wake Word Detection] Permission denied');
      isStopping = true;
    } else if (event.error === 'aborted') {
      // Expected when we manually stop - don't log as error
      return;
    } else {
      console.error('⚠️ [Wake Word Detection] Error:', event.error);
      // Other errors - retry after delay
      setTimeout(() => {
        if (isListeningRef() && !isStarting && !isStopping) {
          safeStart();
        }
      }, 500);
    }
  };

  recognition.onend = () => {
    if (isListeningRef() && !isStopping) {
      // Wait a bit before restarting to avoid race conditions
      setTimeout(() => {
        safeStart();
      }, 100);
    }
  };

  safeStart();
  return recognition;
}

/**
 * Start recording with silence detection and automatic stop
 */
export async function startRecordingWithSilenceDetection(
  onTranscript: (text: string) => void,
  onStopRecording: () => void
): Promise<MicrophoneState | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let silenceTimer: NodeJS.Timeout | null = null;
    let maxRecordingTimer: NodeJS.Timeout | null = null;
    let initialSpeechTimer: NodeJS.Timeout | null = null;
    let hasSpoken = false;
    let lastSpeechTime = Date.now();

    // Set up audio context for silence detection
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    // Note: ScriptProcessorNode is deprecated but AudioWorkletNode requires
    // a separate processor file. For now, we suppress the warning.
    // TODO: Migrate to AudioWorkletNode in future
    const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 2048;

    microphone.connect(analyser);
    // Don't connect to destination to avoid feedback/echo

    // Use setInterval instead of onaudioprocess for better compatibility
    let silenceCheckInterval: NodeJS.Timeout | null = null;

    const stopRecordingWithCleanup = (reason: string) => {
      console.log(`⏱️ [Recording] Auto-stopping (${reason})`);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxRecordingTimer) clearTimeout(maxRecordingTimer);
      if (initialSpeechTimer) clearTimeout(initialSpeechTimer);
      if (silenceCheckInterval) clearInterval(silenceCheckInterval);
      recognition.stop();
      onStopRecording();
    };

    const checkAudioLevel = () => {
      const volume = getAudioLevel(analyser);

      if (volume > SILENCE_THRESHOLD) {
        // User is speaking
        if (!hasSpoken) {
          hasSpoken = true;
          // Clear initial speech timeout since user started speaking
          if (initialSpeechTimer) {
            clearTimeout(initialSpeechTimer);
            initialSpeechTimer = null;
          }
          console.log('🎙️ [Recording] Speech detected');
        }

        lastSpeechTime = Date.now();

        // Clear silence timer while speaking
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      } else if (hasSpoken) {
        // Silence detected after user has spoken
        if (!silenceTimer) {
          // Start countdown for speech end
          silenceTimer = setTimeout(() => {
            stopRecordingWithCleanup('speech ended');
          }, SPEECH_END_TIMEOUT);
        }
      }
    };

    // Check audio level every 100ms
    silenceCheckInterval = setInterval(checkAudioLevel, 100);

    // Maximum recording time safety limit
    maxRecordingTimer = setTimeout(() => {
      stopRecordingWithCleanup('max duration reached');
    }, MAX_RECORDING_TIME);

    // Initial speech timeout - stop if user never speaks
    initialSpeechTimer = setTimeout(() => {
      if (!hasSpoken) {
        stopRecordingWithCleanup('no speech detected');
      }
    }, INITIAL_SPEECH_TIMEOUT);

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      console.log('✅ [Recording] Transcript:', transcript);
      onTranscript(transcript);

      // Stop recording immediately after getting transcript
      console.log('🛑 [Recording] Stopping...');
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxRecordingTimer) clearTimeout(maxRecordingTimer);
      if (initialSpeechTimer) clearTimeout(initialSpeechTimer);
      if (silenceCheckInterval) clearInterval(silenceCheckInterval);
      recognition.stop();
      onStopRecording();
    };

    recognition.onerror = (error: any) => {
      if (error.error !== 'aborted') {
        console.error('❌ [Recording] Error:', error.error);
      }
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxRecordingTimer) clearTimeout(maxRecordingTimer);
      if (initialSpeechTimer) clearTimeout(initialSpeechTimer);
      if (silenceCheckInterval) clearInterval(silenceCheckInterval);
      onStopRecording();
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (maxRecordingTimer) clearTimeout(maxRecordingTimer);
      if (initialSpeechTimer) clearTimeout(initialSpeechTimer);
      if (silenceCheckInterval) clearInterval(silenceCheckInterval);
    };

    recognition.start();
    console.log('🔴 [Recording] Listening... (speak now)');

    return {
      audioContext,
      analyser,
      microphone,
      javascriptNode,
      currentStream: stream,
      recognition,
      silenceCheckInterval
    };
  } catch (error) {
    console.error('[Recording] Error starting recording:', error);
    return null;
  }
}

/**
 * Stop recording and cleanup resources
 */
export function stopRecording(state: MicrophoneState): void {
  if (state.recognition) {
    try {
      state.recognition.stop();
    } catch (e) {
      // Silently handle - already stopped
    }
  }

  if (state.silenceCheckInterval) {
    clearInterval(state.silenceCheckInterval);
    state.silenceCheckInterval = null;
  }

  if (state.javascriptNode) {
    state.javascriptNode.disconnect();
    state.javascriptNode = null;
  }
  if (state.analyser) {
    state.analyser.disconnect();
    state.analyser = null;
  }
  if (state.microphone) {
    state.microphone.disconnect();
    state.microphone = null;
  }
  if (state.audioContext) {
    state.audioContext.close();
    state.audioContext = null;
  }
  if (state.currentStream) {
    state.currentStream.getTracks().forEach(track => track.stop());
    state.currentStream = null;
  }
}

/**
 * Request microphone permission with timeout and validation
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('[Microphone] MediaDevices API not supported');
      return false;
    }

    // Request permission with longer timeout (15 seconds - enough time for user to allow)
    // Note: Don't check devices before permission - browsers don't show devices until permission is granted
    const getUserMediaPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const timeoutPromise = new Promise<MediaStream>((_, reject) => {
      setTimeout(() => reject(new Error('getUserMedia timeout after 15 seconds - user may have dismissed permission dialog')), 15000);
    });

    const permissionStream = await Promise.race([getUserMediaPromise, timeoutPromise]);

    // Stop the stream immediately (we just needed permission)
    permissionStream.getTracks().forEach(track => track.stop());
    console.log('[Microphone] Permission granted');
    return true;
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      console.error('[Microphone] Permission denied by user');
    } else if (error.message && error.message.includes('timeout')) {
      console.error('[Microphone] Timeout waiting for permission - user may need to check browser settings');
    } else {
      console.error('[Microphone] Error accessing microphone:', error);
    }
    return false;
  }
}

/**
 * Check browser compatibility for speech recognition
 */
export function checkBrowserCompatibility(): boolean {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('[Microphone] Speech recognition not supported in this browser');
    return false;
  }
  return true;
}

