# Testing Guide for Time Constraint Parser

## Overview

The time constraint parser (`timeConstraintParser.ts`) extracts time constraints and tasks from natural language. Here's how to test it:

---

## Method 1: Run Unit Tests (Recommended)

The fastest and most comprehensive way to test:

```bash
npm test -- __tests__/timeConstraintParser.test.ts
```

**Result**: All 29 tests should pass (100% coverage)

### What the tests cover:
- **Time constraint parsing**: "in 2 hours", "by 5pm", "before 6pm", "arrive at home by 5:30pm"
- **Task extraction**: "pick up kids", "get groceries", "stop at restaurant", "gas station", "pharmacy"
- **Location extraction**: "arrive at home", "from office to home"
- **Real-world examples**: Complex multi-task requests with time constraints

---

## Method 2: Interactive Test Script

Run the interactive test with example phrases:

```bash
npx tsx test-time-parser.ts
```

This will show you:
- ⏰ Time constraints detected (type, value, formatted display)
- 📍 Locations extracted (origin, destination)
- ✅ Tasks extracted (description, category, priority, duration)

### Example output:
```
📝 Test 1: "pick up the kids and get groceries in 2 hrs"

⏰ Time Constraint:
   Type: duration
   Value: 120 minutes
   Display: 2 hours
   Flexibility: hard

✅ Tasks Extracted: 2
   1. Pick up kids
      Category: school
      Priority: high
      Duration: 5 min
   2. Get groceries
      Category: grocery
      Priority: medium
      Duration: 20 min
```

---

## Method 3: Node REPL (Quick Tests)

For quick one-off tests:

```bash
# Start Node REPL
node

# Load the parser
const { parseTimeConstrainedRequest } = require('./timeConstraintParser');

# Test any message
parseTimeConstrainedRequest("pick up kids and groceries in 2 hours");

# See the full result
console.log(JSON.stringify(result, null, 2));
```

### Example:
```javascript
> const { parseTimeConstrainedRequest } = require('./timeConstraintParser');
> const result = parseTimeConstrainedRequest("arrive home by 5pm");
> console.log(result.timeConstraint);
{
  type: 'arrival_time',
  value: 2025-11-09T22:00:00.000Z,
  originalText: 'arrive at home by 5pm',
  flexibility: 'hard'
}
```

---

## Method 4: API Endpoint (Once Server is Running)

When your server is running, you can test via HTTP:

```bash
curl -X POST http://localhost:3000/api/test-time-parser \
  -H "Content-Type: application/json" \
  -d '{"message": "pick up kids and groceries in 2 hours"}' | jq '.'
```

### Example response:
```json
{
  "success": true,
  "result": {
    "originalMessage": "pick up kids and groceries in 2 hours",
    "tasks": [
      {
        "description": "Pick up kids",
        "category": "school",
        "priority": "high",
        "estimatedDuration": 5
      },
      {
        "description": "Get groceries",
        "category": "grocery",
        "priority": "medium",
        "estimatedDuration": 20
      }
    ],
    "timeConstraint": {
      "type": "duration",
      "value": 120,
      "originalText": "in 2 hours",
      "flexibility": "hard",
      "formatted": "2 hours"
    },
    "hasTimeConstraint": true
  }
}
```

---

## Method 5: Voice Assistant Integration (Real-world Test)

Once your voice assistant is working, say:

- "Hey Journey, plan a route that helps me pick up the kids and get groceries in 2 hours"
- "Hey Journey, I need to arrive home by 5pm. Route me to the supermarket and a Chinese restaurant"

The parser will automatically extract:
- Time constraint (duration or deadline)
- Tasks (kids, groceries, restaurant)
- Destination (home)

---

## Example Test Cases

### Duration Constraints:
- ✅ "in 2 hours" → 120 minutes
- ✅ "in 45 minutes" → 45 minutes
- ✅ "in 1.5 hours" → 90 minutes

### Deadline Constraints:
- ✅ "by 5pm" → 17:00
- ✅ "by 5:30pm" → 17:30
- ✅ "before 6pm" → 18:00

### Arrival Time:
- ✅ "arrive at home by 5pm" → arrival_time constraint to home at 17:00
- ✅ "get to the gym by 5:30pm" → arrival_time constraint to gym at 17:30

### Tasks:
- ✅ "pick up kids" → school task (high priority, 5 min)
- ✅ "get groceries" → grocery task (medium priority, 20 min)
- ✅ "stop at pharmacy" → pharmacy task (high priority, 10 min)
- ✅ "gas station" → gas task (medium priority, 5 min)
- ✅ "chinese restaurant" → restaurant task (medium priority, 15 min)

---

## Troubleshooting

### Tests failing?
```bash
# Make sure you're in the server directory
cd /Users/raj/Desktop/NaviAI-main-1/server

# Run tests with verbose output
npm test -- __tests__/timeConstraintParser.test.ts --reporter=verbose
```

### Want to add new test cases?
Edit `__tests__/timeConstraintParser.test.ts` and add:

```typescript
it('should parse your new test case', () => {
  const result = parseTimeConstraint('your message here');
  expect(result).toEqual({
    type: 'duration',
    value: 120,
    // ...
  });
});
```

Then run tests again to verify!

---

## Summary

**Best for development**: Method 1 (Unit Tests)
**Best for quick checks**: Method 2 (Interactive Script)
**Best for API testing**: Method 4 (curl)
**Best for real-world testing**: Method 5 (Voice Assistant)
