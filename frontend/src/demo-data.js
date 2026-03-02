const today = new Date();

function day(offset) {
  const d = new Date(today);
  d.setDate(today.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const demoDashboard = {
  summary: {
    studentId: "S-1024",
    studentName: "Alicia Tan",
    gradeLevel: "Year 2",
    overallMastery: 64,
    masteryTrend: "+4% this week",
    weeklyStudyMinutes: 192,
    streakDays: 5,
    riskLevel: "Moderate",
    lastActiveAt: day(-1),
    diagnoses: [
      {
        type: "concept_gap",
        label: "Concept Gap",
        detail: "Low mastery in ratio and proportion questions (42%).",
      },
      {
        type: "time_pressure",
        label: "Time Pressure",
        detail: "Accuracy drops sharply when response time exceeds 70 seconds.",
      },
      {
        type: "inactivity_decay",
        label: "Inactivity Decay",
        detail: "No geometry practice in the last 6 days.",
      },
    ],
  },
  recommendations: [
    {
      id: "rec-ratio-bridge",
      title: "Rebuild ratio-to-fraction link",
      objective: "Close concept gap in ratio and proportion word problems.",
      priority: "high",
      estimatedMinutes: 35,
      scheduledDay: "Mon",
      scheduledDate: day(0),
      confidence: 0.9,
      expectedImpact: "Expected +9 mastery points in ratio-tagged items.",
      actions: [
        "Complete 8 scaffolded ratio questions.",
        "Review worked examples on unit comparison.",
        "Attempt 4 mixed transfer questions under no time limit.",
      ],
      status: "pending",
      evidence: {
        signals: [
          "12/20 recent ratio questions were incorrect with the same conversion error.",
          "Hints were used in 63% of ratio-tagged attempts.",
          "Accuracy rises to 81% when questions are scaffolded.",
        ],
        metrics: [
          { label: "Ratio accuracy (7d)", value: "42%", trend: "down 6%" },
          { label: "Hint dependency", value: "63%", trend: "up 12%" },
          { label: "Median response time", value: "76s", trend: "up 9s" },
          { label: "Mastery confidence", value: "0.69", trend: "medium" },
        ],
        timeline: [
          { ts: `${day(-3)} 19:42`, event: "Quiz Set 4", note: "4/7 incorrect in ratio conversions." },
          { ts: `${day(-2)} 21:10`, event: "Practice Drill", note: "Needed hints on 3 consecutive items." },
          { ts: `${day(-1)} 18:25`, event: "Checkpoint", note: "Improved when given worked example." },
        ],
      },
    },
    {
      id: "rec-speed-stability",
      title: "Stabilize performance under time pressure",
      objective: "Reduce careless errors in timed assessments.",
      priority: "medium",
      estimatedMinutes: 25,
      scheduledDay: "Tue",
      scheduledDate: day(1),
      confidence: 0.84,
      expectedImpact: "Expected 18% fewer slips on 60-second tasks.",
      actions: [
        "Run 2 timed sets (6 questions each) at 60 seconds/question.",
        "Use the 10-second final check habit before submission.",
      ],
      status: "pending",
      evidence: {
        signals: [
          "Accuracy drops from 74% to 49% when timer is active.",
          "Most errors are sign mistakes and skipped units.",
        ],
        metrics: [
          { label: "Timed set accuracy", value: "49%", trend: "flat" },
          { label: "Untimed set accuracy", value: "74%", trend: "up 3%" },
          { label: "Careless error rate", value: "31%", trend: "up 5%" },
          { label: "Mastery confidence", value: "0.77", trend: "high" },
        ],
        timeline: [
          { ts: `${day(-4)} 16:05`, event: "Timed Drill", note: "3 sign errors under pace." },
          { ts: `${day(-2)} 20:14`, event: "Mock Quiz", note: "Two answers missed due to unit omission." },
        ],
      },
    },
    {
      id: "rec-geometry-revive",
      title: "Recover geometry retention",
      objective: "Prevent inactivity decay in area and angle concepts.",
      priority: "medium",
      estimatedMinutes: 20,
      scheduledDay: "Thu",
      scheduledDate: day(3),
      confidence: 0.78,
      expectedImpact: "Expected +6 retention points in geometry after refresher.",
      actions: [
        "Solve 6 area + angle review questions.",
        "Write one-page summary of formulas and edge cases.",
      ],
      status: "pending",
      evidence: {
        signals: [
          "No geometry-tagged activity in the last 6 days.",
          "Last geometry checkpoint showed weak recall in area decomposition.",
        ],
        metrics: [
          { label: "Days since last geometry", value: "6", trend: "up" },
          { label: "Geometry recall score", value: "58%", trend: "down 8%" },
          { label: "Mastery confidence", value: "0.71", trend: "medium" },
          { label: "Predicted decay risk", value: "High", trend: "increasing" },
        ],
        timeline: [
          { ts: `${day(-6)} 15:11`, event: "Area Test", note: "Strong start, weak composite shapes." },
          { ts: `${day(-1)} 10:00`, event: "No activity", note: "Decay threshold crossed at day 5." },
        ],
      },
    },
    {
      id: "rec-reflection-loop",
      title: "Add a 5-minute error reflection loop",
      objective: "Convert mistakes into strategy updates after every session.",
      priority: "low",
      estimatedMinutes: 10,
      scheduledDay: "Sat",
      scheduledDate: day(5),
      confidence: 0.73,
      expectedImpact: "Expected +0.12 confidence gain in error-prone concepts.",
      actions: [
        "After each session, log one repeated error pattern.",
        "Write one correction strategy for next attempt.",
      ],
      status: "pending",
      evidence: {
        signals: [
          "Repeated error types persisted over 3 sessions.",
          "No reflection note submitted in last week.",
        ],
        metrics: [
          { label: "Reflection completion", value: "14%", trend: "down 9%" },
          { label: "Repeat error index", value: "0.46", trend: "up 0.07" },
          { label: "Mastery confidence", value: "0.65", trend: "medium" },
          { label: "Predicted transfer", value: "Moderate", trend: "flat" },
        ],
        timeline: [
          { ts: `${day(-3)} 21:18`, event: "Post Quiz", note: "No reflection logged after mistakes." },
          { ts: `${day(-1)} 19:55`, event: "Practice", note: "Same conversion error repeated." },
        ],
      },
    },
  ],
};
