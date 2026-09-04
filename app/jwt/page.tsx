import type { Metadata } from "next";
import { IconKey } from "@tabler/icons-react";
import Nav from "@/components/Nav";
import JwtTool from "./JwtTool";

export const metadata: Metadata = {
  title: "JWT Decoder | FormatBox",
  description: "Giải mã JWT — xem header, payload, claims và trạng thái hết hạn.",
};

export default function Page() {
  return (
    <>
      <Nav />
      <div className="page" style={{ maxWidth: 1100 }}>
        <h1 className="page-title">
          <IconKey size={22} stroke={1.8} /> JWT <span>Decoder</span>
        </h1>
        <p className="sub">Paste token → giải mã header + payload + claims. Không verify signature.</p>
        <JwtTool />
      </div>
      <footer className="ft-slim">&copy; 2026 FormatBox</footer>
    </>
  );
}
