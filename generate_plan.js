const fs = require('fs');

const plan = { days: [] };

const weeks = [
  { w: 1, topic: "Two Pointers & Sliding Window", cf: 1600, lc: "Medium" },
  { w: 2, topic: "Binary Search (On Answers)", cf: 1600, lc: "Medium" },
  { w: 3, topic: "Number Theory & Math Foundations", cf: 1700, lc: "Medium" },
  { w: 4, topic: "Prefix Sums & Bit Manipulation", cf: 1700, lc: "Medium" },
  { w: 5, topic: "Trees & Basic Graphs (DFS/BFS)", cf: 1700, lc: "Hard" },
  { w: 6, topic: "Shortest Paths (Dijkstra/Bellman-Ford)", cf: 1800, lc: "Hard" },
  { w: 7, topic: "Dynamic Programming (1D & 2D)", cf: 1800, lc: "Hard" },
  { w: 8, topic: "Dynamic Programming (Knapsack & Trees)", cf: 1800, lc: "Hard" },
  { w: 9, topic: "Disjoint Set Union (DSU) & MST", cf: 1800, lc: "Hard" },
  { w: 10, topic: "Advanced Graphs & SCCs", cf: 1900, lc: "Hard" },
  { w: 11, topic: "Segment Trees & Range Queries", cf: 1900, lc: "Hard" },
  { w: 12, topic: "Advanced DP (Bitmask & Digit)", cf: 1900, lc: "Hard" },
  { w: 13, topic: "Mixed Review & Final Polish", cf: 1900, lc: "Hard" }
];

let dayNum = 1;

for (let w = 0; w < 13; w++) {
  const week = weeks[w];
  const stage = `Week ${week.w} — ${week.topic}`;
  
  for (let i = 0; i < 7; i++) {
    const isContest = i === 5; // Day 6 of week
    const isRest = i === 6;    // Day 7 of week
    const isMockContest = (dayNum >= 85 && !isRest); // Near the end, all are mock contests or mixed review. We'll stick to the exact days listed in summary.
    
    // Exact lists from summary:
    // Practice: 1-5, 8-12, 15-19, 22-26, 29-33, 36-40, 43-47, 50-54, 57-61, 64-68, 71-75, 78-82, 85-87
    // Contest: 6, 13, 20, 27, 34, 41, 48, 55, 62, 69, 76, 83, 88
    // Rest: 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 89, 90
    
    let isP = [1,2,3,4,5,8,9,10,11,12,15,16,17,18,19,22,23,24,25,26,29,30,31,32,33,36,37,38,39,40,43,44,45,46,47,50,51,52,53,54,57,58,59,60,61,64,65,66,67,68,71,72,73,74,75,78,79,80,81,82,85,86,87].includes(dayNum);
    let isC = [6, 13, 20, 27, 34, 41, 48, 55, 62, 69, 76, 83, 88].includes(dayNum);
    let isR = [7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84, 89, 90].includes(dayNum);
    
    const day = { day_number: dayNum };
    
    if (isR) {
      day.topic = "Rest & Review";
      day.time_target = "0-1 hours";
    } else if (isC) {
      day.topic = "Virtual Contest";
      day.stage = stage;
      day.drill_type = "contest";
      day.contest = { platform: "Codeforces" };
    } else if (isP) {
      day.stage = stage;
      day.topic = week.topic;
      day.primary_skill = "Problem Solving";
      day.time_target = "2-3 hours";
      day.problems = [
        {
          slot: "A",
          platform: "Codeforces",
          title: `${week.topic} Codeforces Problem 1`,
          difficulty_rating: week.cf,
          url: "https://codeforces.com/problemset",
          topic_tags: [week.topic.toLowerCase().split(' ')[0]]
        },
        {
          slot: "B",
          platform: "LeetCode",
          title: `${week.topic} LeetCode Problem`,
          url: "https://leetcode.com/problemset/all/",
          topic_tags: [week.topic.toLowerCase().split(' ')[0]]
        },
        {
          slot: "C",
          platform: "Codeforces",
          title: `${week.topic} Codeforces Problem 2`,
          difficulty_rating: week.cf + 100,
          url: "https://codeforces.com/problemset",
          topic_tags: [week.topic.toLowerCase().split(' ')[0]]
        }
      ];
    }
    
    if (dayNum <= 90) {
      plan.days.push(day);
    }
    
    dayNum++;
  }
}

// Ensure day 89, 90 are added if they were missed in iteration
while (dayNum <= 90) {
    plan.days.push({
      day_number: dayNum,
      topic: "Rest & Reflect",
      time_target: "0 hours"
    });
    dayNum++;
}

fs.writeFileSync('plan.json', JSON.stringify(plan, null, 2));
console.log('Created plan.json');
