import StopCard from '../StopCard';

export default function StopCardExample() {
  return (
    <div className="space-y-4 p-4 bg-background max-w-md">
      <StopCard
        type="gas"
        name="Shell Gas Station"
        category="Gas Station"
        rating={4.5}
        priceLevel="$$"
        hours="Open 24h"
        distanceOffRoute="0.3 mi"
        reason="This station has the highest rating in the area and offers competitive prices. It's conveniently located just off your route with easy highway access."
      />
      <StopCard
        type="restaurant"
        name="The Green Fork"
        category="Vegetarian Restaurant"
        rating={4.7}
        priceLevel="$$"
        hours="Open until 9pm"
        distanceOffRoute="0.5 mi"
        reason="Highly-rated vegetarian restaurant that fits your lunch timeframe (12-1pm) and budget (<$25). Features outdoor seating and ample parking."
      />
      <StopCard
        type="scenic"
        name="Sunset Vista Point"
        category="Scenic Overlook"
        rating={4.8}
        distanceOffRoute="1.2 mi"
        reason="This viewpoint offers stunning panoramic views of the valley and is one of the most photographed spots on this route. Perfect for a 15-minute break."
      />
    </div>
  );
}
