import Airtable from "airtable";

const base = new Airtable({
  apiKey: process.env.NEIGHBORHOOD_AIRTABLE_API_KEY,
}).base(process.env.NEIGHBORHOOD_AIRTABLE_BASE_ID);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reviewRecordId } = req.query;

  if (!reviewRecordId) {
    return res.status(400).json({ message: 'reviewRecordId is required' });
  }

  try {
    const record = await base("ReviewAssignment").find(reviewRecordId);
    if (!record) {
      return res.status(404).json({ message: 'ReviewAssignment not found' });
    }
    const safeFields = Object.fromEntries(
      Object.entries(record.fields).filter(
        ([key]) => !["reviewerEmail", "reviewedNeighborEmail"].includes(key)
      )
    )
    res.status(200).json({
      contributor: Array.isArray(record.fields.reviewedNeighborSlackHandle)
        ? record.fields.reviewedNeighborSlackHandle[0]
        : record.fields.reviewedNeighborSlackHandle || record.fields.reviewedNeighbor || null,
      app: Array.isArray(record.fields.projectName)
        ? record.fields.projectName[0]
        : record.fields.projectName || record.fields.reviewedApp || null,
      projectName: Array.isArray(record.fields.projectName)
        ? record.fields.projectName[0]
        : record.fields.projectName || null,
      neighborSlackId: Array.isArray(record.fields.reviewedNeighborSlackId)
        ? record.fields.reviewedNeighborSlackId[0]
        : record.fields.reviewedNeighborSlackId || null,
      reviewedApp: Array.isArray(record.fields.reviewedApp)
        ? record.fields.reviewedApp[0]
        : record.fields.reviewedApp || null,
      recordFields: record.fields
    });
  } catch (error) {
    console.error('Error fetching review assignment:', error);
    res.status(500).json({ message: 'Failed to fetch review assignment' });
  }
} 