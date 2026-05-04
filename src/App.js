import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip
} from "recharts";
import { motion } from "framer-motion";

const API = "https://pokemon-backend-frsh.onrender.com";
const socket = io(API);

function App() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const prevStock = useRef({});
  const audio = useRef(new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"));

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(res => res.json())
      .then(setProducts);

    socket.on("update", (data) => {
      // detect new restocks → play sound
      data.forEach(p => {
        if (p.inStockCount > 0 && !prevStock.current[p.title]) {
          audio.current.play().catch(() => {});
        }
        prevStock.current[p.title] = p.inStockCount;
      });

      setProducts(data);
    });

    return () => socket.off("update");
  }, []);

  async function loadHistory(productTitle) {
    const res = await fetch(`${API}/api/history/${encodeURIComponent(productTitle)}`);
    const data = await res.json();

    setHistory(data);
  }

  const filtered = products
    .filter(p => {
      if (filter === "in") return p.inStockCount > 0;
      if (filter === "out") return p.inStockCount === 0;
      return true;
    })
    .filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔥 Pokémon Stock Terminal</h1>
        <p style={styles.subtitle}>Real-time inventory tracker • Last updated: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.input}
        />

        <button 
          onClick={() => setFilter("all")}
          style={filter === "all" ? styles.buttonActive : styles.button}
        >
          All
        </button>
        <button 
          onClick={() => setFilter("in")}
          style={filter === "in" ? styles.buttonActive : styles.button}
        >
          ✓ In Stock
        </button>
        <button 
          onClick={() => setFilter("out")}
          style={filter === "out" ? styles.buttonActive : styles.button}
        >
          ✗ Out of Stock
        </button>
      </div>

      {/* Grid */}
      <div style={styles.grid}>
        {filtered.map(p => (
          <motion.div
            key={p.title}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...styles.card,
              borderColor: p.inStockCount > 0 ? "rgba(0,255,136,0.6)" : "rgba(255,68,68,0.3)",
              background: p.inStockCount > 0
                ? "rgba(0,255,136,0.08)" 
                : "rgba(255,68,68,0.04)"
            }}
            onClick={() => {
              setSelected(p);
              loadHistory(p.title);
            }}
          >
            <div>
              <h3 style={styles.cardTitle}>{p.title}</h3>
              <p style={{
                ...styles.cardStatus,
                color: p.inStockCount > 0 ? "#00ff88" : "#ff4444"
              }}>
                ● {p.inStockCount}/{p.totalRetailers} IN STOCK
              </p>
              
              {/* Retailer badges */}
              <div style={styles.retailerBadges}>
                {p.retailers.map(r => (
                  <span
                    key={r.retailer}
                    style={{
                      ...styles.badge,
                      background: r.inStock ? "rgba(0,255,136,0.2)" : "rgba(255,68,68,0.1)",
                      color: r.inStock ? "#00ff88" : "#999"
                    }}
                  >
                    {r.retailer} {r.price !== "N/A" && `$${r.price}`}
                  </span>
                ))}
              </div>

              {/* Best price */}
              {p.bestPrice && (
                <p style={styles.bestPrice}>
                  Best: ${p.bestPrice.price} @ {p.bestPrice.retailer}
                </p>
              )}
            </div>

            {/* Links */}
            <div style={styles.links}>
              {p.links.map(link => (
                <a
                  key={link.retailer}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.cardLink}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(0,255,136,0.25)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,255,136,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(0,255,136,0.15)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  {link.retailer} →
                </a>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.chartBox}
        >
          <h2 style={styles.chartTitle}>{selected.title}</h2>
          <p style={{ color: "#999", marginBottom: 20, fontSize: 13 }}>
            Availability history across {selected.totalRetailers} retailers
          </p>

          {/* Retailer details */}
          <div style={styles.retailerDetails}>
            {selected.retailers.map(r => (
              <div key={r.retailer} style={styles.retailerDetail}>
                <span style={{
                  color: r.inStock ? "#00ff88" : "#999",
                  fontWeight: 600
                }}>
                  {r.inStock ? "✓" : "✗"} {r.retailer}
                </span>
                <span style={{ color: "#666", marginLeft: 10 }}>
                  {r.price !== "N/A" ? `$${r.price}` : "N/A"}
                </span>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <LineChart width={Math.min(window.innerWidth - 60, 900)} height={300} data={history}>
              <XAxis dataKey="time" stroke="#444" />
              <YAxis domain={[0, 1]} stroke="#444" />
              <Tooltip 
                contentStyle={{ 
                  background: "#1a1a2e", 
                  border: "1px solid #00ff88",
                  borderRadius: 8
                }}
              />
              <Line
                type="monotone"
                dataKey="inStockCount"
                stroke="#00ff88"
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
              />
            </LineChart>
          )}
        </motion.div>
      )}
    </div>
  );
}

const styles = {
  page: {
    background: "linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)",
    color: "white",
    minHeight: "100vh",
    padding: "40px 20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    marginBottom: 40,
    textAlign: "center"
  },
  title: {
    fontSize: 48,
    fontWeight: 700,
    background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 8,
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    letterSpacing: 0.5
  },
  controls: {
    marginBottom: 30,
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center"
  },
  input: {
    padding: "12px 16px",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    border: "1px solid rgba(0,255,136,0.3)",
    borderRadius: 8,
    fontSize: 14,
    minWidth: 250,
    transition: "all 0.3s ease",
    outline: "none",
    backdropFilter: "blur(10px)",
    "&:focus": {
      borderColor: "#00ff88",
      background: "rgba(0,255,136,0.1)"
    }
  },
  button: {
    padding: "12px 24px",
    background: "rgba(0,255,136,0.1)",
    color: "#00ff88",
    border: "1px solid rgba(0,255,136,0.4)",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.3s ease",
    cursor: "pointer",
    letterSpacing: 0.5
  },
  buttonActive: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)",
    color: "#000",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: 0.5,
    boxShadow: "0 8px 32px rgba(0,255,136,0.3)"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
    marginBottom: 40
  },
  card: {
    padding: 20,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(0,255,136,0.2)",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    lineHeight: 1.3
  },
  cardStatus: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  cardTime: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
    flex: 1
  },
  retailerBadges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap"
  },
  bestPrice: {
    fontSize: 13,
    color: "#00ff88",
    fontWeight: 600,
    margin: "8px 0 0 0"
  },
  links: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  cardLink: {
    display: "inline-block",
    padding: "8px 16px",
    background: "rgba(0,255,136,0.15)",
    color: "#00ff88",
    textDecoration: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid rgba(0,255,136,0.4)",
    transition: "all 0.3s ease",
    textAlign: "center"
  },
  chartBox: {
    marginTop: 40,
    padding: 30,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(0,255,136,0.2)",
    borderRadius: 12,
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)"
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 20,
    color: "#00ff88"
  },
  retailerDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 15,
    marginBottom: 30,
    padding: "15px 0",
    borderBottom: "1px solid rgba(0,255,136,0.2)"
  },
  retailerDetail: {
    display: "flex",
    flexDirection: "column",
    gap: 4
  }
};

export default App;