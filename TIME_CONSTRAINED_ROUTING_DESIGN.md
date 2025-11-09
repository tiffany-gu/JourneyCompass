# Time-Constrained Multi-Stop Routing System Design

## Overview

Building a sophisticated routing system that handles time constraints, task completion, and optimal stop sequencing. This is similar to what delivery services (DoorDash, Uber Eats) and logistics companies use, but tailored for personal errands.

## Example Use Cases

1. **"Hey Journey, Plan a route that helps me pick up the kids and pick up groceries for the house in 2 hrs"**
   - Current time: 3:00 PM
   - Deadline: 5:00 PM (2 hours)
   - Tasks: [Pick up kids, Get groceries]
   - System needs to: Find school location, find grocery store, optimize route, allocate time

2. **"I need to arrive at home by 5pm. Can you route me to the supermarket and a chinese restaurant along the way and plan out how many minutes I need to spend at each stop in order to arrive on time"**
   - Destination: Home
   - Deadline: 5:00 PM
   - Stops: [Supermarket, Chinese restaurant]
   - System needs to: Calculate ETA for each stop, allocate dwell time, ensure on-time arrival

3. **"Plan a route to drop off packages at the post office, get coffee, and be at the gym by 6:30pm"**
   - Intermediate stops: [Post office, Coffee shop]
   - Final destination: Gym
   - Hard deadline: 6:30 PM

## Core Components

### 1. Time Constraint Parser (NLP)

Extract structured data from natural language:

```typescript
interface TimeConstraint {
  type: 'duration' | 'deadline' | 'time_window';
  value: Date | number; // Date for deadline, number (minutes) for duration
  flexibility: 'hard' | 'soft'; // Hard = must meet, Soft = try to meet
}

interface Task {
  description: string; // "pick up kids", "get groceries"
  location?: string; // Explicit location if provided
  category?: string; // Inferred: 'school', 'grocery', 'restaurant', etc.
  estimatedDuration?: number; // Minutes needed at location
  priority: 'high' | 'medium' | 'low';
}

interface TimeConstrainedRequest {
  tasks: Task[];
  timeConstraint: TimeConstraint;
  origin?: string;
  destination?: string;
  currentLocation?: { lat: number; lng: number };
}
```

**Parsing Examples:**

```typescript
// Input: "pick up the kids and pick up groceries for the house in 2 hrs"
{
  tasks: [
    { description: "pick up the kids", category: "school", priority: "high" },
    { description: "pick up groceries", category: "grocery", priority: "medium" }
  ],
  timeConstraint: { type: "duration", value: 120, flexibility: "hard" },
  destination: "home" // implied
}

// Input: "arrive at home by 5pm, stop at supermarket and chinese restaurant"
{
  tasks: [
    { description: "supermarket", category: "grocery" },
    { description: "chinese restaurant", category: "restaurant" }
  ],
  timeConstraint: { type: "deadline", value: new Date("5:00 PM"), flexibility: "hard" },
  destination: "home"
}
```

### 2. Location Resolution

For each task, find the optimal location:

```typescript
interface LocationCandidate {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  rating?: number;
  categories: string[];
  detourTime: number; // Extra minutes vs direct route
  relevanceScore: number; // How well it matches the task
}

// Algorithm:
// 1. Query Google Places API for task category
// 2. Filter by distance from direct route (e.g., max 5 min detour)
// 3. Rank by: (relevance * rating) / detourTime
// 4. Select top candidate
```

### 3. Time Budget Calculation

Calculate available time and allocate to each stop:

```typescript
interface TimeBudget {
  totalAvailable: number; // Total minutes available
  drivingTime: number; // Total driving time
  bufferTime: number; // Safety buffer (10% of total)
  dwellTime: number; // Time available for stops
  stopAllocations: Map<string, number>; // placeId -> minutes
}

function calculateTimeBudget(
  route: google.maps.DirectionsRoute,
  timeConstraint: TimeConstraint,
  tasks: Task[]
): TimeBudget {
  const now = new Date();

  // Calculate total available time
  let totalAvailable: number;
  if (timeConstraint.type === 'deadline') {
    totalAvailable = (timeConstraint.value.getTime() - now.getTime()) / 60000; // minutes
  } else {
    totalAvailable = timeConstraint.value; // already in minutes
  }

  // Get driving time from route
  const drivingTime = route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) / 60; // minutes

  // Reserve 10% as buffer for traffic, parking, etc.
  const bufferTime = totalAvailable * 0.10;

  // Remaining time for dwelling at stops
  const dwellTime = totalAvailable - drivingTime - bufferTime;

  // Allocate dwell time based on task priorities and typical durations
  const stopAllocations = allocateDwellTime(tasks, dwellTime);

  return { totalAvailable, drivingTime, bufferTime, dwellTime, stopAllocations };
}
```

### 4. Dwell Time Allocation Algorithm

Smart allocation based on task type and priority:

```typescript
// Typical dwell times by category (in minutes)
const TYPICAL_DWELL_TIMES = {
  school: 5,           // Quick pickup
  daycare: 5,
  grocery: 20,         // Full shopping
  'quick_shop': 10,    // Grab a few items
  restaurant: 15,      // Order pickup
  'sit_down': 45,      // Dine in
  coffee: 10,
  post_office: 10,
  pharmacy: 10,
  bank: 15,
  gas: 5,
  default: 10
};

function allocateDwellTime(
  tasks: Task[],
  totalDwellTime: number
): Map<string, number> {
  const allocations = new Map<string, number>();

  // Step 1: Assign typical times
  let totalTypical = 0;
  tasks.forEach(task => {
    const typical = TYPICAL_DWELL_TIMES[task.category || 'default'];
    allocations.set(task.description, typical);
    totalTypical += typical;
  });

  // Step 2: Check if we need to compress or can expand
  const ratio = totalDwellTime / totalTypical;

  if (ratio < 0.7) {
    // Not enough time! Need to warn user or reduce stops
    console.warn('Time constraint too tight. Need', totalTypical, 'minutes but only have', totalDwellTime);
  }

  // Step 3: Scale proportionally, respecting minimums
  const MIN_DWELL = 5; // Minimum 5 minutes per stop
  tasks.forEach(task => {
    const typical = allocations.get(task.description)!;
    const scaled = Math.max(MIN_DWELL, Math.floor(typical * ratio));
    allocations.set(task.description, scaled);
  });

  return allocations;
}
```

### 5. Route Optimization with Time Windows

Use Google's waypoint optimization with time constraints:

```typescript
interface OptimizedRoute {
  route: google.maps.DirectionsRoute;
  timeline: Timeline;
  feasibility: 'feasible' | 'tight' | 'impossible';
  warnings: string[];
}

interface Timeline {
  steps: TimelineStep[];
  totalDuration: number;
  arrivalTime: Date;
}

interface TimelineStep {
  type: 'drive' | 'stop';
  location?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  description: string;
}

async function optimizeRouteWithTimeConstraints(
  request: TimeConstrainedRequest
): Promise<OptimizedRoute> {
  // 1. Resolve all task locations
  const locations = await Promise.all(
    request.tasks.map(task => resolveLocation(task, request.currentLocation))
  );

  // 2. Build waypoints for Google Directions API
  const waypoints = locations.map(loc => ({
    location: new google.maps.LatLng(loc.location.lat, loc.location.lng),
    stopover: true
  }));

  // 3. Request optimized route
  const directionsRequest = {
    origin: request.currentLocation,
    destination: request.destination || request.currentLocation,
    waypoints,
    optimizeWaypoints: true, // Let Google optimize the order
    travelMode: google.maps.TravelMode.DRIVING,
    drivingOptions: {
      departureTime: new Date(), // Use current traffic
      trafficModel: google.maps.TrafficModel.BEST_GUESS
    }
  };

  const route = await getDirections(directionsRequest);

  // 4. Calculate time budget
  const timeBudget = calculateTimeBudget(route, request.timeConstraint, request.tasks);

  // 5. Build timeline
  const timeline = buildTimeline(route, timeBudget, request.tasks);

  // 6. Check feasibility
  const feasibility = checkFeasibility(timeline, request.timeConstraint);

  return { route, timeline, feasibility, warnings: [] };
}
```

### 6. Timeline Builder

Create step-by-step timeline with ETAs:

```typescript
function buildTimeline(
  route: google.maps.DirectionsRoute,
  timeBudget: TimeBudget,
  tasks: Task[]
): Timeline {
  const steps: TimelineStep[] = [];
  let currentTime = new Date();

  route.legs.forEach((leg, index) => {
    // Driving segment
    const driveStart = new Date(currentTime);
    const driveDuration = (leg.duration?.value || 0) / 60; // minutes
    currentTime = new Date(currentTime.getTime() + driveDuration * 60000);

    steps.push({
      type: 'drive',
      startTime: driveStart,
      endTime: new Date(currentTime),
      duration: driveDuration,
      description: `Drive to ${leg.end_address}`
    });

    // Stop segment (if not final destination)
    if (index < route.legs.length - 1 || route.legs.length === 1) {
      const task = tasks[index];
      const dwellDuration = timeBudget.stopAllocations.get(task.description) || 10;
      const stopStart = new Date(currentTime);
      currentTime = new Date(currentTime.getTime() + dwellDuration * 60000);

      steps.push({
        type: 'stop',
        location: leg.end_address,
        startTime: stopStart,
        endTime: new Date(currentTime),
        duration: dwellDuration,
        description: task.description
      });
    }
  });

  const totalDuration = (currentTime.getTime() - steps[0].startTime.getTime()) / 60000;

  return {
    steps,
    totalDuration,
    arrivalTime: currentTime
  };
}
```

## Backend API Design

### New Endpoint: `/api/plan-time-constrained-route`

```typescript
// POST /api/plan-time-constrained-route
{
  message: string; // Natural language input
  currentLocation?: { lat: number; lng: number };
}

// Response
{
  route: google.maps.DirectionsRoute;
  timeline: Timeline;
  feasibility: 'feasible' | 'tight' | 'impossible';
  warnings: string[];
  suggestions?: string[]; // Alternative suggestions if impossible
  metadata: {
    totalTime: number;
    drivingTime: number;
    dwellTime: number;
    bufferTime: number;
  }
}
```

### Algorithm Flow

```
1. Parse natural language request
   ↓
2. Extract: tasks, time constraint, origin, destination
   ↓
3. For each task:
   - Determine category (grocery, school, restaurant, etc.)
   - Search Google Places API
   - Rank by relevance + rating - detour
   ↓
4. Build waypoints list
   ↓
5. Request optimized route from Google Directions API
   ↓
6. Calculate time budget:
   - Total available = deadline - now OR duration
   - Driving time = sum of leg durations
   - Buffer = 10% of total
   - Dwell time = total - driving - buffer
   ↓
7. Allocate dwell time per stop
   ↓
8. Build timeline with ETAs
   ↓
9. Check feasibility:
   - If arrival > deadline: IMPOSSIBLE
   - If buffer < 5%: TIGHT
   - Else: FEASIBLE
   ↓
10. Return structured response
```

## Frontend UI Enhancements

### Timeline Display Component

```tsx
interface TimelineDisplayProps {
  timeline: Timeline;
  feasibility: 'feasible' | 'tight' | 'impossible';
}

function TimelineDisplay({ timeline, feasibility }: TimelineDisplayProps) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${
        feasibility === 'feasible' ? 'bg-green-50 border-green-200' :
        feasibility === 'tight' ? 'bg-yellow-50 border-yellow-200' :
        'bg-red-50 border-red-200'
      }`}>
        <h3 className="font-semibold">
          {feasibility === 'feasible' && '✅ Plan is feasible'}
          {feasibility === 'tight' && '⚠️ Tight schedule - minimal buffer'}
          {feasibility === 'impossible' && '❌ Not enough time'}
        </h3>
        <p>Arrival time: {timeline.arrivalTime.toLocaleTimeString()}</p>
      </div>

      <div className="space-y-2">
        {timeline.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
            {step.type === 'drive' ? (
              <>
                <Car className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">{step.description}</p>
                  <p className="text-sm text-gray-600">
                    {step.startTime.toLocaleTimeString()} - {step.endTime.toLocaleTimeString()}
                    ({step.duration} min)
                  </p>
                </div>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium">{step.description}</p>
                  <p className="text-sm text-gray-600">
                    Spend {step.duration} minutes here
                  </p>
                  <p className="text-xs text-gray-500">
                    {step.startTime.toLocaleTimeString()} - {step.endTime.toLocaleTimeString()}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Map Visualization

Show timeline markers with ETAs:

```typescript
// Each marker shows:
// - Location name
// - Arrival time
// - Dwell duration
// - Task description

const marker = new google.maps.Marker({
  position: location,
  label: {
    text: step.startTime.toLocaleTimeString(),
    className: 'timeline-marker-label'
  },
  icon: {
    url: getIconForTask(task),
    scaledSize: new google.maps.Size(32, 32)
  }
});
```

## Implementation Plan

### Phase 1: Backend - Time Constraint Parsing (2-3 hours)

1. Create `server/timeConstrainedRouting.ts`
2. Implement NLP parser for time expressions:
   - "in 2 hours" → duration: 120 minutes
   - "by 5pm" → deadline: Date object
   - "before 6:30pm" → deadline with buffer
3. Implement task extractor:
   - "pick up kids" → { category: 'school', priority: 'high' }
   - "get groceries" → { category: 'grocery', priority: 'medium' }
   - "chinese restaurant" → { category: 'restaurant', subcategory: 'chinese' }

### Phase 2: Backend - Location Resolution (2-3 hours)

1. Build Google Places API integration
2. Implement smart location search:
   - Search radius based on detour tolerance
   - Rank by relevance and rating
   - Filter by open hours
3. Cache common locations (schools near user, favorite grocery stores)

### Phase 3: Backend - Time Budget Algorithm (2-3 hours)

1. Implement time budget calculator
2. Build dwell time allocator
3. Add feasibility checker
4. Create warning system

### Phase 4: Backend - Route Optimization (2-3 hours)

1. Integrate with existing Google Directions API
2. Add waypoint optimization
3. Build timeline generator
4. Add real-time traffic consideration

### Phase 5: Backend - API Endpoint (1-2 hours)

1. Create `/api/plan-time-constrained-route`
2. Wire up all components
3. Add error handling
4. Add logging

### Phase 6: Frontend - Timeline UI (2-3 hours)

1. Create Timeline component
2. Add feasibility indicators
3. Build step-by-step display
4. Add time adjustment controls

### Phase 7: Frontend - Integration (2-3 hours)

1. Update chat mutation to detect time constraints
2. Display timeline in sidebar
3. Show markers with ETAs on map
4. Add voice command support

### Phase 8: Testing & Refinement (2-3 hours)

1. Test various scenarios
2. Tune time allocations
3. Improve NLP parsing
4. Handle edge cases

**Total Estimated Time: 16-24 hours**

## Advanced Features (Future)

1. **Learning User Preferences**
   - Track actual time spent at locations
   - Adjust allocations based on history
   - Remember favorite stores/restaurants

2. **Dynamic Rerouting**
   - Monitor actual progress vs timeline
   - Adjust remaining stops if running late
   - Suggest skipping lower-priority stops

3. **Multi-Day Planning**
   - "Plan my week's errands"
   - Batch similar tasks
   - Optimize across multiple days

4. **Cost Optimization**
   - Minimize gas costs
   - Avoid tolls if time permits
   - Batch stops in same area

5. **Collaborative Planning**
   - Share timeline with family
   - Assign tasks to different people
   - Coordinate pickup times

## Testing Scenarios

1. **Feasible Route**
   - Input: "Pick up kids and groceries in 2 hours"
   - School: 10 min away, 5 min pickup
   - Grocery: 15 min away, 20 min shopping
   - Home: 10 min away
   - Total: 60 min → FEASIBLE (50% buffer)

2. **Tight Route**
   - Input: "Arrive home by 5pm, stop at supermarket and restaurant"
   - Current time: 4:15 PM (45 min available)
   - Supermarket: 10 min drive, 10 min shop
   - Restaurant: 8 min drive, 10 min pickup
   - Home: 7 min drive
   - Total: 45 min → TIGHT (0% buffer)

3. **Impossible Route**
   - Input: "Get groceries and go to gym in 30 minutes"
   - Grocery: 15 min drive, 20 min minimum
   - Gym: 10 min drive
   - Total needed: 45 min, Available: 30 min → IMPOSSIBLE

## Key Success Metrics

1. **Accuracy**: 90%+ routes arrive on time
2. **User Satisfaction**: Allocated times feel reasonable
3. **Performance**: Response time < 3 seconds
4. **Adoption**: Users actively use time constraints in 30%+ of routes

---

This is a production-ready design that matches what you'd find in enterprise logistics systems. Ready to implement?
