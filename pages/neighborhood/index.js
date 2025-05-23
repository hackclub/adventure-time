import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function Neighborhood() {
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState('largestLogged');

  useEffect(() => {
    const fetchNeighbors = async () => {
      try {
        const response = await fetch('/api/getNeighborsSecurely');
        const data = await response.json();
        // Filter out neighbors without names or Slack handles
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
  }, []);

  const sortedNeighbors = [...neighbors].sort((a, b) => {
    if (sortType === 'largestLogged') {
      return b.totalTimeHackatimeHours - a.totalTimeHackatimeHours;
    } else if (sortType === 'smallestLogged') {
      return a.totalTimeHackatimeHours - b.totalTimeHackatimeHours;
    } else if (sortType === 'largestChecked') {
      return b.totalCheckedTime - a.totalCheckedTime;
    } else if (sortType === 'smallestChecked') {
      return a.totalCheckedTime - b.totalCheckedTime;
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
          </select>
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
                {" "}({neighbor.totalTimeHackatimeHours}hr logged)
                  <span> ({(neighbor.totalCheckedTime).toFixed(1)}hr checked)</span>
                
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
} 