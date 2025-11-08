import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

interface DirectionsResult {
  routes: any[];
  status: string;
}

interface PlacesResult {
  results: any[];
  status: string;
}

export async function getDirections(
  origin: string,
  destination: string,
  preferences?: {
    scenic?: boolean;
    fast?: boolean;
    avoidTolls?: boolean;
  }
): Promise<any[]> {
  const avoid = [];
  if (preferences?.avoidTolls) avoid.push('tolls');

  const alternatives = preferences?.scenic ? 'true' : 'false';

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.append('origin', origin);
  url.searchParams.append('destination', destination);
  url.searchParams.append('alternatives', alternatives);
  if (avoid.length > 0) {
    url.searchParams.append('avoid', avoid.join('|'));
  }
  url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json() as DirectionsResult;

  if (data.status !== 'OK') {
    throw new Error(`Directions API error: ${data.status}`);
  }

  return data.routes;
}

export async function findPlacesAlongRoute(
  polyline: string,
  type: 'gas_station' | 'restaurant' | 'tourist_attraction',
  filters?: {
    rating?: number;
    priceLevel?: string;
    keyword?: string;
  }
): Promise<any[]> {
  const decodedPath = decodePolyline(polyline);
  
  const samplePoints = samplePolylinePoints(decodedPath, 5);
  
  const allPlaces: any[] = [];
  
  for (const point of samplePoints) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.append('location', `${point.lat},${point.lng}`);
    url.searchParams.append('radius', '5000');
    url.searchParams.append('type', type);
    if (filters?.keyword) {
      url.searchParams.append('keyword', filters.keyword);
    }
    url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json() as PlacesResult;

    if (data.status === 'OK' && data.results) {
      allPlaces.push(...data.results);
    }
  }

  let filteredPlaces = allPlaces;
  
  if (filters?.rating) {
    filteredPlaces = filteredPlaces.filter(p => p.rating && p.rating >= filters.rating!);
  }

  const uniquePlaces = Array.from(
    new Map(filteredPlaces.map(p => [p.place_id, p])).values()
  );

  return uniquePlaces.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

function samplePolylinePoints(
  points: Array<{ lat: number; lng: number }>,
  numSamples: number
): Array<{ lat: number; lng: number }> {
  if (points.length <= numSamples) return points;

  const step = Math.floor(points.length / numSamples);
  const sampled: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < numSamples; i++) {
    sampled.push(points[i * step]);
  }

  return sampled;
}

export function calculateGasStops(
  route: any,
  fuelLevel: number,
  vehicleRange: number,
  minimumFuelThreshold: number = 0.2
): Array<{ distance: number; location: { lat: number; lng: number } }> {
  const legs = route.legs || [];
  const stops: Array<{ distance: number; location: { lat: number; lng: number } }> = [];

  let currentFuel = fuelLevel * vehicleRange;
  let totalDistanceCovered = 0;
  const minFuelRemaining = minimumFuelThreshold * vehicleRange;
  const safeRangePerTank = (1 - minimumFuelThreshold) * vehicleRange;

  for (const leg of legs) {
    const legDistanceMiles = (leg.distance?.value || 0) / 1609.34;
    let remainingLegDistance = legDistanceMiles;

    while (remainingLegDistance > 0) {
      const distanceToRefuel = currentFuel - minFuelRemaining;

      if (remainingLegDistance <= distanceToRefuel) {
        currentFuel -= remainingLegDistance;
        totalDistanceCovered += remainingLegDistance;
        remainingLegDistance = 0;
      } else {
        const stopDistance = totalDistanceCovered + distanceToRefuel;
        
        const progressRatio = distanceToRefuel / legDistanceMiles;
        const interpolatedLat = leg.start_location.lat + 
          (leg.end_location.lat - leg.start_location.lat) * progressRatio;
        const interpolatedLng = leg.start_location.lng + 
          (leg.end_location.lng - leg.start_location.lng) * progressRatio;

        stops.push({
          distance: stopDistance,
          location: { lat: interpolatedLat, lng: interpolatedLng },
        });

        currentFuel = vehicleRange;
        totalDistanceCovered = stopDistance;
        remainingLegDistance -= distanceToRefuel;
      }
    }
  }

  return stops;
}
