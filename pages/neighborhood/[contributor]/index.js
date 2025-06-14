import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ContributorPage() {
  const router = useRouter();
  const { contributor } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appHours, setAppHours] = useState({});
  const [numberOfWeightedGrants, setNumberOfWeightedGrants] = useState(0);
  const [commits, setCommits] = useState([]);
  const [commitsLoading, setCommitsLoading] = useState(true);

  useEffect(() => {
    const fetchNeighborDetails = async () => {
      if (!contributor) return;

      try {
        const response = await fetch(`/api/getNeighborDetails?slackId=${contributor}`);
        if (!response.ok) {
          throw new Error('Failed to fetch neighbor details');
        }
        const data = await response.json();
        setData(data);
        setNumberOfWeightedGrants((parseFloat(data.neighbor?.grantedHours) || 0) / 10);
      } catch (err) {
        setError('Failed to load neighbor details');
        console.error('Error fetching neighbor details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNeighborDetails();
  }, [contributor]);

  useEffect(() => {
    const fetchCommits = async () => {
      if (!contributor) return;
      
      try {
        setCommitsLoading(true);
        const response = await fetch(`/api/getNeighborCommits?slackId=${contributor}`);
        if (!response.ok) {
          throw new Error('Failed to fetch commits');
        }
        const data = await response.json();
        setCommits(data.commits || []);
      } catch (err) {
        console.error('Error fetching commits:', err);
      } finally {
        setCommitsLoading(false);
      }
    };
    
    fetchCommits();
  }, [contributor]);

  useEffect(() => {
    if (!data?.apps) return;
    data.apps.forEach((app) => {
      if (appHours[app.name] !== undefined) return;
      setAppHours((prev) => ({ ...prev, [app.name]: { loading: true } }));
      fetch(`/api/getTotalHoursForProjectSpecificUser?slackId=${contributor}&appName=${encodeURIComponent(app.name)}`)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(result => {
          setAppHours((prev) => ({ ...prev, [app.name]: { loading: false, hours: result.totalHours } }));
        })
        .catch(() => {
          setAppHours((prev) => ({ ...prev, [app.name]: { loading: false, hours: 0 } }));
        });
    });
  }, [data?.apps]);

  const contributorPfp = data?.neighbor?.pfp;
  const contributorName = data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor || "Loading...";

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { 
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {contributorPfp && (
            <img
              src={contributorPfp}
              alt="pfp"
              style={{ width: 16, height: 16, borderRadius: '4px', marginRight: 6, border: '2px solid #fff', boxShadow: '0 0 0 1px #ccc' }}
            />
          )}
          {contributorName}
        </span>
      ), 
      href: `/neighborhood/${contributor}` 
    }
  ];

  return (
    <>
      <Head>
        <title>{data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor} - Adventure Time</title>
        <meta name="description" content={`View details for ${data?.neighbor?.fullName || data?.neighbor?.slackFullName || contributor}`} />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        
        {!loading && !error && data && (
          <>
            <h1>{data.neighbor.fullName || data.neighbor.slackFullName || "unnamed"}</h1>

            <p>Hackatime Hours: {data.neighbor.totalTimeCombinedHours}hr</p>

            <div style={{ marginBottom: '1rem' }}>
              <p>Weighted Grants Earned: 
                {[...Array(10)].map((_, index) => {
                  const fullGrants = Math.floor(numberOfWeightedGrants);
                  const decimalPart = numberOfWeightedGrants - fullGrants;
                  let opacity = 0.1;
                  
                  if (index < fullGrants) {
                    opacity = 1;
                  } else if (index === fullGrants && decimalPart > 0) {
                    opacity = 0.1 + (decimalPart * 0.9);
                  }
                  
                  return (
                    <span 
                      key={index}
                      style={{ 
                        opacity,
                        transition: 'opacity 0.3s ease'
                      }}
                    >
                      🪙
                    </span>
                  );
                })}
                <span style={{ marginLeft: '8px', color: '#666' }}>
                  ({numberOfWeightedGrants.toFixed(1)}/10.0)
                </span>
              </p>
              <p style={{ fontSize: '0.9rem', color: '#666', maxWidth: '600px' }}>
                Every weighted grant is equivalent to 10 hours spent coding that's approved and enters the final You Ship, We Ship database. To ensure your hours get accepted, commit hourly, and make devlogs every 2-4 hours. Hack Clubbers earn weighted grants by shipping their projects.
              </p>
            </div>

            <h2>Apps</h2>
            {data.apps.length > 0 ? (
              <ol>
                {data.apps.map((app) => {
                  const hoursObj = appHours[app.name];
                  return (
                    <li key={app.id}>
                      <Link href={`/neighborhood/${contributor}/${encodeURIComponent(app.name)}`}>
                        {app.name}
                      </Link>
                      {hoursObj?.loading ? (
                        <span> (loading total hours)</span>
                      ) : (
                        <span> ({hoursObj?.hours || 0} hr)</span>
                      )}
                      {" "}({app.memberCount} members)
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>No apps yet</p>
            )}
            
            {/* 
            <h2>Stopwatch Sessions</h2>
            {commitsLoading ? (
              <p>Loading stopwatch sessions...</p>
            ) : commits.length > 0 ? (
              <>
                <p style={{ fontSize: '0.9rem', color: '#666', maxWidth: '600px', marginBottom: '16px' }}>
                  These hours were logged with the Stopwatch which is subject to scrutiny and may not be approved
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {commits.map(commit => (
                    <div key={commit.commitId} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {commit.videoLink && (
                        <div>
                          <video 
                            controls 
                            src={commit.videoLink} 
                            style={{ maxWidth: '100%', maxHeight: '300px' }}
                          />
                        </div>
                      )}
                      <div>
                        <p style={{ margin: '4px 0' }}>{commit.message}</p>
                        <p style={{ margin: '4px 0', fontSize: '0.9rem', color: '#666' }}>
                          {commit.appName && <span style={{ fontWeight: 'bold' }}>{commit.appName} • </span>}
                          {new Date(commit.commitTime).toLocaleString()} • {commit.duration} minutes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p>No stopwatch sessions found</p>
            )}
            */}
          </>
        )}
      </div>
    </>
  );
}
