import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseTimeConstraint,
  extractTasks,
  extractLocations,
  parseTimeConstrainedRequest,
  formatTimeConstraint,
  type TimeConstraint
} from '../timeConstraintParser';

describe('Time Constraint Parser', () => {
  beforeEach(() => {
    // Mock current time to 3:00 PM for consistent testing
    vi.setSystemTime(new Date('2024-01-15T15:00:00'));
  });

  describe('parseTimeConstraint', () => {
    it('should parse "in X hours" duration', () => {
      const result = parseTimeConstraint('pick up kids in 2 hours');
      expect(result).toEqual({
        type: 'duration',
        value: 120,
        originalText: 'in 2 hours',
        flexibility: 'hard'
      });
    });

    it('should parse "in X minutes" duration', () => {
      const result = parseTimeConstraint('get there in 45 minutes');
      expect(result).toEqual({
        type: 'duration',
        value: 45,
        originalText: 'in 45 minutes',
        flexibility: 'hard'
      });
    });

    it('should parse "by 5pm" deadline', () => {
      const result = parseTimeConstraint('arrive by 5pm');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('deadline');
      expect(result!.value).toBeInstanceOf(Date);
      const date = result!.value as Date;
      expect(date.getHours()).toBe(17);
      expect(date.getMinutes()).toBe(0);
    });

    it('should parse "by 5:30pm" deadline with minutes', () => {
      const result = parseTimeConstraint('be there by 5:30pm');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('deadline');
      const date = result!.value as Date;
      expect(date.getHours()).toBe(17);
      expect(date.getMinutes()).toBe(30);
    });

    it('should parse "before 6pm" deadline', () => {
      const result = parseTimeConstraint('need to arrive before 6pm');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('deadline');
      const date = result!.value as Date;
      expect(date.getHours()).toBe(18);
    });

    it('should parse "arrive at home by 5pm" with arrival time', () => {
      const result = parseTimeConstraint('arrive at home by 5pm');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('arrival_time');
      const date = result!.value as Date;
      expect(date.getHours()).toBe(17);
    });

    it('should return null for messages without time constraints', () => {
      const result = parseTimeConstraint('pick up groceries');
      expect(result).toBeNull();
    });

    it('should handle 24-hour format', () => {
      const result = parseTimeConstraint('arrive by 17:30');
      expect(result).not.toBeNull();
      const date = result!.value as Date;
      expect(date.getHours()).toBe(17);
      expect(date.getMinutes()).toBe(30);
    });
  });

  describe('extractTasks', () => {
    it('should extract "pick up kids" as high priority school task', () => {
      const tasks = extractTasks('pick up the kids');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        description: 'Pick up kids',
        category: 'school',
        priority: 'high',
        estimatedDuration: 5
      });
    });

    it('should extract grocery shopping task', () => {
      const tasks = extractTasks('get groceries');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        description: 'Get groceries',
        category: 'grocery',
        priority: 'medium',
        estimatedDuration: 20
      });
    });

    it('should extract multiple tasks', () => {
      const tasks = extractTasks('pick up kids and get groceries');
      expect(tasks).toHaveLength(2);
      expect(tasks[0].category).toBe('school');
      expect(tasks[1].category).toBe('grocery');
    });

    it('should extract restaurant tasks', () => {
      const tasks = extractTasks('stop at chinese restaurant');
      // May match both "chinese restaurant" and "restaurant" - that's OK
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      const restaurantTask = tasks.find(t => t.category === 'restaurant');
      expect(restaurantTask).toMatchObject({
        category: 'restaurant',
        estimatedDuration: 15
      });
    });

    it('should extract gas station task', () => {
      const tasks = extractTasks('get gas on the way');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        category: 'gas',
        estimatedDuration: 5
      });
    });

    it('should extract pharmacy task as high priority', () => {
      const tasks = extractTasks('pick up prescription at pharmacy');
      // May match "pick up" pattern and "pharmacy" pattern
      expect(tasks.length).toBeGreaterThanOrEqual(1);
      const pharmacyTask = tasks.find(t => t.category === 'pharmacy');
      expect(pharmacyTask).toMatchObject({
        category: 'pharmacy',
        priority: 'high',
        estimatedDuration: 10
      });
    });

    it('should extract gym task with longer duration', () => {
      const tasks = extractTasks('go to the gym');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        category: 'gym',
        estimatedDuration: 60
      });
    });

    it('should extract generic "stop at" locations', () => {
      const tasks = extractTasks('stop at the library');
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        location: 'library',
        category: 'generic',
        priority: 'medium'
      });
    });

    it('should handle complex multi-task request', () => {
      const tasks = extractTasks(
        'pick up kids, get groceries, and stop at chinese restaurant'
      );
      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('extractLocations', () => {
    it('should extract "home" as destination', () => {
      const { destination } = extractLocations('arrive at home by 5pm');
      expect(destination).toBe('home');
    });

    it('should extract custom destination', () => {
      const { destination } = extractLocations('arrive at the gym by 6pm');
      expect(destination).toBe('the gym');
    });

    it('should extract origin from "from X"', () => {
      const { origin } = extractLocations('from office to home');
      expect(origin).toBe('office');
    });

    it('should return undefined when no locations specified', () => {
      const { origin, destination } = extractLocations('get groceries in 2 hours');
      expect(origin).toBeUndefined();
      expect(destination).toBeUndefined();
    });
  });

  describe('parseTimeConstrainedRequest', () => {
    it('should parse complete request with duration', () => {
      const result = parseTimeConstrainedRequest(
        'pick up the kids and get groceries in 2 hours'
      );

      expect(result.hasTimeConstraint).toBe(true);
      expect(result.timeConstraint).not.toBeNull();
      expect(result.timeConstraint!.type).toBe('duration');
      expect(result.timeConstraint!.value).toBe(120);
      expect(result.tasks).toHaveLength(2);
    });

    it('should parse request with deadline', () => {
      const result = parseTimeConstrainedRequest(
        'arrive at home by 5pm, stop at supermarket and chinese restaurant'
      );

      expect(result.hasTimeConstraint).toBe(true);
      expect(result.destination).toBe('home');
      expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse request without time constraint', () => {
      const result = parseTimeConstrainedRequest('plan a route to the mall');

      expect(result.hasTimeConstraint).toBe(false);
      expect(result.timeConstraint).toBeNull();
    });

    it('should handle real-world example 1', () => {
      const result = parseTimeConstrainedRequest(
        'Hey Journey, Plan a route that helps me pick up the kids and pick up groceries for the house in 2 hrs'
      );

      expect(result.hasTimeConstraint).toBe(true);
      expect(result.timeConstraint!.type).toBe('duration');
      expect(result.timeConstraint!.value).toBe(120);
      expect(result.tasks.length).toBeGreaterThanOrEqual(2);

      const schoolTask = result.tasks.find(t => t.category === 'school');
      const groceryTask = result.tasks.find(t => t.category === 'grocery');

      expect(schoolTask).toBeDefined();
      expect(groceryTask).toBeDefined();
      expect(schoolTask?.priority).toBe('high');
    });

    it('should handle real-world example 2', () => {
      const result = parseTimeConstrainedRequest(
        'I need to arrive at home by 5pm. can you route me to the supermarket and a chinese restaurant along the way'
      );

      expect(result.hasTimeConstraint).toBe(true);
      expect(result.timeConstraint!.type).toBe('arrival_time');
      expect(result.destination).toBe('home');
      expect(result.tasks.length).toBeGreaterThanOrEqual(1);

      const restaurantTask = result.tasks.find(t => t.category === 'restaurant');
      expect(restaurantTask).toBeDefined();

      // "supermarket" should either match "supermarket" pattern or be extracted as generic stop
      const hasShoppingTask = result.tasks.some(t =>
        t.category === 'grocery' || t.description.toLowerCase().includes('supermarket')
      );
      expect(hasShoppingTask).toBe(true);
    });
  });

  describe('formatTimeConstraint', () => {
    it('should format duration constraint', () => {
      const constraint: TimeConstraint = {
        type: 'duration',
        value: 120,
        originalText: 'in 2 hours',
        flexibility: 'hard'
      };

      const formatted = formatTimeConstraint(constraint);
      expect(formatted).toBe('2 hours');
    });

    it('should format duration with hours and minutes', () => {
      const constraint: TimeConstraint = {
        type: 'duration',
        value: 90,
        originalText: 'in 90 minutes',
        flexibility: 'hard'
      };

      const formatted = formatTimeConstraint(constraint);
      expect(formatted).toBe('1h 30m');
    });

    it('should format deadline constraint', () => {
      const deadline = new Date('2024-01-15T17:00:00');
      const constraint: TimeConstraint = {
        type: 'deadline',
        value: deadline,
        originalText: 'by 5pm',
        flexibility: 'hard'
      };

      const formatted = formatTimeConstraint(constraint);
      expect(formatted).toMatch(/05:00 PM|17:00/);
    });
  });
});
