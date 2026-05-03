import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip
} from "recharts";
import { motion } from "framer-motion";

const API = process.env.REACT_APP_API_URL || "http://localhost:3000";
const socket = io(API);

function App() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const prevStock = useRef({});

  // sound
  const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(res => res.json())
      .then(setProducts);

    socket.on("update", (data) => {
      // detect new restocks → play sound
      data.forEach(p => {
        if (p.inStock && !prevStock.current[p.tcin]) {
          audio.play().catch(() => {});
        }
        prevStock.current[p.tcin] = p.inStock;
      });

      setProducts(data);
    });

    return () => socket.off("update");
  }, []);

  async function loadHistory(tcin) {
    const res = await fetch(`${API}/api/history/${tcin}`);
    const data = await res.json();

    setHistory(
      data.map(p => ({
        time: new Date(p.time).toLocaleTimeString(),
        stock: p.inStock ? 1 : 0
      }))
    );
  }

  const filtered = products
    .filter(p => {
      if (filter === "in") return p.inStock;
      if (filter === "out") return !p.inStock;
      return true;
    })
    .filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>🔥 Pokémon Stock Terminal</h1>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.input}
        />

        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("in")}>In Stock</button>
        <button onClick={() => setFilter("out")}>Out of Stock</button>
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {filtered.map(p => (
          <motion.div
            key={p.tcin}
            whileHover={{ scale: 1.05 }}
            style={{
              ...styles.card,
              borderColor: p.inStock ? "#00ff88" : "#333"
            }}
            onClick={() => {
              setSelected(p);
              loadHistory(p.tcin);
            }}
          >
            <h3>{p.title}</h3>

            <p style={{
              color: p.inStock ? "#00ff88" : "#ff4444"
            }}>
              {p.inStock ? "IN STOCK" : "OUT OF STOCK"}
            </p>

            <p>{p.lastChecked}</p>

            <a href={p.link} target="_blank" rel="noreferrer">
              Open
            </a>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {selected && (
        <div style={styles.chartBox}>
          <h2>{selected.title}</h2>

          <LineChart width={700} height={300} data={history}>
            <XAxis dataKey="time" stroke="#aaa" />
            <YAxis domain={[0, 1]} stroke="#aaa" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="stock"
              stroke="#00ff88"
            />
          </LineChart>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "#0d0d0d",
    color: "white",
    minHeight: "100vh",
    padding: 20
  },
  title: {
    fontSize: 32
  },
  controls: {
    marginBottom: 20,
    display: "flex",
    gap: 10
  },
  input: {
    padding: 8,
    background: "#222",
    color: "white",
    border: "1px solid #333"
  },
  grid: {
    display: "flex",
    flexWrap: "wrap"
  },
  card: {
    width: 260,
    padding: 15,
    margin: 10,
    border: "1px solid #333",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    cursor: "pointer"
  },
  chartBox: {
    marginTop: 40
  }
};

export default App;