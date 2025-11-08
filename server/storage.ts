import { 
  type TripRequest, 
  type InsertTripRequest,
  type ConversationMessage,
  type InsertConversationMessage 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createTripRequest(tripRequest: InsertTripRequest): Promise<TripRequest>;
  getTripRequest(id: string): Promise<TripRequest | undefined>;
  updateTripRequest(id: string, updates: Partial<InsertTripRequest>): Promise<TripRequest>;
  
  createMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  getMessagesByTripId(tripRequestId: string): Promise<ConversationMessage[]>;
}

export class MemStorage implements IStorage {
  private tripRequests: Map<string, TripRequest>;
  private messages: Map<string, ConversationMessage>;

  constructor() {
    this.tripRequests = new Map();
    this.messages = new Map();
  }

  async createTripRequest(insertTripRequest: InsertTripRequest): Promise<TripRequest> {
    const id = randomUUID();
    const tripRequest: TripRequest = { 
      id,
      ...insertTripRequest,
      fuelLevel: insertTripRequest.fuelLevel ?? null,
      vehicleRange: insertTripRequest.vehicleRange ?? null,
      preferences: (insertTripRequest.preferences ?? null) as TripRequest['preferences'],
      route: insertTripRequest.route ?? null,
      stops: insertTripRequest.stops ?? null,
    };
    this.tripRequests.set(id, tripRequest);
    return tripRequest;
  }

  async getTripRequest(id: string): Promise<TripRequest | undefined> {
    return this.tripRequests.get(id);
  }

  async updateTripRequest(id: string, updates: Partial<InsertTripRequest>): Promise<TripRequest> {
    const existing = this.tripRequests.get(id);
    if (!existing) {
      throw new Error(`Trip request ${id} not found`);
    }
    const updated = { 
      ...existing, 
      ...updates,
      preferences: updates.preferences as TripRequest['preferences'] ?? existing.preferences,
    };
    this.tripRequests.set(id, updated);
    return updated;
  }

  async createMessage(insertMessage: InsertConversationMessage): Promise<ConversationMessage> {
    const id = randomUUID();
    const message: ConversationMessage = { 
      id, 
      ...insertMessage,
      tripRequestId: insertMessage.tripRequestId ?? null,
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByTripId(tripRequestId: string): Promise<ConversationMessage[]> {
    return Array.from(this.messages.values())
      .filter(m => m.tripRequestId === tripRequestId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

export const storage = new MemStorage();
