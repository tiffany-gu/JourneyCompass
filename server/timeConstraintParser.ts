/**
 * Time Constraint Parser
 * Extracts time constraints and tasks from natural language input
 */

export interface TimeConstraint {
  type: 'duration' | 'deadline' | 'arrival_time';
  value: Date | number; // Date for deadline/arrival, number (minutes) for duration
  originalText: string;
  flexibility: 'hard' | 'soft';
}

export interface Task {
  description: string;
  location?: string; // Explicit location if provided
  category?: string; // 'school', 'grocery', 'restaurant', 'gas', etc.
  estimatedDuration?: number; // Minutes needed at location
  priority: 'high' | 'medium' | 'low';
  keywords: string[]; // Keywords that matched
}

export interface ParsedTimeConstrainedRequest {
  originalMessage: string;
  tasks: Task[];
  timeConstraint: TimeConstraint | null;
  origin?: string;
  destination?: string;
  hasTimeConstraint: boolean;
}

/**
 * Parse time expressions like "in 2 hours", "by 5pm", "before 6:30"
 */
export function parseTimeConstraint(message: string): TimeConstraint | null {
  const lowerMessage = message.toLowerCase();

  // Pattern 1: "in X hours/minutes"
  const durationPattern = /in\s+(\d+)\s*(hours?|hrs?|minutes?|mins?)/i;
  const durationMatch = message.match(durationPattern);

  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    const minutes = unit.startsWith('hour') || unit.startsWith('hr')
      ? value * 60
      : value;

    return {
      type: 'duration',
      value: minutes,
      originalText: durationMatch[0],
      flexibility: 'hard'
    };
  }

  // Pattern 2: "arrive at home by X" or "be at X by Y" (check this FIRST before general "by" pattern)
  const arrivalPattern = /(arrive\s+at|be\s+at|get\s+to)\s+(.+?)\s+by\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const arrivalMatch = message.match(arrivalPattern);

  if (arrivalMatch) {
    const destination = arrivalMatch[2].trim();
    let hours = parseInt(arrivalMatch[3]);
    const minutes = arrivalMatch[4] ? parseInt(arrivalMatch[4]) : 0;
    const meridiem = arrivalMatch[5]?.toLowerCase();

    // Convert to 24-hour format
    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    const arrivalTime = new Date();
    arrivalTime.setHours(hours, minutes, 0, 0);

    if (arrivalTime.getTime() < Date.now()) {
      arrivalTime.setDate(arrivalTime.getDate() + 1);
    }

    return {
      type: 'arrival_time',
      value: arrivalTime,
      originalText: arrivalMatch[0],
      flexibility: 'hard'
    };
  }

  // Pattern 3: "by 5pm", "by 5:30pm", "by 17:00" (general deadline without location)
  const deadlinePattern = /(?:by|before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const deadlineMatch = message.match(deadlinePattern);

  if (deadlineMatch) {
    let hours = parseInt(deadlineMatch[1]);
    const minutes = deadlineMatch[2] ? parseInt(deadlineMatch[2]) : 0;
    const meridiem = deadlineMatch[3]?.toLowerCase();

    // Convert to 24-hour format
    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    } else if (!meridiem && hours < 12) {
      // If no meridiem and hour < 12, assume PM if it's a reasonable time
      const now = new Date();
      if (now.getHours() >= hours) {
        hours += 12;
      }
    }

    const deadline = new Date();
    deadline.setHours(hours, minutes, 0, 0);

    if (deadline.getTime() < Date.now()) {
      deadline.setDate(deadline.getDate() + 1);
    }

    return {
      type: 'deadline',
      value: deadline,
      originalText: deadlineMatch[0],
      flexibility: 'hard'
    };
  }

  return null;
}

/**
 * Extract tasks from the message
 */
export function extractTasks(message: string): Task[] {
  const tasks: Task[] = [];
  const lowerMessage = message.toLowerCase();

  // Task patterns with categories and priorities
  const taskPatterns = [
    // High priority - Kids/Family
    {
      pattern: /pick\s+up\s+(the\s+)?(kids|children|child|son|daughter)/i,
      category: 'school',
      priority: 'high' as const,
      estimatedDuration: 5,
      description: 'Pick up kids'
    },
    {
      pattern: /drop\s+off\s+(the\s+)?(kids|children|child|son|daughter)/i,
      category: 'school',
      priority: 'high' as const,
      estimatedDuration: 5,
      description: 'Drop off kids'
    },

    // Medium priority - Shopping
    {
      pattern: /(get|pick\s+up|buy|grab)\s+(some\s+)?(groceries|food|supplies)/i,
      category: 'grocery',
      priority: 'medium' as const,
      estimatedDuration: 20,
      description: 'Get groceries'
    },
    {
      pattern: /(go\s+to|stop\s+at|visit|route\s+(?:me\s+)?to)\s+(the\s+)?(supermarket|grocery\s+store|market)/i,
      category: 'grocery',
      priority: 'medium' as const,
      estimatedDuration: 20,
      description: 'Supermarket'
    },

    // Restaurant/Food (check specific cuisines first!)
    {
      pattern: /\b(chinese\s+restaurant|chinese\s+food|chinese)\b/i,
      category: 'restaurant',
      priority: 'medium' as const,
      estimatedDuration: 15,
      description: 'Chinese restaurant'
    },
    {
      pattern: /\b(restaurant|food|dinner|lunch)\b/i,
      category: 'restaurant',
      priority: 'medium' as const,
      estimatedDuration: 15,
      description: 'Restaurant'
    },
    {
      pattern: /(get|grab|pick\s+up)\s+(some\s+)?(coffee)/i,
      category: 'coffee',
      priority: 'low' as const,
      estimatedDuration: 10,
      description: 'Get coffee'
    },

    // Services
    {
      pattern: /(post\s+office|mail\s+package|send\s+package)/i,
      category: 'post_office',
      priority: 'medium' as const,
      estimatedDuration: 10,
      description: 'Post office'
    },
    {
      pattern: /(pharmacy|pick\s+up\s+medicine|prescription)/i,
      category: 'pharmacy',
      priority: 'high' as const,
      estimatedDuration: 10,
      description: 'Pharmacy'
    },
    {
      pattern: /(gas\s+station|get\s+gas|fill\s+up)/i,
      category: 'gas',
      priority: 'medium' as const,
      estimatedDuration: 5,
      description: 'Gas station'
    },
    {
      pattern: /(bank|atm|withdraw\s+money)/i,
      category: 'bank',
      priority: 'medium' as const,
      estimatedDuration: 15,
      description: 'Bank'
    },

    // Activities
    {
      pattern: /(gym|workout|exercise)/i,
      category: 'gym',
      priority: 'medium' as const,
      estimatedDuration: 60,
      description: 'Gym'
    }
  ];

  // Extract each matching task
  // Use a set to track matched text to avoid duplicates
  const matchedTexts = new Set<string>();

  for (const pattern of taskPatterns) {
    const matches = message.match(new RegExp(pattern.pattern, 'gi'));
    if (matches) {
      for (const match of matches) {
        const matchLower = match.toLowerCase();
        // Skip if we've already matched this exact text
        if (matchedTexts.has(matchLower)) continue;

        matchedTexts.add(matchLower);
        tasks.push({
          description: pattern.description,
          category: pattern.category,
          estimatedDuration: pattern.estimatedDuration,
          priority: pattern.priority,
          keywords: [match]
        });
      }
    }
  }

  // If no specific tasks found but message contains "stop at" or "go to"
  const genericStopPattern = /(stop\s+at|go\s+to|visit)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\s+and|\s+by|\s+in|$)/gi;
  let genericMatch;

  while ((genericMatch = genericStopPattern.exec(message)) !== null) {
    const location = genericMatch[2].trim();
    // Don't add if we already found this as a specific task
    const alreadyExists = tasks.some(t =>
      t.description.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(t.description.toLowerCase())
    );

    if (!alreadyExists) {
      tasks.push({
        description: location,
        location: location,
        category: 'generic',
        priority: 'medium',
        estimatedDuration: 10,
        keywords: [genericMatch[0]]
      });
    }
  }

  return tasks;
}

/**
 * Extract origin and destination from message
 */
export function extractLocations(message: string): { origin?: string; destination?: string } {
  const lowerMessage = message.toLowerCase();

  // Destination patterns
  let destination: string | undefined;

  // "arrive at home", "get home", "back home"
  if (/arrive\s+at\s+home|get\s+home|back\s+home|go\s+home/i.test(message)) {
    destination = 'home';
  }

  // "arrive at [place]"
  const arrivePattern = /arrive\s+at\s+((?:the\s+)?[a-zA-Z\s]+?)(?:\s+by|\s+in|$)/i;
  const arriveMatch = message.match(arrivePattern);
  if (arriveMatch && !destination) {
    destination = arriveMatch[1].trim();
  }

  // Origin - typically use current location unless specified
  let origin: string | undefined;
  const fromPattern = /from\s+(?:my\s+)?([a-zA-Z\s]+?)(?:\s+to|\s+and|,|$)/i;
  const fromMatch = message.match(fromPattern);
  if (fromMatch) {
    origin = fromMatch[1].trim();
  }

  return { origin, destination };
}

/**
 * Main parser function
 */
export function parseTimeConstrainedRequest(message: string): ParsedTimeConstrainedRequest {
  const timeConstraint = parseTimeConstraint(message);
  const tasks = extractTasks(message);
  const { origin, destination } = extractLocations(message);

  return {
    originalMessage: message,
    tasks,
    timeConstraint,
    origin,
    destination,
    hasTimeConstraint: timeConstraint !== null
  };
}

/**
 * Helper to format time constraint for display
 */
export function formatTimeConstraint(constraint: TimeConstraint): string {
  if (constraint.type === 'duration') {
    const hours = Math.floor(constraint.value as number / 60);
    const minutes = (constraint.value as number) % 60;
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  } else {
    const date = constraint.value as Date;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
