/**
 * Interactive test script for time constraint parser
 * Run: npx tsx test-time-parser.ts
 */

import { parseTimeConstrainedRequest, formatTimeConstraint } from './timeConstraintParser';

// Test examples
const testMessages = [
  "Hey Journey, Plan a route that helps me pick up the kids and pick up groceries for the house in 2 hrs",
  "I need to arrive at home by 5pm. can you route me to the supermarket and a chinese restaurant along the way",
  "pick up prescription at pharmacy in 45 minutes",
  "get gas and stop at restaurant before 6pm",
  "arrive at the gym by 5:30pm",
];

console.log('🧪 Time Constraint Parser - Interactive Tests\n');
console.log('='.repeat(80));

testMessages.forEach((message, index) => {
  console.log(`\n📝 Test ${index + 1}: "${message}"\n`);

  const result = parseTimeConstrainedRequest(message);

  console.log('⏰ Time Constraint:');
  if (result.timeConstraint) {
    console.log(`   Type: ${result.timeConstraint.type}`);
    console.log(`   Value: ${result.timeConstraint.type === 'duration' ? result.timeConstraint.value + ' minutes' : result.timeConstraint.value}`);
    console.log(`   Display: ${formatTimeConstraint(result.timeConstraint)}`);
    console.log(`   Flexibility: ${result.timeConstraint.flexibility}`);
  } else {
    console.log('   None detected');
  }

  console.log('\n📍 Locations:');
  if (result.origin || result.destination) {
    if (result.origin) console.log(`   Origin: ${result.origin}`);
    if (result.destination) console.log(`   Destination: ${result.destination}`);
  } else {
    console.log('   None specified');
  }

  console.log('\n✅ Tasks Extracted:', result.tasks.length);
  result.tasks.forEach((task, i) => {
    console.log(`   ${i + 1}. ${task.description}`);
    console.log(`      Category: ${task.category}`);
    console.log(`      Priority: ${task.priority}`);
    console.log(`      Duration: ${task.estimatedDuration} min`);
  });

  console.log('\n' + '-'.repeat(80));
});

console.log('\n\n💡 Try your own! Run this in Node:');
console.log('   node -e "const p = require(\'./timeConstraintParser\'); console.log(JSON.stringify(p.parseTimeConstrainedRequest(\'YOUR MESSAGE HERE\'), null, 2))"\n');
