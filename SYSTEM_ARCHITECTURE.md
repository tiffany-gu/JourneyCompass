# NaviAI/Journey - System Architecture & Data Flow

## 📋 Table of Contents
1. [High-Level Overview](#high-level-overview)
2. [Detailed Component Breakdown](#detailed-component-breakdown)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [API Endpoints](#api-endpoints)
5. [Technology Stack](#technology-stack)

---

## 🎯 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            USER INTERFACE                            │
│                     (React + TypeScript + Vite)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTP/REST API
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                         EXPRESS SERVER                               │
│                      (Node.js + TypeScript)                          │
└───┬──────────────┬──────────────┬──────────────┬────────────────────┘
    │              │              │              │
    │              │              │              │
┌───▼────┐  ┌──────▼─────┐  ┌────▼─────┐  ┌────▼──────┐
│ SQLite │  │ Azure      │  │ Google   │  │ ElevenLabs│
│   DB   │  │ OpenAI     │  │ Maps API │  │    TTS    │
│        │  │ (GPT-5)    │  │          │  │           │
└────────┘  └────────────┘  └──────────┘  └───────────┘
```

---

## 🔧 Detailed Component Breakdown

### 1. **Frontend (Client)**

```
client/
├── src/
│   ├── pages/
│   │   └── JourneyAssistant.tsx    ← Main UI orchestrator
│   ├── components/
│   │   ├── ChatMessage.tsx         ← Message bubble display (+ TTS trigger)
│   │   ├── MessageInput.tsx        ← Text/voice input field
│   │   ├── MapView.tsx             ← Google Maps display
│   │   ├── StopCard.tsx            ← Stop recommendation cards
│   │   └── RouteComparisonCard.tsx ← Trip summary display
│   ├── hooks/
│   │   └── useMicrophone.ts        ← Voice input state management
│   └── lib/
│       ├── microphoneService.ts    ← Wake word detection + recording
│       ├── elevenLabsService.ts    ← Text-to-speech output
│       └── queryClient.ts          ← API request wrapper
```

**Key Frontend Features:**
- 🎤 **Wake Word Detection**: "Hey Journey" using Web Speech API
- 🔊 **Voice Output**: ElevenLabs TTS (Matilda voice)
- 🗣️ **Voice Input**: Continuous recording with silence detection (2s timeout)
- 🗺️ **Interactive Map**: Google Maps with route visualization + waypoints
- 💬 **Chat Interface**: Conversational UI with message history

---

### 2. **Backend (Server)**

```
server/
├── index.ts                    ← Express server setup
├── routes.ts                   ← API endpoints (chat, plan-route, find-stops)
├── gpt.ts                      ← Azure OpenAI integration (NLP parsing)
├── maps.ts                     ← Google Maps API integration
├── concierge.ts                ← Intelligent stop selection algorithm
├── timeConstraintParser.ts     ← Time constraint NLP parser
├── timeUtils.ts                ← Time calculations for deadlines
└── storage.ts                  ← SQLite database operations
```

**Key Backend Modules:**

#### **A. NLP & Parsing (`gpt.ts` + `timeConstraintParser.ts`)**
- Extracts: origin, destination, preferences, time constraints, tasks
- Uses: Azure OpenAI GPT-5 + Regex fallback
- Handles: "I need to get to Emory by 1pm and pick up groceries"
  - Destination: "Emory"
  - Time Constraint: Arrival deadline at 1:00 PM
  - Task: "grocery" (grocery store stop needed)

#### **B. Route Planning (`maps.ts`)**
- Google Directions API for route calculation
- Google Places API for stop discovery
- Reverse geocoding for current location
- Waypoint optimization

#### **C. Stop Selection (`concierge.ts`)**
- Finds stops along route (gas, restaurants, scenic viewpoints)
- Filters by user preferences (e.g., "highly rated restaurant")
- Verifies stop quality using Google Places data
- Prioritizes stops based on route deviation

#### **D. Time Allocation (`timeUtils.ts` + `timeConstraintParser.ts`)**
- Parses time constraints: "in 2 hours", "by 5pm", "arrive at 3:30pm"
- Calculates available time budget
- Allocates time per stop type:
  - Gas: 5-10 minutes
  - Restaurant: 30-60 minutes
  - Grocery: 20-30 minutes
  - Scenic: 15-20 minutes

#### **E. Data Persistence (`storage.ts`)**
- SQLite database with Drizzle ORM
- Tables:
  - `trip_requests`: Trip metadata (origin, destination, preferences)
  - `conversation_messages`: Chat history
  - `user_preferences`: Saved user settings

---

## 🔄 Data Flow Diagrams

### Flow 1: Voice Input → Route Generation

```
┌─────────────────┐
│  USER SPEAKS    │ "Hey Journey, I need to get to Emory by 1pm
│                 │  and pick up groceries"
└────────┬────────┘
         │
         │ (1) Wake word detected by Web Speech API
         │
┌────────▼────────┐
│ microphoneService│ Activates recording
│ .startRecording │ (2s silence timeout, -25dB threshold)
└────────┬────────┘
         │
         │ (2) Audio captured → Web Speech API transcribes
         │
┌────────▼────────┐
│ Transcription   │ "I need to get to Emory by 1pm
│                 │  and pick up groceries"
└────────┬────────┘
         │
         │ (3) POST /api/chat with message + userLocation
         │
┌────────▼────────────────────────────────────────────────────┐
│                    SERVER: routes.ts                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 1: Parse Request (gpt.ts)                       │  │
│  │  - Azure OpenAI GPT-5 extracts parameters             │  │
│  │  - Regex fallback for time constraints                │  │
│  │  Result: {                                             │  │
│  │    origin: "Current Location (reverse geocoded)"      │  │
│  │    destination: "Emory"                                │  │
│  │    timeConstraint: { type: "deadline",                 │  │
│  │                      value: Date(1pm today) }          │  │
│  │    tasks: ["grocery"]                                  │  │
│  │  }                                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 2: Store in SQLite                               │  │
│  │  - Create trip_request record                          │  │
│  │  - Save conversation message                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Step 3: Generate AI Response                          │  │
│  │  - GPT-5 creates friendly confirmation                 │  │
│  │  Response: "Got it! Planning your route to Emory      │  │
│  │             with a grocery stop, arriving by 1pm."     │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ (4) Return: { response, tripRequestId, hasMissingInfo }
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    CLIENT: JourneyAssistant.tsx                │
│  - Display AI message in chat                                  │
│  - Trigger ElevenLabs TTS (speaks response)                    │
│  - If !hasMissingInfo: Call /api/plan-route                    │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ (5) POST /api/plan-route { tripRequestId }
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    SERVER: routes.ts                           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Step 1: Calculate Route (maps.ts)                      │  │
│  │  - Google Directions API                                │  │
│  │  - Origin → Destination                                 │  │
│  │  Result: {                                              │  │
│  │    legs: [{ distance, duration, start_address, ... }]  │  │
│  │    overview_polyline: "encoded_polyline_string"        │  │
│  │  }                                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Step 2: Calculate Time Budget (timeUtils.ts)          │  │
│  │  - Parse deadline: "by 1pm" → 1:00 PM today            │  │
│  │  - Calculate travel time from route                    │  │
│  │  - Determine available time for stops                  │  │
│  │  Result: {                                              │  │
│  │    arrivalDeadline: Date(1pm),                         │  │
│  │    totalTravelTime: 3600s (1 hour),                    │  │
│  │    availableStopTime: 1200s (20 minutes)               │  │
│  │  }                                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Step 3: Return Route + Time Info                       │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ (6) Return: { selectedRoute }
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    CLIENT: JourneyAssistant.tsx                  │
│  - Display route on map                                          │
│  - Show AI message: "I've found your route!"                     │
│  - If user requested stops: Call /api/find-stops                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ (7) POST /api/find-stops { tripRequestId }
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    SERVER: routes.ts                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 1: Find Stops Along Route                          │  │
│  │  - concierge.ts: findRouteConciergeStops()               │  │
│  │  - Sample 5 points along route polyline                  │  │
│  │  - Google Places API search at each point:               │  │
│  │    * "grocery_or_supermarket" (for grocery task)         │  │
│  │    * "gas_station" (auto-added)                          │  │
│  │    * "restaurant" (if requested)                         │  │
│  │  - Filter by rating (>4.0), distance from route          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 2: Allocate Time to Stops (timeUtils.ts)           │  │
│  │  - Available time: 20 minutes                             │  │
│  │  - Grocery stop: Allocate 20 minutes                      │  │
│  │  - Add recommendedDurationMinutes to each stop            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Step 3: Return Stops                                     │  │
│  │  Result: {                                                 │  │
│  │    stops: [                                                │  │
│  │      {                                                     │  │
│  │        type: "grocery",                                    │  │
│  │        name: "Publix Super Market",                        │  │
│  │        rating: 4.5,                                        │  │
│  │        distanceOffRoute: "0.2 miles",                      │  │
│  │        recommendedDurationMinutes: 20,                     │  │
│  │        location: { lat, lng }                              │  │
│  │      }                                                     │  │
│  │    ]                                                        │  │
│  │  }                                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ (8) Return: { stops, route }
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    CLIENT: JourneyAssistant.tsx                  │
│  - Display stop cards (StopCard.tsx)                             │
│  - Show "Recommended: 20 min" badge                              │
│  - User clicks "Add to Route" button                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ (9) POST /api/recalculate-route
                            │     { tripRequestId, waypoints: [{name, location}] }
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    SERVER: routes.ts                             │
│  - Google Directions API with waypoints                          │
│  - optimizeWaypoints: true (reorders for efficiency)             │
│  - Returns new route with stops as intermediate destinations     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ (10) Return: { route, waypoints (optimized order) }
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    CLIENT: JourneyAssistant.tsx                  │
│  - Update map with new route (includes waypoints)                │
│  - Show route comparison card with ETA                           │
│  - Display: "Route updated! Your journey includes 1 stop.       │
│              Estimated travel time: 1h 20m (including 20         │
│              minutes for stops)"                                 │
│  - User clicks "Start Navigation"                                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flow 2: Text-to-Speech Output

```
┌─────────────────────────────────────────────────────────────────┐
│  SERVER sends AI response                                        │
│  Example: "Got it! Planning your route to Emory with a grocery  │
│            stop, arriving by 1pm."                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Response received by client
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  CLIENT: JourneyAssistant.tsx                                    │
│  - Add message to messages array with isUser: false              │
│  - Render ChatMessage component                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Component renders
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  ChatMessage.tsx - useEffect hook                                │
│  - Detects isUser === false (AI message)                         │
│  - Checks if TTS is enabled (API key present)                    │
│  - Calls speakText(message)                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  elevenLabsService.ts                                            │
│  1. POST to ElevenLabs API                                       │
│     URL: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}  │
│     Headers: { "xi-api-key": VITE_ELEVENLABS_API_KEY }          │
│     Body: {                                                      │
│       text: "Got it! Planning your route...",                    │
│       model_id: "eleven_turbo_v2_5",                             │
│       voice_settings: {                                          │
│         stability: 0.5,                                          │
│         similarity_boost: 0.75,                                  │
│         use_speaker_boost: true                                  │
│       }                                                          │
│     }                                                            │
│  2. Receive MP3 audio stream                                     │
│  3. Create Audio element from Blob                               │
│  4. Auto-play audio                                              │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ Audio plays in browser
                             │
                             ▼
                    🔊 User hears: "Got it!
                       Planning your route to Emory..."
```

---

### Flow 3: Wake Word Detection

```
                        ┌──────────────────┐
                        │  App loads       │
                        │  User clicks     │
                        │  microphone icon │
                        └────────┬─────────┘
                                 │
                                 │ toggleListening()
                                 │
                        ┌────────▼─────────┐
                        │ useMicrophone    │
                        │ hook starts      │
                        │ wake word mode   │
                        └────────┬─────────┘
                                 │
                                 │ Calls startWakeWordDetection()
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│  microphoneService.ts - startWakeWordDetection()                 │
│                                                                   │
│  1. Initialize Web Speech Recognition API                        │
│     - recognition.continuous = true (keep listening)             │
│     - recognition.interimResults = false                         │
│                                                                   │
│  2. Start listening loop                                         │
│     recognition.start()                                          │
│     console.log("🎤 Listening for 'Hey Journey'...")            │
│                                                                   │
│  3. Listen for speech                                            │
│     recognition.onresult = (event) => {                          │
│       const transcript = event.results[...]                      │
│       if (transcript.includes("hey journey")) {                  │
│         console.log("✅ Wake word detected!")                   │
│         recognition.stop()                                       │
│         onWakeWordDetected() // Callback to start recording      │
│       }                                                          │
│     }                                                            │
│                                                                   │
│  4. Auto-restart on end (continuous detection)                   │
│     recognition.onend = () => {                                  │
│       if (isListening) recognition.start()                       │
│     }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Wake word "Hey Journey" detected!
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  useMicrophone hook - handleWakeWordDetected()                   │
│  - Set isRecording = true                                        │
│  - Call startRecordingWithSilenceDetection()                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  microphoneService.ts - startRecordingWithSilenceDetection()     │
│                                                                   │
│  1. Request microphone access                                    │
│     navigator.mediaDevices.getUserMedia({ audio: true })         │
│                                                                   │
│  2. Setup audio analysis                                         │
│     - Create AudioContext + AnalyserNode                         │
│     - Monitor audio level every 100ms                            │
│     - Silence threshold: -25 dB                                  │
│                                                                   │
│  3. Start Web Speech Recognition for transcription               │
│     recognition.continuous = true                                │
│     recognition.start()                                          │
│     console.log("🔴 Listening... (speak now)")                  │
│                                                                   │
│  4. Detect speech/silence                                        │
│     - If volume > -25dB: User is speaking                        │
│       * Clear silence timer                                      │
│     - If volume < -25dB AND user has spoken:                     │
│       * Start 2-second countdown                                 │
│       * If 2 seconds of silence: Stop recording                  │
│                                                                   │
│  5. Timeouts for safety                                          │
│     - Max recording: 30 seconds                                  │
│     - Initial speech: 8 seconds (must speak within this time)    │
│                                                                   │
│  6. On transcription complete                                    │
│     recognition.onresult = (event) => {                          │
│       const transcript = event.results[...]                      │
│       console.log("✅ Transcript:", transcript)                 │
│       onTranscript(transcript) // Send to chat                   │
│       onStopRecording() // Clean up                              │
│     }                                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ User speaks: "I need to get to Emory by 1pm..."
                            │ (2 seconds of silence detected)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│  Transcription sent to JourneyAssistant.tsx                      │
│  - Calls handleSendMessage(text)                                 │
│  - POST /api/chat with message                                   │
│  [Continues with Flow 1 above...]                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### **POST /api/chat**
**Purpose**: Process user message and extract trip parameters

**Request Body**:
```json
{
  "message": "I need to get to Emory by 1pm and pick up groceries",
  "tripRequestId": "uuid-123" (optional, for follow-up messages),
  "userLocation": { "lat": 33.7490, "lng": -84.3880 } (optional)
}
```

**Response**:
```json
{
  "response": "Got it! Planning your route to Emory with a grocery stop, arriving by 1pm.",
  "tripRequestId": "uuid-123",
  "hasMissingInfo": false,
  "requestedStops": true
}
```

---

### **POST /api/plan-route**
**Purpose**: Calculate route using Google Maps

**Request Body**:
```json
{
  "tripRequestId": "uuid-123"
}
```

**Response**:
```json
{
  "selectedRoute": {
    "legs": [
      {
        "distance": { "text": "12.5 mi", "value": 20117 },
        "duration": { "text": "25 mins", "value": 1500 },
        "start_address": "123 Main St, Atlanta, GA",
        "end_address": "Emory University, Atlanta, GA",
        "steps": [...]
      }
    ],
    "overview_polyline": { "points": "encoded_string" },
    "bounds": { "northeast": {...}, "southwest": {...} }
  }
}
```

---

### **POST /api/find-stops**
**Purpose**: Find recommended stops along route

**Request Body**:
```json
{
  "tripRequestId": "uuid-123"
}
```

**Response**:
```json
{
  "stops": [
    {
      "type": "grocery",
      "name": "Publix Super Market",
      "category": "grocery_or_supermarket",
      "rating": 4.5,
      "priceLevel": "$$",
      "hours": "Open until 10:00 PM",
      "distanceOffRoute": "0.2 miles",
      "reason": "Highly rated grocery store (4.5★) only 0.2 miles off your route.",
      "location": { "lat": 33.7550, "lng": -84.3900 },
      "recommendedDurationMinutes": 20,
      "recommendedDuration": "20 min"
    }
  ],
  "route": { ... } (route recalculated with stops as waypoints)
}
```

---

### **POST /api/recalculate-route**
**Purpose**: Recalculate route with user-added waypoints

**Request Body**:
```json
{
  "tripRequestId": "uuid-123",
  "waypoints": [
    {
      "name": "Publix Super Market",
      "location": { "lat": 33.7550, "lng": -84.3900 }
    }
  ]
}
```

**Response**:
```json
{
  "route": { ... }, (new route with waypoints)
  "waypoints": [ ... ] (optimized waypoint order from Google)
}
```

---

## 🛠️ Technology Stack

### **Frontend**
| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React 18 + TypeScript | Component-based UI |
| Build Tool | Vite | Fast dev server + builds |
| State Management | React Query (TanStack) | Server state caching |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS |
| Maps | Google Maps JavaScript API | Route visualization |
| Voice Input | Web Speech API | Wake word + transcription |
| Voice Output | ElevenLabs API | Natural text-to-speech |

### **Backend**
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Server | Express.js + TypeScript | REST API |
| Database | SQLite + Drizzle ORM | Data persistence |
| AI/NLP | Azure OpenAI (GPT-5) | Intent parsing + responses |
| Maps/Routing | Google Maps APIs | Directions + Places |
| Transcription | Web Speech API (client-side) | Voice-to-text |
| Time Parsing | Custom Regex + Chrono.js | Time constraint extraction |

### **External APIs**
| Service | Usage | Cost |
|---------|-------|------|
| Azure OpenAI | GPT-5 for NLP parsing | Pay-per-token |
| Google Maps | Directions + Places + Geocoding | Pay-per-request (credits available) |
| ElevenLabs | Text-to-speech (Matilda voice) | 10,000 chars/month free |

---

## 📊 Database Schema

```sql
-- Trip Requests
CREATE TABLE trip_requests (
  id TEXT PRIMARY KEY,
  origin TEXT,
  destination TEXT,
  preferences TEXT, -- JSON array
  stops TEXT,       -- JSON array
  time_constraint TEXT, -- JSON object
  created_at INTEGER NOT NULL
);

-- Conversation Messages
CREATE TABLE conversation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_request_id TEXT NOT NULL,
  role TEXT NOT NULL, -- "user" or "assistant"
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (trip_request_id) REFERENCES trip_requests(id)
);

-- User Preferences (future)
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  preferred_gas_chains TEXT, -- JSON array
  food_preferences TEXT,     -- JSON array
  avoid_tolls BOOLEAN
);
```

---

## 🧠 Key Algorithms

### **1. Time Constraint Parsing**

**Input**: "I need to get to Emory by 1pm and pick up groceries"

**Process**:
```
1. Extract time phrase: "by 1pm"
2. Determine constraint type: "deadline" (vs "duration" like "in 2 hours")
3. Parse time: 1:00 PM (using Chrono.js + regex)
4. Calculate deadline: Today at 1:00 PM
5. Return: {
     type: "deadline",
     value: Date(2025-01-09 13:00:00),
     originalText: "by 1pm",
     flexibility: "hard"
   }
```

**Patterns Supported**:
- Deadlines: "by 5pm", "arrive at 3:30pm", "need to be there by noon"
- Durations: "in 2 hours", "within 45 minutes"
- Relative: "before sunset", "after lunch"

---

### **2. Time Budget Allocation**

**Input**:
- Route duration: 1 hour (3600s)
- Deadline: 1:00 PM
- Current time: 11:30 AM
- Available time: 1.5 hours (5400s)
- Tasks: ["grocery"]

**Process**:
```
1. Calculate travel buffer:
   availableTime = (deadline - currentTime) - travelTime
   = (1:00 PM - 11:30 AM) - 1 hour
   = 1.5 hours - 1 hour
   = 30 minutes

2. Allocate time to tasks:
   - Grocery: 20 minutes (recommended)
   - Buffer: 10 minutes (safety margin)

3. Assign to stop:
   stop.recommendedDurationMinutes = 20
   stop.maxDurationMinutes = 25
```

**Stop Duration Defaults**:
- Gas: 5-10 minutes
- Fast food: 15-20 minutes
- Sit-down restaurant: 30-60 minutes
- Grocery: 20-30 minutes
- Scenic viewpoint: 10-20 minutes
- Pharmacy: 10-15 minutes

---

### **3. Stop Selection Algorithm (Concierge)**

**Input**:
- Route polyline
- User preferences: ["highly rated restaurant", "gas station"]
- Tasks: ["grocery"]

**Process**:
```
1. Sample route polyline at 5 points:
   - 0% (start)
   - 25% of route
   - 50% of route
   - 75% of route
   - 100% (end)

2. For each sample point:
   - Query Google Places API within 2-mile radius
   - Search for: grocery_or_supermarket, gas_station, restaurant

3. Filter stops:
   - Rating > 4.0 stars
   - Currently open (check business hours)
   - Distance off route < 3 miles
   - Not too close to start/end (> 10% into route)

4. Rank stops:
   - Priority 1: User tasks (grocery)
   - Priority 2: User preferences (highly rated)
   - Priority 3: Convenience (close to route)

5. Select top 3 stops per category
6. Verify attributes (gas station quality, restaurant type)
7. Return with reasons
```

**Example Output**:
```json
{
  "type": "grocery",
  "name": "Publix Super Market",
  "rating": 4.5,
  "distanceOffRoute": "0.2 miles",
  "reason": "Highly rated grocery store (4.5★) only 0.2 miles off your route. Perfect for picking up groceries on the way.",
  "verifiedAttributes": ["wheelchair_accessible", "accepts_credit_cards"]
}
```

---

## 🔐 Security & Privacy

- **API Keys**: Stored in `.env.local`, never committed to Git
- **User Location**: Requested on-demand, not stored permanently
- **Conversation History**: Stored locally in SQLite, not sent to external servers
- **Voice Data**: Processed client-side by Web Speech API (no audio uploaded to server)

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Express Server (Node.js)                               │    │
│  │  - Serves static React build                            │    │
│  │  - Handles /api/* requests                              │    │
│  │  - Port: 3000 (configurable via PORT env var)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  SQLite Database (local file)                           │    │
│  │  - trip_requests.db                                      │    │
│  │  - Co-located with server                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  External API Calls:                                             │
│  → Azure OpenAI (GPT-5)                                          │
│  → Google Maps APIs                                              │
│  → ElevenLabs TTS (client-side)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Example User Journey

**User**: *Clicks microphone icon*

**App**: 🎤 *Starts wake word detection* → "Listening for 'Hey Journey'..."

**User**: "Hey Journey"

**App**: 🔴 *Starts recording* → "Listening... (speak now)"

**User**: "I need to get to Emory University by 1pm and pick up groceries"

**App**:
1. ✅ Transcribes speech
2. 📤 Sends to `/api/chat`
3. 🧠 Azure GPT-5 parses:
   - Destination: "Emory University"
   - Deadline: 1:00 PM today
   - Task: "grocery"
4. 🔊 Matilda says: "Got it! Planning your route to Emory University with a grocery stop, arriving by 1pm."
5. 🗺️ Calculates route (1 hour drive)
6. 🛒 Finds grocery store along route (Publix, +0.2 miles)
7. ⏱️ Allocates 20 minutes for grocery shopping
8. 📍 Displays route + stop card: "Publix Super Market - Recommended: 20 min"

**User**: *Clicks "Add to Route" on Publix card*

**App**:
1. 📤 POST `/api/recalculate-route` with Publix as waypoint
2. 🗺️ Google optimizes route: Home → Publix → Emory
3. 📊 Shows updated ETA: "1h 20m (including 20 min for stops)"
4. 🎯 Displays on map with waypoint marker

**User**: *Clicks "Start Navigation"*

**App**: 🧭 "Navigation started! Drive safely!"

---

## 🎨 UI Components Reference

### **1. JourneyAssistant (Main Page)**
- Chat interface (left 40% of screen)
- Map view (right 60% of screen)
- Message input with voice button
- Route comparison card
- Stop cards

### **2. ChatMessage**
- Message bubble (user = right, AI = left)
- Dismiss button (for welcome message only)
- Auto-triggers TTS for AI messages
- Timestamp display

### **3. StopCard**
- Stop name + rating + hours
- "Recommended: X min" badge
- Distance off route
- "Add to Route" / "Skip" buttons
- Verified attributes badges

### **4. MapView**
- Google Maps with route polyline
- Origin marker (green)
- Destination marker (red)
- Waypoint markers (blue)
- User location marker (blue dot with pulse)

### **5. RouteComparisonCard**
- ETA + total distance
- Number of stops
- Added stops list with remove buttons
- "Start Navigation" button

---

## 📌 Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/pages/JourneyAssistant.tsx` | 638 | Main UI orchestrator |
| `client/src/lib/microphoneService.ts` | 412 | Wake word + voice recording |
| `client/src/lib/elevenLabsService.ts` | ~100 | Text-to-speech |
| `server/routes.ts` | ~900 | API endpoints |
| `server/gpt.ts` | ~1300 | NLP parsing with GPT-5 |
| `server/maps.ts` | ~800 | Google Maps integration |
| `server/concierge.ts` | ~400 | Stop selection algorithm |
| `server/timeConstraintParser.ts` | ~300 | Time parsing logic |
| `server/timeUtils.ts` | ~200 | Time calculations |

---

**End of System Architecture Document**

*Generated: January 2025*
*Version: 1.0*
*For: NaviAI/Journey Hackathon Project*
