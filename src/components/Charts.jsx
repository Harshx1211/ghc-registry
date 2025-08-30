import { CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from "recharts";

export default function Charts({ retirements=[] }) {
  // Aggregate retired kg per owner (simple demo)
  const byOwner = retirements.reduce((acc, r) => {
    acc[r.owner] = (acc[r.owner] || 0) + r.qtyKg;
    return acc;
  }, {});
  const data = Object.entries(byOwner).map(([owner, qtyKg]) => ({ owner, qtyKg, carsOffRoad: Math.round(qtyKg/200), trees: Math.round(qtyKg/20) }));

  return (
    <div style={{padding:16, border:"1px solid #e2e2e2", borderRadius:12}}>
      <h3>Impact Dashboard</h3>
      <p>CO₂ savings approximations (demo): 1 car ≈ 200 kg H₂, 1 tree ≈ 20 kg H₂ (dummy factors).</p>
      <BarChart width={700} height={320} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="owner" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="qtyKg" name="Retired (kg)" />
        <Bar dataKey="carsOffRoad" name="Cars off road (est.)" />
        <Bar dataKey="trees" name="Trees saved (est.)" />
      </BarChart>
    </div>
  );
}
