"use client";
import { IconDeviceGamepad2, IconGhost2, IconLayoutGrid } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import AdminBody from "../../AdminBody";

const PacmanTool = dynamic(() => import("./PacmanTool"), { ssr: false });

export default function Page() {
  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Gameplay", href: "/admin/gameplay", icon: <IconDeviceGamepad2 size={13} stroke={1.8} /> },
        { label: "Pac-Man", icon: <IconGhost2 size={13} stroke={1.8} />, current: true },
      ]}
      title="Pac-Man"
    >
      <PacmanTool />
    </AdminBody>
  );
}
