#!/bin/bash

echo "Testing Time Constraint Parser API"
echo "===================================="
echo ""

# Test 1
echo "Test 1: Pick up kids and groceries in 2 hours"
curl -s -X POST http://localhost:3000/api/test-time-parser \
  -H "Content-Type: application/json" \
  -d '{"message": "pick up the kids and get groceries in 2 hours"}' | jq '.'
echo ""

# Test 2
echo "Test 2: Arrive home by 5pm"
curl -s -X POST http://localhost:3000/api/test-time-parser \
  -H "Content-Type: application/json" \
  -d '{"message": "I need to arrive at home by 5pm"}' | jq '.'
echo ""

# Test 3
echo "Test 3: Pick up prescription in 45 minutes"
curl -s -X POST http://localhost:3000/api/test-time-parser \
  -H "Content-Type: application/json" \
  -d '{"message": "pick up prescription at pharmacy in 45 minutes"}' | jq '.'
echo ""
