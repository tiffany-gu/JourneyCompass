import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { parseUserRequest, generateConversationalResponse, generateStopReason } from "./gemini";
import { getDirections, findPlacesAlongRoute, calculateGasStops } from "./maps";
import { insertTripRequestSchema, insertConversationMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, tripRequestId } = req.body;

      let conversationHistory: string[] = [];
      if (tripRequestId) {
        const messages = await storage.getMessagesByTripId(tripRequestId);
        conversationHistory = messages.map(m => `${m.role}: ${m.content}`);
      }

      const tripParameters = await parseUserRequest(message, conversationHistory);

      const hasMissingInfo = !tripParameters.origin || !tripParameters.destination;

      const aiResponse = await generateConversationalResponse(
        message,
        tripParameters,
        hasMissingInfo
      );

      let currentTripId = tripRequestId;
      if (!hasMissingInfo && !tripRequestId) {
        const tripRequest = await storage.createTripRequest({
          origin: tripParameters.origin!,
          destination: tripParameters.destination!,
          fuelLevel: tripParameters.fuelLevel,
          vehicleRange: tripParameters.vehicleRange,
          preferences: tripParameters.preferences,
        });
        currentTripId = tripRequest.id;
      } else if (!hasMissingInfo && tripRequestId) {
        await storage.updateTripRequest(tripRequestId, {
          fuelLevel: tripParameters.fuelLevel ?? undefined,
          vehicleRange: tripParameters.vehicleRange ?? undefined,
          preferences: tripParameters.preferences ?? undefined,
        });
      }

      if (currentTripId) {
        await storage.createMessage({
          tripRequestId: currentTripId,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });

        await storage.createMessage({
          tripRequestId: currentTripId,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        response: aiResponse,
        tripRequestId: currentTripId,
        tripParameters,
        hasMissingInfo,
      });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/plan-route", async (req, res) => {
    try {
      const { tripRequestId } = req.body;

      const tripRequest = await storage.getTripRequest(tripRequestId);
      if (!tripRequest) {
        return res.status(404).json({ error: 'Trip request not found' });
      }

      const routes = await getDirections(
        tripRequest.origin,
        tripRequest.destination,
        tripRequest.preferences || undefined
      );

      const selectedRoute = tripRequest.preferences?.scenic 
        ? routes[routes.length > 1 ? 1 : 0]
        : routes[0];

      await storage.updateTripRequest(tripRequestId, {
        route: selectedRoute,
      });

      res.json({
        routes,
        selectedRoute,
      });
    } catch (error: any) {
      console.error('Route planning error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/find-stops", async (req, res) => {
    try {
      const { tripRequestId } = req.body;

      const tripRequest = await storage.getTripRequest(tripRequestId);
      if (!tripRequest || !tripRequest.route) {
        return res.status(404).json({ error: 'Trip request or route not found' });
      }

      const polyline = tripRequest.route.overview_polyline?.points;
      if (!polyline) {
        return res.status(400).json({ error: 'Route polyline not found' });
      }

      const stops: any[] = [];

      if (tripRequest.fuelLevel && tripRequest.vehicleRange) {
        const gasStopLocations = calculateGasStops(
          tripRequest.route,
          tripRequest.fuelLevel,
          tripRequest.vehicleRange
        );

        const gasStations = await findPlacesAlongRoute(
          polyline,
          'gas_station',
          { rating: 4.0 }
        );

        for (let i = 0; i < Math.min(gasStopLocations.length, 2); i++) {
          const station = gasStations[i];
          if (station) {
            const reason = await generateStopReason(
              'gas',
              station.name,
              station,
              `Trip distance: ${tripRequest.route.legs[0].distance.text}`
            );

            stops.push({
              type: 'gas',
              name: station.name,
              category: 'Gas Station',
              rating: station.rating,
              priceLevel: station.price_level ? '$'.repeat(station.price_level) : '$$',
              hours: station.opening_hours?.open_now ? 'Open now' : 'Hours vary',
              distanceOffRoute: '0.3 mi',
              reason,
              location: station.geometry.location,
            });
          }
        }
      }

      if (tripRequest.preferences?.restaurantPreferences) {
        const restaurants = await findPlacesAlongRoute(
          polyline,
          'restaurant',
          {
            rating: tripRequest.preferences.restaurantPreferences.rating || 4.0,
            keyword: tripRequest.preferences.restaurantPreferences.cuisine,
          }
        );

        const restaurant = restaurants[0];
        if (restaurant) {
          const reason = await generateStopReason(
            'restaurant',
            restaurant.name,
            restaurant,
            `Cuisine preference: ${tripRequest.preferences.restaurantPreferences.cuisine || 'any'}`
          );

          stops.push({
            type: 'restaurant',
            name: restaurant.name,
            category: restaurant.types?.[0]?.replace(/_/g, ' ') || 'Restaurant',
            rating: restaurant.rating,
            priceLevel: restaurant.price_level ? '$'.repeat(restaurant.price_level) : '$$',
            hours: restaurant.opening_hours?.open_now ? 'Open now' : 'Hours vary',
            distanceOffRoute: '0.5 mi',
            reason,
            location: restaurant.geometry.location,
          });
        }
      }

      if (tripRequest.preferences?.scenic) {
        const scenicPlaces = await findPlacesAlongRoute(
          polyline,
          'tourist_attraction',
          { rating: 4.5, keyword: 'viewpoint scenic overlook' }
        );

        const scenic = scenicPlaces[0];
        if (scenic) {
          const reason = await generateStopReason(
            'scenic',
            scenic.name,
            scenic,
            'Scenic route preference'
          );

          stops.push({
            type: 'scenic',
            name: scenic.name,
            category: 'Scenic Overlook',
            rating: scenic.rating,
            distanceOffRoute: '1.2 mi',
            reason,
            location: scenic.geometry.location,
          });
        }
      }

      await storage.updateTripRequest(tripRequestId, {
        stops,
      });

      res.json({ stops });
    } catch (error: any) {
      console.error('Find stops error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
