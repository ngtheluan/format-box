"use client";
import { IconDeviceGamepad2, IconFeather, IconLayoutGrid } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import AdminBody from "../../AdminBody";

const FlappyBirdTool = dynamic(() => import("./FlappyBirdTool"), { ssr: false });

export default function Page() {
  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Gameplay", href: "/admin/gameplay", icon: <IconDeviceGamepad2 size={13} stroke={1.8} /> },
        { label: "Flappy Bird", icon: <IconFeather size={13} stroke={1.8} />, current: true },
      ]}
      title="Flappy Bird"
    >
      <FlappyBirdTool />
    </AdminBody>
  );
}
