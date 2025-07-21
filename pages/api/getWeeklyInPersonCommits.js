import { cleanString } from "../../lib/airtable";
import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  try {
    // Get current week's date range
const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0); // Start of week (Monday)
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of week (Sunday)
    
    // Format dates for Airtable formula
    const startDateStr = startOfWeek.toISOString();
    const endDateStr = endOfWeek.toISOString();
    
    // First, get all in-person neighbors
    const neighborRecords = await base("Neighbors")
      .select({
        filterByFormula: `{isIRL} = 1`,
      })
      .all();

    // Create a map to store commits by slackId
    const commitsByUser = {};
    
    // For each in-person neighbor, get their commits for this week
    for (const neighbor of neighborRecords) {
      const slackId = neighbor.fields["Slack ID (from slackNeighbor)"];
      if (!slackId || typeof slackId !== "string") continue;
      
      // Fetch commits for this user within the date range
      const commitRecords = await base('Commits').select({
        filterByFormula: `AND(
          {slackId} = '${cleanString(slackId)}',
          IS_AFTER({commitTime}, '${startDateStr}'),
          IS_BEFORE({commitTime}, '${endDateStr}')
        )`,
        sort: [{ field: 'commitTime', direction: 'desc' }]
      }).all();
      
      // Calculate total duration
      const commits = commitRecords.map(record => {
        // Handle different formats of duration field
        let duration = 0;
        if (Array.isArray(record.fields.duration)) {
          duration = record.fields.duration[0] || 0;
        } else if (typeof record.fields.duration === 'number') {
          duration = record.fields.duration;
        } else if (typeof record.fields.duration === 'string') {
          duration = parseFloat(record.fields.duration) || 0;
        }
        
        return {
          commitId: record.id,
          message: record.fields.message || '',
          videoLink: record.fields['videoLink'] || '',
          duration: duration,
          commitTime: record.fields['commitTime'] || '',
          appName: record.fields.appName || '',
        };
      });
      
      // Calculate total minutes
      const totalMinutes = commits.reduce((total, commit) => total + commit.duration, 0);

      // Store in our map
      commitsByUser[slackId] = {
        slackId,
        fullName: neighbor.fields["Slack Handle (from slackNeighbor)"] || null,
        slackFullName: neighbor.fields["Slack Handle (from slackNeighbor)"] || null,
        pfp: neighbor.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null,
        commits,
        totalMinutes
      };
    }
    
    // Convert to array and sort by total minutes
    const result = Object.values(commitsByUser);
    
    res.status(200).json({ 
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      users: result 
    });
  } catch (error) {
    console.error('Error fetching weekly in-person commits:', error);
    res.status(500).json({ message: 'Failed to fetch weekly commits', error: error.message });
  }
} 