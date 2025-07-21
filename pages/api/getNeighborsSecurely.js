import Airtable from "airtable";

// Get the API key from our utility function
const apiKey = process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED
console.log("API Key first 10 chars:", apiKey ? apiKey.substring(0, 10) + "..." : "undefined");

const base = new Airtable({ apiKey }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { showOnlyApprovedFlights, showOnlyNoFeedback } = req.query;
    
    let filterFormula = "totalTimeHackatimeHours >= 1.0";
    if (showOnlyApprovedFlights === 'true') {
      filterFormula = `AND(${filterFormula}, approvedFlightStipend = TRUE())`;
    }
    if (showOnlyNoFeedback === 'true') {
      filterFormula = `AND(${filterFormula}, gavefeedback != TRUE())`;
    }

    const neighborRecords = await base("Neighbors")
      .select({
        fields: [
          "Pfp (from slackNeighbor)",
          "Slack ID (from slackNeighbor)",
          "Slack Handle (from slackNeighbor)",
          "githubUsername",
          "totalTimeCombinedHours",
          "totalTimeHackatimeHours",
          "totalTimeStopwatchHours",
          "totalCheckedTime",
          "airport",
          "approvedFlightStipend",
          "move-in-date",
          "gavefeedback",
          "starAvg",
          "hideJakeTheDog",
          "isIRL"
        ],
        filterByFormula: filterFormula
      })
      .all();

    const neighbors = neighborRecords.map(record => ({
      id: record.id,
      pfp: record.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
      slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
      slackHandle: record.fields["Slack Handle (from slackNeighbor)"] || null,
      fullName: record.fields["Slack Handle (from slackNeighbor)"]?.[0] || null,
      githubUsername: record.fields.githubUsername || null,
      totalTimeCombinedHours: record.fields.totalTimeCombinedHours || 0,
      totalTimeHackatimeHours: Math.round(record.fields.totalTimeHackatimeHours || 0),
      totalTimeStopwatchHours: record.fields.totalTimeStopwatchHours || 0,
      totalCheckedTime: record.fields.totalCheckedTime || 0,
      airport: record.fields.airport,
      approvedFlightStipend: record.fields.approvedFlightStipend || false,
      moveInDate: record.fields["move-in-date"] || null,
      gaveFeedback: record.fields.gavefeedback || false,
      starAvg: Number(record.fields.starAvg) || 0,
      hideJakeTheDog: record.fields.hideJakeTheDog || false,
      isIRL: record.fields.isIRL || false
    }));

    return res.status(200).json({ neighbors });
  } catch (error) {
    console.error("Error fetching neighbors:", error);
    return res.status(500).json({ message: "Error fetching neighbors" });
  }
} 
