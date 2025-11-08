# Journey Assistant

## Overview

Journey Assistant is a conversational trip planning application that helps users plan road trips with intelligent stop recommendations. The application combines AI-powered natural language processing with Google Maps integration to create personalized routes with gas stations, restaurants, and scenic viewpoints based on user preferences and vehicle constraints.

The system uses a split-screen interface where users interact through a chat panel while viewing their route on an interactive map. The AI assistant extracts trip parameters from natural conversation and generates contextual recommendations for stops along the route.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite as the build tool and development server
- Wouter for client-side routing
- TanStack Query for server state management
- Shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling

**Design System:**
- Material Design 3 foundation with Linear-inspired aesthetics
- Custom design tokens defined in CSS variables
- Inter font family for typography
- Responsive layout with 40/60 split (chat/map) on desktop, stacked on mobile

**Key Frontend Components:**
- `JourneyAssistant`: Main page component managing chat state and trip data
- `ChatMessage`: Message display with user/AI differentiation
- `MessageInput`: Text and voice input interface
- `MapView`: Google Maps integration with route visualization
- `RouteComparisonCard`: Route metrics comparison display
- `StopCard`: Collapsible cards for recommended stops with reasoning

**State Management:**
- React Query manages API communication and server state
- Local component state for UI interactions
- Session-based conversation history maintained on backend

### Backend Architecture

**Technology Stack:**
- Node.js with Express server
- TypeScript with ES modules
- In-memory storage with database schema designed for PostgreSQL migration
- Google Gemini AI for natural language processing
- Google Maps APIs for routing and places data

**API Structure:**
- RESTful endpoints under `/api` prefix
- Single `/api/chat` endpoint handles conversational interactions
- Request/response logging middleware
- JSON body parsing with raw body preservation

**Core Services:**

1. **Gemini AI Integration** (`server/gemini.ts`):
   - Uses Replit AI Integrations service for Gemini access
   - `parseUserRequest()`: Extracts structured trip parameters from natural language
   - `generateConversationalResponse()`: Creates contextual AI responses
   - `generateStopReason()`: Explains why specific stops were recommended
   - Maintains conversation history for context-aware interactions

2. **Maps Integration** (`server/maps.ts`):
   - `getDirections()`: Fetches route alternatives from Google Directions API
   - `findPlacesAlongRoute()`: Searches for gas stations, restaurants, and attractions
   - `calculateGasStops()`: Determines optimal refueling locations based on vehicle range and fuel level
   - Handles preference filtering (scenic routes, toll avoidance, restaurant criteria)

3. **Storage Layer** (`server/storage.ts`):
   - Interface-based design (`IStorage`) for easy database swapping
   - `MemStorage` implementation uses in-memory Maps
   - Tracks trip requests with origin, destination, preferences, and calculated routes
   - Stores conversation messages linked to trip requests
   - Ready for PostgreSQL migration with Drizzle ORM

### Data Storage

**Database Schema** (`shared/schema.ts`):
- Designed for PostgreSQL using Drizzle ORM
- `trip_requests` table: Stores trip parameters, preferences (as JSONB), and calculated routes
- `conversation_messages` table: Tracks chat history with role (user/AI) and timestamps
- Foreign key relationship linking messages to trip requests
- Zod schemas for validation of insert operations

**Current Implementation:**
- Development uses in-memory storage (`MemStorage` class)
- Production-ready schema with UUID primary keys
- JSONB columns for flexible preference storage and route data

### Authentication and Authorization

No authentication currently implemented. The application is designed as a single-user experience without login requirements.

### External Service Integrations

**Google Gemini AI:**
- Accessed through Replit AI Integrations service
- Environment variables: `AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`
- Used for natural language understanding and conversational responses
- Structured output generation for trip parameters

**Google Maps Platform:**
- Directions API for route calculation with alternatives
- Places API for finding stops along routes
- Environment variable: `GOOGLE_MAPS_API_KEY` (server-side)
- Client-side Maps JavaScript API for visualization
- Frontend uses: `VITE_GOOGLE_MAPS_API_KEY` (in .env.local)
- **Security Note**: The Google Maps JavaScript API key is exposed to the client browser by design. Protect it by configuring HTTP referrer restrictions in Google Cloud Console to only allow requests from your Replit domain.

**Replit-Specific Integrations:**
- Vite plugins for development: runtime error overlay, cartographer, dev banner
- AI Integrations service provides managed Gemini API access

## External Dependencies

### Third-Party Services

1. **Google Gemini AI** (via Replit AI Integrations)
   - Natural language processing
   - Conversational AI responses
   - Parameter extraction from user messages

2. **Google Maps Platform**
   - Directions API: Route calculation
   - Places API: POI search along routes
   - Maps JavaScript API: Interactive map visualization

3. **Replit Services**
   - AI Integrations: Managed Gemini API access
   - Development tooling: Error overlays, cartographer

### Key NPM Packages

- **Frontend:**
  - `@tanstack/react-query`: Server state management
  - `wouter`: Lightweight routing
  - `@radix-ui/*`: Headless UI primitives (20+ components)
  - `tailwindcss`: Utility-first CSS
  - `class-variance-authority`: Component variant management
  - `date-fns`: Date formatting

- **Backend:**
  - `express`: Web server framework
  - `@google/genai`: Gemini AI SDK
  - `node-fetch`: HTTP client for API calls
  - `drizzle-orm`: Type-safe ORM for PostgreSQL
  - `@neondatabase/serverless`: PostgreSQL driver

- **Development:**
  - `vite`: Build tool and dev server
  - `typescript`: Type safety
  - `tsx`: TypeScript execution
  - `esbuild`: Backend bundling

### Database

PostgreSQL (via Neon serverless) configured but currently using in-memory storage. Schema ready with Drizzle ORM for migration using `npm run db:push`.