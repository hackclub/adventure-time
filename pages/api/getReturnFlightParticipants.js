/*
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
    
    let filterFormula = "AND(totalTimeHackatimeHours >= 1.0, isIRL = TRUE())";
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
          "Full Name (from slackNeighbor)",
          "githubUsername",
          "totalTimeCombinedHours",
          "totalTimeHackatimeHours",
          "totalTimeStopwatchHours",
          "totalCheckedTime",
          "Full Name",
          "airport",
          "approvedFlightStipend",
          "move-in-date",
          "gavefeedback",
          "starAvg",
          "hideJakeTheDog",
          "isIRL",
          "weightedGrantsContribution",
          "Age",
          "flightBookedHome",
          "independenceProgram"
        ],
        filterByFormula: filterFormula
      })
      .all();

    const participants = neighborRecords.map(record => ({
      id: record.id,
      pfp: record.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
      slackId: record.fields["Slack ID (from slackNeighbor)"] || null,
      slackFullName: record.fields["Full Name (from slackNeighbor)"] || null,
      githubUsername: record.fields.githubUsername || null,
      totalTimeCombinedHours: record.fields.totalTimeCombinedHours || 0,
      totalTimeHackatimeHours: Math.round(record.fields.totalTimeHackatimeHours || 0),
      totalTimeStopwatchHours: record.fields.totalTimeStopwatchHours || 0,
      fullName: record.fields["Full Name"] || null,
      totalCheckedTime: record.fields.totalCheckedTime || 0,
      airport: record.fields.airport,
      approvedFlightStipend: record.fields.approvedFlightStipend || false,
      moveInDate: record.fields["move-in-date"] || null,
      gaveFeedback: record.fields.gavefeedback || false,
      starAvg: Number(record.fields.starAvg) || 0,
      hideJakeTheDog: record.fields.hideJakeTheDog || false,
      isIRL: record.fields.isIRL || false,
      weightedGrantsContribution: record.fields.weightedGrantsContribution || 0,
      age: record.fields.Age || null,
      flightBookedHome: record.fields.flightBookedHome || false,
      independenceProgram: record.fields.independenceProgram || false,
      // Return flight specific fields
      hasNoFlight: true, // For now, everyone has no flight
      flightDetails: null,
      returnFlightReason: null
    }));

    // Categorize participants
    const categorizedParticipants = {
      notBooked: participants.filter(p => p.hasNoFlight && !p.independenceProgram),
      booked: participants.filter(p => !p.hasNoFlight && !p.independenceProgram),
      independenceProgram: participants.filter(p => p.independenceProgram)
    };

    return res.status(200).json({ 
      participants: categorizedParticipants,
      summary: {
        total: participants.length,
        notBooked: categorizedParticipants.notBooked.length,
        booked: categorizedParticipants.booked.length,
        independenceProgram: categorizedParticipants.independenceProgram.length
      }
    });
  } catch (error) {
    console.error("Error fetching return flight participants:", error);
    return res.status(500).json({ message: "Error fetching return flight participants" });
  }
} 
*/