import RouteComparisonCard from '../RouteComparisonCard';

export default function RouteComparisonCardExample() {
  return (
    <div className="p-4 bg-background">
      <RouteComparisonCard
        googleFastest="3h 10m"
        yourRoute="3h 35m"
        timeDifference="25m"
        stops={2}
        estimatedCost="$23 gas"
      />
    </div>
  );
}
