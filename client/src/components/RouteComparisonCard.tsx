import { Card } from "@/components/ui/card";
import { Clock, DollarSign } from "lucide-react";

interface RouteComparisonCardProps {
  googleFastest: string;
  yourRoute: string;
  timeDifference: string;
  stops: number;
  estimatedCost: string;
}

export default function RouteComparisonCard({
  googleFastest,
  yourRoute,
  timeDifference,
  stops,
  estimatedCost,
}: RouteComparisonCardProps) {
  return (
    <Card className="p-4 space-y-3" data-testid="card-route-comparison">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Google Fastest
          </p>
          <div className="flex items-baseline gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{googleFastest}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Your Route
          </p>
          <div className="flex items-baseline gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-semibold tabular-nums">{yourRoute}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm pt-2 border-t border-border">
        <span className="text-amber-600 dark:text-amber-500 font-medium">
          +{timeDifference}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-foreground">{stops} stops</span>
        <span className="text-muted-foreground">•</span>
        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-foreground">{estimatedCost}</span>
        </div>
      </div>
    </Card>
  );
}
