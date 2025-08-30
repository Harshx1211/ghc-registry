import QRCode from "qrcode.react";

export default function QRCodeCertificate({ data }) {
  // In a real app, this would link to a block explorer / on-chain proof page
  const url = `https://example.org/cert/${data?.tokenId}?lot=${data?.lotId}`;
  const text = JSON.stringify({ url, ...data });
  return (
    <div style={{border:"1px solid #e2e2e2", padding:16, borderRadius:12}}>
      <h4>Retirement Certificate</h4>
      <div style={{display:"flex", gap:16, alignItems:"center"}}>
        <QRCode value={text} size={128} />
        <div>
          <div><b>Token:</b> {data.tokenId}</div>
          <div><b>Lot:</b> {data.lotId}</div>
          <div><b>Owner:</b> {data.owner}</div>
          <div><b>Qty (kg):</b> {data.qtyKg}</div>
          <div><b>Purpose:</b> {data.purpose}</div>
          <div><b>Invoice:</b> {data.invoiceId}</div>
          <div><b>Timestamp:</b> {new Date(data.ts).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
