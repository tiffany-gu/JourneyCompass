# Voice Conversation Design for Journey

## Part 1: Improved Auto-Stop Detection ✅ IMPLEMENTED

### Industry-Standard Timeouts

Based on Google Cloud Speech-to-Text and Alexa best practices:

| Timeout | Duration | Purpose |
|---------|----------|---------|
| **Speech End** | 1.2s | Natural pause after speaking (down from 3.5s) |
| **Initial Speech** | 8s | Timeout if user never speaks after wake word |
| **Max Recording** | 30s | Safety limit to prevent runaway recording |

### How It Works

```
User says wake word → Recording starts
                      ↓
User starts speaking → "🎙️ Speech detected"
                      ↓ (clears initial speech timeout)
User keeps talking → Silence timer resets continuously
                      ↓
User stops speaking → 1.2 second countdown starts
                      ↓
No more speech → "⏱️ Auto-stopping (speech ended)"
```

### Three Safety Mechanisms

1. **Speech End Detection** (1.2s)
   - Most common scenario
   - Triggers when user finishes speaking
   - Industry standard: 500ms-2s (we chose 1.2s as sweet spot)

2. **No Speech Detection** (8s)
   - Protects against accidental wake word triggers
   - User said "Hey Journey" but didn't actually want to speak
   - Prevents awkward "waiting for input" state

3. **Maximum Duration** (30s)
   - Safety net for edge cases
   - Prevents recording from running indefinitely
   - Most voice commands are 3-10 seconds anyway

### Why This Is Better

**Before:**
- 3.5 seconds felt sluggish
- No protection against accidental triggers
- No maximum recording limit

**After:**
- 1.2 seconds feels responsive and natural
- Handles edge cases (no speech, too long)
- Better user experience overall

---

## Part 2: Bidirectional Conversation (Journey Talks Back)

### Conversation Flow Design

```
┌─────────────────────────────────────────────────────────────┐
│                    CONVERSATION STATES                       │
└─────────────────────────────────────────────────────────────┘

1. IDLE
   └─> User clicks mic button
       └─> Go to WAKE_WORD_LISTENING

2. WAKE_WORD_LISTENING
   └─> User says "Hey Journey"
       └─> Go to USER_SPEAKING

3. USER_SPEAKING
   └─> User speaks command (1.2s auto-stop)
       └─> Go to PROCESSING

4. PROCESSING
   └─> Send to backend → Get AI response
       └─> Go to JOURNEY_SPEAKING

5. JOURNEY_SPEAKING ⭐ NEW
   └─> Play TTS audio response
       └─> Go to COOLDOWN (or WAKE_WORD_LISTENING if multi-turn)

6. COOLDOWN
   └─> Brief pause (1-2s)
       └─> Go to WAKE_WORD_LISTENING
```

### Critical Design Decisions

#### 1. **Microphone Management During TTS Playback**

**Problem:** When Journey speaks, microphone must be PAUSED to prevent:
- Feedback loops (Journey hearing itself)
- Accidental wake word re-triggering
- Audio echo/distortion

**Solution:**
```typescript
interface ConversationState {
  mode: 'idle' | 'listening' | 'user_speaking' | 'processing' | 'journey_speaking';
  isMicrophoneActive: boolean;
  isAudioPlaying: boolean;
}

// When Journey starts speaking:
pauseWakeWordDetection();  // Stop listening temporarily
playTTSAudio(response);    // Play Journey's response

// When audio finishes:
onAudioComplete(() => {
  setTimeout(() => {
    resumeWakeWordDetection();  // Resume listening after brief pause
  }, 1500);  // 1.5s cooldown
});
```

#### 2. **Turn-Taking Protocol**

**Single-Turn Mode** (Current - Best for trip planning):
```
User: "Hey Journey, plan a trip from SF to LA"
Journey: [speaks route details]
→ Returns to wake word detection
→ User must say "Hey Journey" again for next command
```

**Multi-Turn Mode** (Future - Natural conversation):
```
User: "Hey Journey, plan a trip from SF to LA"
Journey: [speaks route details] "Would you like me to add stops?"
→ Automatically starts recording (no wake word needed)
User: "Yes, add a coffee shop"
Journey: [adds stop] "Done! Anything else?"
→ Continues conversation...
```

#### 3. **Audio Priority System**

```typescript
enum AudioPriority {
  USER_SPEECH = 3,      // Highest - always interrupt Journey
  JOURNEY_TTS = 2,      // Medium - can be interrupted
  BACKGROUND_AUDIO = 1  // Lowest - nav instructions, music
}

// If user says "Hey Journey" while Journey is speaking:
if (isJourneySpeaking && wakeWordDetected) {
  stopTTSPlayback();           // Immediately stop Journey
  startUserRecording();        // Start recording user
  showVisualFeedback("I'm listening..."); // Visual cue
}
```

### Implementation Architecture

#### New Components Needed

**1. Text-to-Speech Service** (`client/src/lib/ttsService.ts`)
```typescript
interface TTSOptions {
  voice?: 'female' | 'male' | 'neutral';
  rate?: number;  // 0.5-2.0
  pitch?: number; // 0.5-2.0
}

export async function speakText(
  text: string,
  options?: TTSOptions
): Promise<void> {
  // Option A: Web Speech API (free, browser-native)
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1.0;
  utterance.pitch = options?.pitch ?? 1.0;
  speechSynthesis.speak(utterance);

  // Option B: ElevenLabs / Google TTS (premium, better quality)
  // const audio = await fetch('/api/tts', { body: { text } });
  // playAudio(audio);
}
```

**2. Conversation Manager** (`client/src/hooks/useConversation.ts`)
```typescript
interface ConversationManager {
  state: ConversationState;

  // User actions
  startConversation: () => void;
  stopConversation: () => void;

  // Journey actions
  speakResponse: (text: string) => Promise<void>;

  // State checks
  canUserSpeak: () => boolean;
  isJourneySpeaking: () => boolean;
}
```

**3. Enhanced Microphone Hook** (extend `useMicrophone.ts`)
```typescript
// Add pause/resume capability
export function useMicrophone(options: UseMicrophoneOptions) {
  // ... existing code ...

  const pauseListening = useCallback(() => {
    // Temporarily pause wake word detection
    // WITHOUT fully stopping (so we can resume quickly)
    if (wakeWordRecognitionRef.current) {
      wakeWordRecognitionRef.current.stop();
    }
  }, []);

  const resumeListening = useCallback(() => {
    // Resume wake word detection after Journey finishes speaking
    if (enableWakeWord && isListeningRef.current) {
      wakeWordRecognitionRef.current = startWakeWordDetection(
        handleWakeWordDetected,
        () => isListeningRef.current
      );
    }
  }, [enableWakeWord]);

  return {
    // ... existing returns ...
    pauseListening,
    resumeListening,
  };
}
```

### Visual Feedback States

Critical for user understanding of what's happening:

```typescript
interface VoiceIndicator {
  state: 'idle' | 'listening' | 'recording' | 'processing' | 'speaking';
  icon: string;
  color: string;
  animation: string;
  message: string;
}

const states: Record<string, VoiceIndicator> = {
  idle: {
    icon: '🎤',
    color: 'gray',
    animation: 'none',
    message: 'Click to start'
  },
  listening: {
    icon: '👂',
    color: 'blue',
    animation: 'pulse',
    message: 'Listening for "Hey Journey"...'
  },
  recording: {
    icon: '🔴',
    color: 'red',
    animation: 'pulse-fast',
    message: 'I\'m listening...'
  },
  processing: {
    icon: '💭',
    color: 'yellow',
    animation: 'spinner',
    message: 'Thinking...'
  },
  speaking: {
    icon: '🗣️',
    color: 'green',
    animation: 'wave',
    message: 'Journey is speaking...'
  }
};
```

### Backend Integration

**Current Flow:**
```
Frontend → /api/chat → OpenAI → Text Response → Frontend
```

**New Flow with Voice:**
```
Frontend → /api/chat → OpenAI → Text Response
                                    ↓
                              Format for TTS
                                    ↓
                         Frontend TTS Service
                                    ↓
                            Journey speaks!
```

**API Enhancement:**
```typescript
// server/routes.ts
app.post('/api/chat', async (req, res) => {
  const { message, voiceMode } = req.body;

  // Get AI response
  const aiResponse = await getAIResponse(message);

  if (voiceMode) {
    // Format response for natural speech
    const spokenResponse = formatForSpeech(aiResponse);

    res.json({
      text: aiResponse,           // For display
      spokenText: spokenResponse, // For TTS (may be shortened)
      shouldSpeak: true
    });
  } else {
    res.json({ text: aiResponse });
  }
});

function formatForSpeech(text: string): string {
  // Remove markdown
  // Shorten long responses
  // Add natural pauses with SSML if using premium TTS
  // Example: "I found 3 stops." instead of "I found 3 stops: Coffee Shop (0.5 miles), Gas Station (1.2 miles)..."
  return text;
}
```

### Recommended Implementation Phases

**Phase 1: Basic TTS** (1-2 hours)
- [ ] Add Web Speech API TTS service
- [ ] Pause microphone when Journey speaks
- [ ] Resume after 1.5 second cooldown
- [ ] Visual indicator for "Journey speaking" state

**Phase 2: Interruption Handling** (2-3 hours)
- [ ] Detect wake word during TTS playback
- [ ] Stop TTS immediately when interrupted
- [ ] Smooth transition to recording

**Phase 3: Conversation Context** (3-4 hours)
- [ ] Track conversation history
- [ ] Multi-turn conversation support
- [ ] Context-aware responses

**Phase 4: Premium TTS** (Optional)
- [ ] Integrate ElevenLabs or Google TTS
- [ ] Custom voice selection
- [ ] SSML for natural prosody

### Testing Scenarios

1. **Happy Path**
   - User: "Hey Journey" → Journey responds → User waits → "Hey Journey" again ✅

2. **Interruption**
   - User: "Hey Journey" → Journey starts speaking → User: "Hey Journey" (interrupts) ✅

3. **Background Noise**
   - Journey speaking shouldn't trigger false wake word detection ✅

4. **Error Recovery**
   - TTS fails → Fall back to text-only mode ✅
   - Microphone busy → Show clear error message ✅

### Configuration Options

```typescript
interface VoiceConversationConfig {
  // Auto-stop behavior
  speechEndTimeout: number;      // 1200ms default
  initialSpeechTimeout: number;  // 8000ms default
  maxRecordingTime: number;      // 30000ms default

  // TTS behavior
  enableVoiceResponse: boolean;  // true/false
  ttsVoice: 'browser' | 'elevenlabs' | 'google';
  ttsRate: number;               // 1.0 default
  ttsPitch: number;              // 1.0 default

  // Conversation behavior
  conversationMode: 'single-turn' | 'multi-turn';
  cooldownAfterSpeaking: number; // 1500ms default
  allowInterruption: boolean;    // true default
}
```

---

## Summary

### What's Implemented ✅
- Industry-standard auto-stop detection (1.2s)
- Three-layer safety (speech end, no speech, max duration)
- Better logging and feedback

### What's Next 🚀
- Text-to-Speech integration
- Microphone pause/resume during TTS
- Conversation state management
- Visual indicators for all states
- Interruption handling

### Key Principles
1. **User is always in control** - Can interrupt Journey anytime
2. **Clear feedback** - Always show what state we're in
3. **Graceful degradation** - Falls back to text if TTS fails
4. **Privacy first** - Mic off when Journey speaks
