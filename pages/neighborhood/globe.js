import Head from "next/head";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Canvas, useLoader, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import { EffectComposer, Pixelation } from "@react-three/postprocessing";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useRouter } from "next/router";

// Tri-color shader: black, white, and red
const tricolorShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      // If the color is "red enough", let it through
      if (color.r > 0.7 && color.g < 0.3 && color.b < 0.3) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
      }
      float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      float bw = step(0.5, luminance);
      gl_FragColor = vec4(vec3(bw), 1.0);
    }
  `
};

function Globe({ globeRef }) {
  const texture = useLoader(THREE.TextureLoader, '/textures/earth.jpg');
  // Create custom shader material
  const shaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture }
    },
    vertexShader: tricolorShader.vertexShader,
    fragmentShader: tricolorShader.fragmentShader
  });

  return (
    <Sphere ref={globeRef} args={[1, 64, 64]}>
      <primitive object={shaderMaterial} attach="material" />
    </Sphere>
  );
}

function GlobeOutline() {
  // Slightly larger sphere for outline
  return (
    <Sphere args={[1.008, 64, 64]}>
      <meshBasicMaterial color="black" side={THREE.BackSide} />
    </Sphere>
  );
}

// Helper to convert lat/lon to 3D position on sphere
function latLonToVec3(lat, lon, radius = 1.001) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  ];
}

function BlinkingDot({ position, onClick, interactive, color = "red" }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    // Animate scale with a sine wave for blinking effect
    const t = clock.getElapsedTime();
    const scale = Math.abs(Math.sin(t * 2)); // between 0 and 1.0
    if (meshRef.current) {
      // Make red dots 50% smaller and yellow dots 30% smaller than green
      const baseSize = color === "red" 
        ? 0.0075 
        : color === "#ffff00" 
          ? 0.0105  // 30% smaller than 0.015
          : 0.015;
      meshRef.current.scale.set(scale * baseSize, scale * baseSize, scale * baseSize);
    }
  });
  // Cursor pointer handlers
  const handlePointerOver = () => {
    if (interactive) document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = () => {
    if (interactive) document.body.style.cursor = 'default';
  };
  return (
    <Sphere
      ref={meshRef}
      args={[1, 16, 16]} // Changed to 1 since we're controlling size through scale
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <meshBasicMaterial color={color} />
    </Sphere>
  );
}

function AirportDots({ neighbors, airportsData }) {
  const router = useRouter();
  
  // Group neighbors by airport
  const airportGroups = neighbors.reduce((groups, neighbor) => {
    if (!neighbor.airport) return groups;
    const code = neighbor.airport.toUpperCase();
    if (!groups[code]) {
      groups[code] = [];
    }
    groups[code].push(neighbor);
    return groups;
  }, {});

  // Helper to calculate offset position
  const calculateOffsetPosition = (basePosition, index, total) => {
    if (total <= 1) return basePosition;
    
    // Calculate angle for this dot (evenly spread in a circle)
    const angle = (index / total) * Math.PI * 2;
    // Small radius for the circle of dots (adjust this value to change spread)
    const radius = 0.01;
    
    // Calculate offset in the tangent plane
    const offsetX = Math.cos(angle) * radius;
    const offsetZ = Math.sin(angle) * radius;
    
    // Create a temporary vector for the base position
    const pos = new THREE.Vector3(...basePosition);
    // Create a temporary vector for the offset
    const offset = new THREE.Vector3(offsetX, 0, offsetZ);
    
    // Project the offset onto the sphere's surface
    const normal = pos.clone().normalize();
    const tangent = offset.clone().sub(normal.multiplyScalar(offset.dot(normal)));
    const finalPos = pos.clone().add(tangent).normalize();
    
    return [finalPos.x, finalPos.y, finalPos.z];
  };

  return Object.entries(airportGroups).map(([code, airportNeighbors]) => {
    // Find airport data
    let airport = Object.values(airportsData).find(
      a => a.iata?.toUpperCase() === code || a.icao?.toUpperCase() === code
    );
    if (!airport || !airport.lat || !airport.lon) return null;

    // Get base position for this airport
    const basePosition = latLonToVec3(Number(airport.lat), Number(airport.lon));
    
    // Create dots for each neighbor at this airport
    return airportNeighbors.map((neighbor, index) => (
      <BlinkingDot
        key={neighbor.slackId}
        position={calculateOffsetPosition(basePosition, index, airportNeighbors.length)}
        onClick={() => router.push(`/neighborhood/${neighbor.slackId}`)}
        interactive={true}
        color={
          neighbor.approvedFlightStipend 
            ? "#00ff00" 
            : neighbor.totalTimeHackatimeHours >= 100 
              ? "#ffff00" 
              : "red"
        }
      />
    ));
  }).flat().filter(Boolean);
}

export default function GlobePage() {
  const breadcrumbItems = [
    { label: "Adventure Time", href: "/" },
    { label: "Neighborhood", href: "/neighborhood" },
    { label: "Globe", href: "/neighborhood/globe" }
  ];
  const globeRef = useRef();
  const [neighbors, setNeighbors] = useState([]);
  const [airportsData, setAirportsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/getNeighborsSecurely")
      .then((res) => res.json())
      .then((data) => setNeighbors(data.neighbors || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/airports.json")
      .then((res) => res.json())
      .then((data) => setAirportsData(data));
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, [loading]);

  const loadingDots = ['   ', '.  ', '.. ', '...'];

  return (
    <>
      <Head>
        <title>Globe - Adventure Time</title>
        <meta name="description" content="Globe view of adventures" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔️</text></svg>" />
      </Head>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
          <Breadcrumbs items={breadcrumbItems} />
        </div>
        <div style={{ width: '100vw', height: '100vh' }}>
          {loading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',width:'100vw'}}>
              <p style={{fontSize:'1.5rem'}}>fetching the neighbors{loadingDots[loadingStep]}</p>
            </div>
          ) : (
            <Canvas camera={{ position: [0, 0, 2.5] }} style={{ width: '100vw', height: '100vh' }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} />
              <GlobeOutline />
              <Globe globeRef={globeRef} />
              <AirportDots neighbors={neighbors} airportsData={airportsData} />
              <OrbitControls 
                enableZoom={true}
                enablePan={false}
                minDistance={1.5}
                maxDistance={5}
              />
              <EffectComposer>
                <Pixelation granularity={6} />
              </EffectComposer>
            </Canvas>
          )}
        </div>
      </div>
    </>
  );
}