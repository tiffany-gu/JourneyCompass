import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AppHeader from "@/components/AppHeader";
import ChatMessage from "@/components/ChatMessage";
import MessageInput from "@/components/MessageInput";
import RouteComparisonCard from "@/components/RouteComparisonCard";
import StopCard from "@/components/StopCard";
import MapView from "@/components/MapView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface Stop {
  type: 'gas' | 'restaurant' | 'scenic';
  name: string;
  category: string;
  rating?: number;
  priceLevel?: string;
  hours?: string;
  distanceOffRoute: string;
  reason: string;
  location?: any;
}

export default function JourneyAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm your Journey Assistant. Tell me where you're headed and I'll help you plan the perfect route with gas stops, restaurants, and scenic viewpoints along the way.",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [tripRequestId, setTripRequestId] = useState<string | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, stops]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest('POST', '/api/chat', { message, tripRequestId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (data.tripRequestId) {
        setTripRequestId(data.tripRequestId);
      }

      if (!data.hasMissingInfo && data.tripRequestId) {
        planRouteMutation.mutate(data.tripRequestId);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const planRouteMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiRequest('POST', '/api/plan-route', { tripRequestId: tripId });
      return await res.json();
    },
    onSuccess: (data: any, variables: string) => {
      setRouteData(data.selectedRoute);
      
      const routeMessage: Message = {
        id: Date.now().toString(),
        text: "I've found your route! Let me find some great stops along the way...",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, routeMessage]);

      findStopsMutation.mutate(variables);
    },
    onError: (error: Error) => {
      toast({
        title: "Route Planning Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const findStopsMutation = useMutation({
    mutationFn: async (tripId: string) => {
      const res = await apiRequest('POST', '/api/find-stops', { tripRequestId: tripId });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setStops(data.stops);
      
      if (data.stops.length > 0) {
        const stopsMessage: Message = {
          id: Date.now().toString(),
          text: "Here are some recommended stops along your route:",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, stopsMessage]);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error Finding Stops",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(text);
  };

  const handleVoiceClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice Input Not Supported",
        description: "Your browser doesn't support voice input. Please type your request.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      handleSendMessage(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast({
        title: "Voice Input Error",
        description: "Couldn't process voice input. Please try again.",
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const calculateRouteComparison = () => {
    if (!routeData || !routeData.legs) return null;

    const totalDuration = routeData.legs.reduce(
      (sum: number, leg: any) => sum + (leg.duration?.value || 0),
      0
    );
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);

    const googleFastest = `${hours}h ${minutes}m`;
    const addedMinutes = stops.length * 10;
    const yourRouteMinutes = minutes + addedMinutes;
    const yourRouteHours = hours + Math.floor(yourRouteMinutes / 60);
    const yourRouteRemainingMinutes = yourRouteMinutes % 60;
    const yourRoute = `${yourRouteHours}h ${yourRouteRemainingMinutes}m`;

    return {
      googleFastest,
      yourRoute,
      timeDifference: `${addedMinutes}m`,
      stops: stops.length,
      estimatedCost: "$23 gas",
    };
  };

  const comparison = calculateRouteComparison();

  return (
    <div className="flex flex-col h-screen bg-background">
      <AppHeader isRecording={isRecording} />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[40%] border-r border-border flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div ref={scrollRef} className="space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                  timestamp={message.timestamp}
                />
              ))}
              
              {comparison && (
                <div className="py-2" data-testid="container-route-comparison">
                  <RouteComparisonCard {...comparison} />
                </div>
              )}
              
              {stops.length > 0 && (
                <div className="space-y-3" data-testid="container-stops">
                  {stops.map((stop, index) => (
                    <StopCard key={index} {...stop} />
                  ))}
                </div>
              )}

              {(chatMutation.isPending || planRouteMutation.isPending || findStopsMutation.isPending) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm">
                    {chatMutation.isPending && "Thinking..."}
                    {planRouteMutation.isPending && "Planning route..."}
                    {findStopsMutation.isPending && "Finding stops..."}
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-border bg-background">
            <MessageInput
              onSendMessage={handleSendMessage}
              onVoiceClick={handleVoiceClick}
              isRecording={isRecording}
            />
          </div>
        </div>
        
        <div className="flex-1 p-6 flex flex-col">
          <MapView route={routeData} stops={stops} />
        </div>
      </div>
    </div>
  );
}
