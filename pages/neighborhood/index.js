import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Neighborhood() {
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('largestLogged');
  const [showOnlyApprovedFlights, setShowOnlyApprovedFlights] = useState(false);
  const [showOnlyNoFeedback, setShowOnlyNoFeedback] = useState(false);

  useEffect(() => {
    const fetchNeighbors = async () => {
      try {
        const response = await fetch(`/api/getNeighborsSecurely?showOnlyApprovedFlights=${showOnlyApprovedFlights}&showOnlyNoFeedback=${showOnlyNoFeedback}`);
        const data = await response.json();
        const filteredNeighbors = data.neighbors.filter(
          neighbor => neighbor.fullName || neighbor.slackFullName
        );
        setNeighbors(filteredNeighbors);
      } catch (err) {
        setError('Failed to load neighbors');
        console.error('Error fetching neighbors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighbors();
  }, [showOnlyApprovedFlights, showOnlyNoFeedback]);

  const sortedNeighbors = [...neighbors].sort((a, b) => {
    if (sortType === 'largestLogged') {
      return b.totalTimeHackatimeHours - a.totalTimeHackatimeHours;
    } else if (sortType === 'smallestLogged') {
      return a.totalTimeHackatimeHours - b.totalTimeHackatimeHours;
    } else if (sortType === 'largestChecked') {
      return b.totalCheckedTime - a.totalCheckedTime;
    } else if (sortType === 'smallestChecked') {
      return a.totalCheckedTime - b.totalCheckedTime;
    } else if (sortType === 'highestRating') {
      const ratingA = a.starAvg || 0;
      const ratingB = b.starAvg || 0;
      return ratingB - ratingA;
    }
    return 0;
  });

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" }
  ];

  return (
    <>
      <Head>
        <title>Neighborhood - Adventure Time</title>
        <meta name="description" content="Browse contributors in the neighborhood" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Neighborhood</h1>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="sortType">Sort by: </label>
          <select
            id="sortType"
            value={sortType}
            onChange={e => setSortType(e.target.value)}
          >
            <option value="largestLogged">Largest logged hours</option>
            <option value="smallestLogged">Smallest logged hours</option>
            <option value="largestChecked">Largest checked hours</option>
            <option value="smallestChecked">Smallest checked hours</option>
            <option value="highestRating">Highest review rating</option>
          </select>
          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={showOnlyApprovedFlights}
                onChange={e => setShowOnlyApprovedFlights(e.target.checked)}
              />
              Show Only Approved For Flights
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={showOnlyNoFeedback}
                onChange={e => setShowOnlyNoFeedback(e.target.checked)}
              />
              Show Only Neighbors Without Feedback
            </label>
          </div>
        </div>
        
        {loading && <p>Loading neighbors...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && (
          <ol>
            {sortedNeighbors.map((neighbor) => (
              <li key={neighbor.id}>
                <Link href={`/neighborhood/${neighbor.slackId}`}>
                  {neighbor.fullName || neighbor.slackFullName || neighbor.slackId || "unnamed"}
                </Link>
                {" "}({neighbor.totalTimeCombinedHours}hr logged)
                <span> ({(neighbor.totalCheckedTime).toFixed(1)}hr checked)</span>
                {neighbor.approvedFlightStipend && neighbor.moveInDate && ` (✈️ to SFO ${new Date(neighbor.moveInDate).toLocaleDateString()})`}
                {neighbor.gaveFeedback && " (💬 received admin feedback)"}
                {neighbor.starAvg > 0 && ` (${neighbor.starAvg.toFixed(1)} ${'⭐'.repeat(Math.floor(neighbor.starAvg))}${neighbor.starAvg % 1 >= 0.5 ? '⭐️' : ''}${'☆'.repeat(5 - Math.ceil(neighbor.starAvg))})`}
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
