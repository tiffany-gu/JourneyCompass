# NaviAI - AI-Powered Journey Assistant

An intelligent navigation and trip planning application that combines AI-powered natural language processing with stunning 3D maps to help you plan road trips with recommended stops.

![NaviAI Screenshot](https://via.placeholder.com/800x400?text=NaviAI+Journey+Assistant)

## 🌟 Features

- **🗺️ 3D Interactive Maps** - Powered by Mapbox with 3D buildings, terrain, and atmosphere
- **🤖 AI Trip Planning** - Natural language interface powered by Google Gemini AI
- **🛣️ Smart Route Planning** - Multiple route options with distance, duration, and traffic info
- **⛽ Intelligent Stop Recommendations** - Gas stations, restaurants, and scenic viewpoints
- **🚗 Street View Mode** - Toggle between overview and street-level navigation view
- **📍 Real-time Updates** - Interactive markers and popups for all stops
- **🎨 Modern UI** - Beautiful, responsive design with Material Design 3

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- API keys for:
  - Google Maps API
  - Google Gemini AI
  - Mapbox

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/NaviAI.git
   cd NaviAI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Copy the example env file:
   ```bash
   cp .env.example .env.local
   cp .env.example client/.env.local
   ```

   Edit `.env.local` and `client/.env.local` with your API keys:
   ```env
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   AI_INTEGRATIONS_GEMINI_API_KEY=your-gemini-api-key
   VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🔑 Getting API Keys

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable these APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
4. Create credentials → API Key

### Google Gemini AI
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key

### Mapbox
1. Sign up at [Mapbox](https://account.mapbox.com/)
2. Copy your default public token from the dashboard

## 📖 Usage

### Planning a Trip

Simply type your request in natural language:

- "Plan a trip from San Francisco to Los Angeles"
- "I want to drive from New York to Boston with my family"
- "Show me a scenic route from Seattle to Portland"

### Map Controls

- **Zoom:** Scroll wheel or +/- buttons
- **Rotate:** Right-click + drag (or Ctrl + drag)
- **Tilt:** Ctrl + drag up/down
- **Street View:** Click the "Street View" button (bottom-right)

### Features

- Click on markers to see details
- View route comparison for multiple options
- See recommended stops with reasoning
- Toggle between overview and street-level views

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Mapbox GL JS** - 3D maps
- **TailwindCSS** - Styling
- **Shadcn/ui** - Component library
- **TanStack Query** - Data fetching

### Backend
- **Node.js + Express** - Server
- **Google Gemini AI** - Natural language processing
- **Google Maps APIs** - Routing and places data
- **TypeScript** - Type safety

## 📁 Project Structure

```
NaviAI/
├── client/              # Frontend React app
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
│   └── .env.local       # Client environment variables
├── server/              # Backend Express server
│   ├── gemini.ts        # AI integration
│   ├── maps.ts          # Google Maps integration
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── shared/              # Shared types and schemas
└── .env.local           # Server environment variables
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Mapbox](https://www.mapbox.com/) for amazing 3D maps
- [Google Maps Platform](https://developers.google.com/maps) for routing and places data
- [Google Gemini AI](https://ai.google.dev/) for natural language processing
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful components

## 📧 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/YOUR_USERNAME/NaviAI](https://github.com/YOUR_USERNAME/NaviAI)
