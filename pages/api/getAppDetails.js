import { cleanString } from "../../lib/airtable";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY_FIXED }).base(
  process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { slackId, appId } = req.query;

  if (!slackId || !appId) {
    return res.status(400).json({ message: "Missing slackId or appId" });
  }

  const nameRegex = /^[\w\s\-().,:;?!'"&+]{1,100}$/;

  if (!nameRegex.test(appId)) {
    return res.status(400).json({ message: "Invalid app name format" });
  }

  try {
    // First verify the neighbor exists and get their ID
    const neighborRecords = await base("Neighbors")
      .select({
        fields: ["Slack ID (from slackNeighbor)"],
        filterByFormula: `{Slack ID (from slackNeighbor)} = '${cleanString(slackId)}'`,
        maxRecords: 1
      })
      .firstPage();

    if (neighborRecords.length === 0) {
      return res.status(404).json({ message: "Neighbor not found" });
    }

    // Get the app details by Name (case-insensitive, trimmed)
    let appRecords = await base("Apps")
      .select({
        fields: [
          "Name",
          "Github Link",
          "App Link",
          "Description",
          "Neighbors",
          "Icon",
          "YSWS Project Submission",
          "playableURL"
        ],
        filterByFormula: `LOWER({Name}) = '${appId.toLowerCase()}'`,
        maxRecords: 1
      })
      .firstPage();

    if (appRecords.length === 0) {
      // Try a more flexible search if exact match fails
      const flexibleAppRecords = await base("Apps")
        .select({
          fields: [
            "Name",
            "Github Link",
            "App Link",
            "Description",
            "Neighbors",
            "Icon",
            "YSWS Project Submission",
            "playableURL"
          ],
          filterByFormula: `SEARCH('${appId.toLowerCase()}', LOWER({Name}))`,
          maxRecords: 1
        })
        .firstPage();

      if (flexibleAppRecords.length === 0) {
        return res.status(404).json({ message: "App not found" });
      }
      
      appRecords = flexibleAppRecords;
    }

    const app = appRecords[0];

    // Get details of all neighbors in the app
    const neighborIds = app.fields.Neighbors || [];
    let neighbors = [];
    
    if (neighborIds.length > 0) {
      try {
        const neighborDetails = await base("Neighbors")
          .select({
            fields: [
              "Slack ID (from slackNeighbor)",
              "Slack Handle (from slackNeighbor)",
              "githubUsername",
              "Pfp (from slackNeighbor)"
            ],
            filterByFormula: `OR(${neighborIds.map(id => `RECORD_ID() = '${id}'`).join(',')})`
          })
          .all();

        neighbors = neighborDetails.map(neighbor => ({
          id: neighbor.id,
          slackId: neighbor.fields["Slack ID (from slackNeighbor)"] || null,
          fullName: neighbor.fields["Slack Handle (from slackNeighbor)"]?.[0] || null,
          githubUsername: neighbor.fields.githubUsername || null,
          pfp: neighbor.fields["Pfp (from slackNeighbor)"]?.[0]?.url || null
        }));
      } catch (neighborError) {
        console.error("Error fetching neighbor details:", neighborError);
        // Continue with empty neighbors array rather than failing completely
        neighbors = [];
      }
    }

    // Prepare the response
    const response = {
      app: {
        id: app.id,
        name: app.fields.Name || "Unnamed App",
        githubLink: app.fields["Github Link"] || null,
        appLink: app.fields["App Link"] || null,
        playableURL: app.fields["playableURL"] || null,
        description: app.fields.Description || "",
        icon: app.fields.Icon ? (
          typeof app.fields.Icon === 'string' ? app.fields.Icon :
          Array.isArray(app.fields.Icon) && app.fields.Icon.length > 0 ? app.fields.Icon[0].url :
          null
        ) : null,
        yswsSubmission: app.fields["YSWS Project Submission"] || null,
        neighbors: neighbors
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching app details:", error);
    return res.status(500).json({ message: "Error fetching app details" });
  }
} 