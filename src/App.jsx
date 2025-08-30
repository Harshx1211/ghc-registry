import { Routes, Route, Link } from "react-router-dom";
import styles from "./styles/App.module.css";

// Components
import Navbar from "./components/Navbar.jsx";

// Pages
import Home from "./pages/Home.jsx";
import Producer from "./pages/Producer.jsx";
import Certifier from "./pages/Certifier.jsx";
import Buyer from "./pages/Buyer.jsx";
import Regulator from "./pages/Regulator.jsx";

export default function App() {
  return (
    <div className={styles.app}>
      {/* Top Navigation */}
      <Navbar />
      
      {/* Main Content */}
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/producer" element={<Producer />} />
          <Route path="/certifier" element={<Certifier />} />
          <Route path="/buyer" element={<Buyer />} />
          <Route path="/regulator" element={<Regulator />} />
          
          {/* Fallback route */}
          <Route
            path="*"
            element={
              <div className={styles.notFound}>
                <h2>404 – Page Not Found</h2>
                <p>The page you're looking for doesn't exist.</p>
                <Link to="/" className={styles.homeLink}>
                  Go Back Home
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
      
      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} Green Hydrogen Credit System • Blockchain-Powered Carbon Credits
      </footer>
    </div>
  );
}