import Head from "next/head";
import { useEffect, useState, useRef } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function StarChart() {
  const [neighbors, setNeighbors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);
  const [hoveredNeighbor, setHoveredNeighbor] = useState(null);

  useEffect(() => {
    const fetchNeighbors = async () => {
      try {
        const response = await fetch(`/api/getNeighborsSecurely`);
        const data = await response.json();
        // Filter out neighbors without names/Slack handles and those with no star rating
        // NOTE: slackFullName was never going to work, anyway
        const filteredNeighbors = data.neighbors.filter(
          neighbor => (neighbor.fullName) && neighbor.starAvg > 0
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

  // Function to calculate line of best fit using least squares method
  const calculateLinearRegression = (points) => {
    if (points.length < 2) return null;
    
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let n = points.length;
    
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
      sumXY += point.x * point.y;
      sumXX += point.x * point.x;
    }
    
    // Calculate slope (m) and y-intercept (b) for y = mx + b
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  // Function to get dot color based on neighbor properties (matching globe.js)
  const getDotColor = (neighbor) => {
    if (neighbor.isIRL) {
      return '#9932CC'; // Purple for IRL users
    } else if (neighbor.approvedFlightStipend) {
      return '#00ff00'; // Green for approved flight stipends
    } else if (neighbor.totalTimeHackatimeHours >= 100) {
      return '#ffff00'; // Yellow for 100+ hours
    } else {
      return '#ff0000'; // Red for others
    }
  };

  useEffect(() => {
    if (loading || !neighbors.length || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas dimensions with device pixel ratio
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set chart dimensions
    const padding = 40;
    const chartWidth = canvas.width / dpr - (padding * 2);
    const chartHeight = canvas.height / dpr - (padding * 2);
    
    // Fixed max values as requested
    const maxTime = 100; // Cap at 100 hours
    const minStars = 1; // Minimum star rating is 1.0
    const maxStars = 5; // Maximum star rating is 5.0
    const starRange = maxStars - minStars; // Range of 4.0 stars
    
    // Draw axes
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.moveTo(padding, canvas.height / dpr - padding);
    ctx.lineTo(padding + chartWidth, canvas.height / dpr - padding);
    
    // Y-axis
    ctx.moveTo(padding, canvas.height / dpr - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.fillText('Time Spent (hours, capped at 100)', padding + chartWidth / 2, canvas.height / dpr - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, padding + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Star Rating', 0, 0);
    ctx.restore();
    
    // Draw ticks and grid lines
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // X-axis ticks - 0 to 100 in steps of 10
    for (let i = 0; i <= 10; i++) {
      const x = padding + (chartWidth / 10) * i;
      const tickValue = i * 10; // 0, 10, 20, ..., 100
      
      ctx.beginPath();
      ctx.moveTo(x, canvas.height / dpr - padding);
      ctx.lineTo(x, canvas.height / dpr - padding + 5);
      ctx.stroke();
      
      ctx.fillText(tickValue.toString(), x, canvas.height / dpr - padding + 20);
      
      // Grid lines
      ctx.beginPath();
      ctx.moveTo(x, canvas.height / dpr - padding);
      ctx.lineTo(x, padding);
      ctx.stroke();
    }
    
    // Y-axis ticks - 1 to 5 in steps of 1
    for (let i = 0; i <= 4; i++) {
      const starValue = minStars + i;
      const y = canvas.height / dpr - padding - (i / 4) * chartHeight;
      
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding - 5, y);
      ctx.stroke();
      
      ctx.textAlign = 'right';
      ctx.fillText(starValue.toString(), padding - 10, y + 4);
      
      // Grid lines
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }
    
    // Store neighbor positions for interaction and regression calculation
    const neighborPositions = [];
    const regressionPoints = [];
    
    // Plot neighbors as dots
    neighbors.forEach(neighbor => {
      // Cap time at 100 hours
      const cappedTime = Math.min(neighbor.totalTimeHackatimeHours || 0, maxTime);
      // All neighbors should have a star rating > 0 due to filtering
      const starRating = Math.max(neighbor.starAvg, minStars);
      
      const x = padding + (cappedTime / maxTime) * chartWidth;
      // Adjust y calculation to account for the 1.0 minimum
      const y = canvas.height / dpr - padding - ((starRating - minStars) / starRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = hoveredNeighbor === neighbor ? '#ff6b6b' : getDotColor(neighbor);
      ctx.fill();
      
      // Store position for interaction
      neighborPositions.push({
        neighbor,
        x,
        y,
        radius: 6
      });
      
      // Store normalized data points for regression calculation
      regressionPoints.push({
        x: cappedTime,
        y: starRating
      });
    });
    
    // Calculate and draw line of best fit
    const regression = calculateLinearRegression(regressionPoints);
    if (regression) {
      // Convert regression formula back to canvas coordinates
      const startX = padding; // Left edge of chart
      const endX = padding + chartWidth; // Right edge of chart
      
      // Calculate corresponding y values using the regression formula: y = mx + b
      // Then convert to canvas coordinates
      const startTimeValue = 0;
      const endTimeValue = maxTime;
      
      const startStarValue = regression.slope * startTimeValue + regression.intercept;
      const endStarValue = regression.slope * endTimeValue + regression.intercept;
      
      // Clamp values to the chart range
      const clampedStartStarValue = Math.max(minStars, Math.min(maxStars, startStarValue));
      const clampedEndStarValue = Math.max(minStars, Math.min(maxStars, endStarValue));
      
      const startY = canvas.height / dpr - padding - ((clampedStartStarValue - minStars) / starRange) * chartHeight;
      const endY = canvas.height / dpr - padding - ((clampedEndStarValue - minStars) / starRange) * chartHeight;
      
      // Draw the line of best fit
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = '#ff4500'; // Orange-red color
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]); // Dashed line
      ctx.stroke();
      ctx.setLineDash([]); // Reset to solid line
      
      // Add a legend for the line of best fit
      ctx.fillStyle = '#ff4500';
      ctx.fillRect(padding + chartWidth - 120, padding + 10, 10, 10);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText('Line of Best Fit', padding + chartWidth - 105, padding + 18);
      
      // Display the equation
      const slopeFormatted = regression.slope.toFixed(3);
      const interceptFormatted = regression.intercept.toFixed(2);
      const sign = regression.intercept >= 0 ? '+' : '';
      ctx.fillText(`y = ${slopeFormatted}x ${sign} ${interceptFormatted}`, padding + chartWidth - 120, padding + 38);
    }
    
    // Add a legend for dot colors
    const legendY = padding + 60;
    const legendItems = [
      { color: '#9932CC', label: 'IRL Users' },
      { color: '#00ff00', label: 'Approved Flight Stipend' },
      { color: '#ffff00', label: 'Over 100 Hours' },
      { color: '#ff0000', label: 'Others' }
    ];
    
    legendItems.forEach((item, i) => {
      const itemY = legendY + i * 20;
      ctx.fillStyle = item.color;
      ctx.fillRect(padding + chartWidth - 120, itemY, 10, 10);
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, padding + chartWidth - 105, itemY + 8);
    });
    
    // Handle mouse interactions
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;
      
      // Check if mouse is over any neighbor dot
      let found = false;
      for (const pos of neighborPositions) {
        const distance = Math.sqrt(
          Math.pow(mouseX - pos.x * dpr, 2) + 
          Math.pow(mouseY - pos.y * dpr, 2)
        );
        
        if (distance <= pos.radius * dpr) {
          setHoveredNeighbor(pos.neighbor);
          canvas.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      
      if (!found) {
        setHoveredNeighbor(null);
        canvas.style.cursor = 'default';
      }
    };
    
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;
      
      // Check if click is on any neighbor dot
      for (const pos of neighborPositions) {
        const distance = Math.sqrt(
          Math.pow(mouseX - pos.x * dpr, 2) + 
          Math.pow(mouseY - pos.y * dpr, 2)
        );
        
        if (distance <= pos.radius * dpr) {
          window.location.href = `/neighborhood/${pos.neighbor.slackId}`;
          break;
        }
      }
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [neighbors, loading, hoveredNeighbor]);

  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "Star Chart", href: "/neighborhood/starchart" }
  ];

  return (
    <>
      <Head>
        <title>Star Chart - Adventure Time</title>
        <meta name="description" content="Visualize neighbors by time spent and ratings" />
      </Head>
      <div>
        <Breadcrumbs items={breadcrumbItems} />
        <h1>Neighbor Star Chart</h1>
        <p>Each dot represents a neighbor with a star rating. X-axis shows time spent (capped at 100 hours), Y-axis shows star rating (1-5).</p>
        <p>Click on any dot to view that neighbor's profile. The dashed line shows the trend between time spent and ratings.</p>
        
        {loading && <p>Loading chart data...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && neighbors.length === 0 && (
          <p>No neighbors with ratings found.</p>
        )}
        
        <div style={{ position: 'relative', marginTop: '20px' }}>
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: '100%', 
              height: '500px', 
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          
          {hoveredNeighbor && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'white',
              border: '1px solid #ddd',
              padding: '10px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p><strong>{hoveredNeighbor.fullName || hoveredNeighbor.slackFullName || hoveredNeighbor.slackId}</strong></p>
              <p>Time: {hoveredNeighbor.totalTimeHackatimeHours > 100 ? 
                "100+ hours" : 
                hoveredNeighbor.totalTimeHackatimeHours.toFixed(1) + " hours"}</p>
              <p>Rating: {hoveredNeighbor.starAvg.toFixed(1)} ⭐</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 