import { MapPin, Navigation, Eye, Map as MapIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";

interface MapViewProps {
  route?: any;
  stops?: Array<{
    type: 'gas' | 'restaurant' | 'scenic';
    name: string;
    location?: any;
  }>;
}

export default function MapView({ route, stops = [] }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isNavigationView, setIsNavigationView] = useState(false);

  // Initialize Mapbox
  useEffect(() => {
    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('[MapView] Mapbox access token is missing');
      return;
    }

    if (mapRef.current || !mapContainerRef.current) return;

    console.log('[MapView] Initializing Mapbox');
    mapboxgl.accessToken = accessToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12', // Modern street map style
      center: [-122.4194, 37.7749], // San Francisco
      zoom: 15,
      pitch: 45, // Tilt map for 3D view
      bearing: -17.6, // Rotate map slightly
      attributionControl: true,
      antialias: true, // Smooth 3D rendering
    });

    // Add navigation controls (zoom, rotate, pitch)
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    mapRef.current = map;
    console.log('[MapView] Mapbox initialized successfully');

    // Add 3D terrain, buildings, and sky when map loads
    map.on('load', () => {
      console.log('[MapView] Adding 3D terrain and buildings');

      // Add 3D terrain source
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });

      // Set 3D terrain with exaggeration
      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 1.5, // Makes terrain more dramatic
      });

      // Add sky layer for atmosphere
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Add 3D buildings layer
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        },
        labelLayerId
      );

      console.log('[MapView] 3D terrain and buildings added successfully');
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle route rendering
  useEffect(() => {
    if (!mapRef.current || !route) return;

    const map = mapRef.current;
    console.log('[MapView] Rendering route on Mapbox');

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove existing route layer if it exists
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }

    // Decode and render polyline
    if (route.overview_polyline?.points) {
      const decodedPath = decodePolyline(route.overview_polyline.points);

      // Convert to GeoJSON format for Mapbox
      const geojson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: decodedPath.map(([lat, lng]) => [lng, lat]), // Mapbox uses [lng, lat]
        },
      };

      // Wait for map to load before adding source/layer
      const addRoute = () => {
        if (!map.getSource('route')) {
          map.addSource('route', {
            type: 'geojson',
            data: geojson,
          });

          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#3B82F6',
              'line-width': 4,
              'line-opacity': 0.9,
            },
          });
        }

        // Fit map to route bounds
        const bounds = new mapboxgl.LngLatBounds();
        decodedPath.forEach(([lat, lng]) => {
          bounds.extend([lng, lat]);
        });
        map.fitBounds(bounds, { padding: 50 });
      };

      if (map.isStyleLoaded()) {
        addRoute();
      } else {
        map.once('load', addRoute);
      }
    }

    // Add start and end markers
    if (route.legs && route.legs[0]) {
      const startLoc = route.legs[0].start_location;

      // Start marker (green)
      const startEl = document.createElement('div');
      startEl.className = 'marker';
      startEl.style.backgroundColor = '#10B981';
      startEl.style.width = '24px';
      startEl.style.height = '24px';
      startEl.style.borderRadius = '50%';
      startEl.style.border = '3px solid white';
      startEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      startEl.style.cursor = 'pointer';

      const startMarker = new mapboxgl.Marker({ element: startEl })
        .setLngLat([startLoc.lng, startLoc.lat])
        .setPopup(new mapboxgl.Popup().setText('Start'))
        .addTo(map);

      markersRef.current.push(startMarker);

      // End marker (red)
      const endLoc = route.legs[route.legs.length - 1].end_location;
      const endEl = document.createElement('div');
      endEl.className = 'marker';
      endEl.style.backgroundColor = '#EF4444';
      endEl.style.width = '24px';
      endEl.style.height = '24px';
      endEl.style.borderRadius = '50%';
      endEl.style.border = '3px solid white';
      endEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      endEl.style.cursor = 'pointer';

      const endMarker = new mapboxgl.Marker({ element: endEl })
        .setLngLat([endLoc.lng, endLoc.lat])
        .setPopup(new mapboxgl.Popup().setText('Destination'))
        .addTo(map);

      markersRef.current.push(endMarker);
    }
  }, [route]);

  // Handle stops rendering
  useEffect(() => {
    if (!mapRef.current || stops.length === 0) return;

    console.log('[MapView] Rendering stops:', stops.length);

    const colorMap = {
      gas: '#3B82F6',
      restaurant: '#F97316',
      scenic: '#A855F7',
    };

    const iconMap = {
      gas: '⛽',
      restaurant: '🍴',
      scenic: '🏞️',
    };

    stops.forEach((stop) => {
      if (!stop.location || !mapRef.current) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'stop-marker';
      el.style.backgroundColor = colorMap[stop.type];
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '12px';
      el.textContent = iconMap[stop.type];

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([stop.location.lng, stop.location.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div style="padding: 4px;">
              <strong>${stop.name}</strong><br>
              <span style="text-transform: capitalize; color: ${colorMap[stop.type]};">${stop.type}</span>
            </div>`
          )
        )
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [stops]);

  // Toggle between overview and navigation view
  const toggleNavigationView = () => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (!isNavigationView) {
      // Switch to navigation/street view
      map.easeTo({
        pitch: 70, // More tilted, closer to ground level
        zoom: 17.5, // Closer zoom for street view
        bearing: route ? 0 : map.getBearing(), // Align with route direction if available
        duration: 1000,
      });
      setIsNavigationView(true);
    } else {
      // Switch back to overview
      map.easeTo({
        pitch: 45,
        zoom: route ? map.getZoom() : 15,
        duration: 1000,
      });
      setIsNavigationView(false);
    }
  };

  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    return (
      <div className="relative w-full h-full bg-muted/30 rounded-md overflow-hidden border border-border flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <Navigation className="w-12 h-12 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Mapbox Access Token Required</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Add VITE_MAPBOX_ACCESS_TOKEN to your environment variables
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-md overflow-hidden border border-border" style={{ minHeight: '500px' }}>
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '500px' }} />

      {/* View Toggle Button */}
      <div className="absolute bottom-6 right-6 z-10">
        <Button
          onClick={toggleNavigationView}
          size="lg"
          className="shadow-lg"
          variant={isNavigationView ? "default" : "secondary"}
        >
          {isNavigationView ? (
            <>
              <MapIcon className="w-5 h-5 mr-2" />
              Overview
            </>
          ) : (
            <>
              <Eye className="w-5 h-5 mr-2" />
              Street View
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}
