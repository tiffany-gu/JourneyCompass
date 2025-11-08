import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Utensils, Mountain, Star, DollarSign, Clock, MapPin } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type StopType = "gas" | "restaurant" | "scenic";

interface StopCardProps {
  type: StopType;
  name: string;
  category: string;
  rating?: number;
  priceLevel?: string;
  hours?: string;
  distanceOffRoute: string;
  reason: string;
}

const iconMap = {
  gas: Fuel,
  restaurant: Utensils,
  scenic: Mountain,
};

const colorMap = {
  gas: "text-blue-600 dark:text-blue-400",
  restaurant: "text-orange-600 dark:text-orange-400",
  scenic: "text-purple-600 dark:text-purple-400",
};

export default function StopCard({
  type,
  name,
  category,
  rating,
  priceLevel,
  hours,
  distanceOffRoute,
  reason,
}: StopCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = iconMap[type];

  return (
    <Card className="overflow-visible" data-testid={`card-stop-${type}`}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${colorMap[type]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-semibold truncate" data-testid={`text-stop-name-${type}`}>{name}</h3>
            <p className="text-sm text-muted-foreground">{category}</p>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{rating}</span>
                </div>
              )}
              {priceLevel && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{priceLevel}</span>
                </div>
              )}
              {hours && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{hours}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <MapPin className="w-3 h-3" />
            <span>{distanceOffRoute}</span>
          </div>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-8"
              data-testid={`button-toggle-reason-${type}`}
            >
              <span className="text-xs font-medium">Why this stop?</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              {reason}
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => console.log(`Added ${name} to route`)}
            data-testid={`button-add-stop-${type}`}
          >
            Add to Route
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => console.log(`Skipped ${name}`)}
            data-testid={`button-skip-stop-${type}`}
          >
            Skip
          </Button>
        </div>
      </div>
    </Card>
  );
}
