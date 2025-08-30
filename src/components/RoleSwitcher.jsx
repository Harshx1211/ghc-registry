import styles from "../styles/Navbar.module.css";
import { useRegistry } from "../store/RegistryContext.jsx";

export default function RoleSwitcher() {
  const { account, setAccount, connectWallet } = useRegistry();

  const setRole = (role) => {
    const map = {
      producer: "0xProducer...DEMO",
      certifier: "0xCertifier...DEMO",
      buyer: "0xBuyer...DEMO",
      regulator: "0xRegulator...DEMO",
    };
    setAccount(map[role]);
  };

  return (
    <div className={styles.rolebox}>
      <select onChange={(e)=>setRole(e.target.value)} defaultValue="producer">
        <option value="producer">Producer</option>
        <option value="certifier">Certifier</option>
        <option value="buyer">Buyer</option>
        <option value="regulator">Regulator</option>
      </select>
      <button onClick={connectWallet} className={styles.walletBtn}>
        {account ? "Connected" : "Connect"}
      </button>
    </div>
  );
}
