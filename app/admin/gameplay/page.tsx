"use client";
import { IconDeviceGamepad2, IconFeather, IconGhost2, IconLayoutGrid } from "@tabler/icons-react";
import Link from "next/link";
import AdminBody from "../AdminBody";

type Game = {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
};

const GAMES: Game[] = [
  {
    href: "/admin/gameplay/pacman",
    title: "Pac-Man",
    desc: "Game Pac-Man cổ điển — mũi tên/WASD, né ma, ăn hết chấm.",
    icon: <IconGhost2 size={32} stroke={1.6} />,
  },
  {
    href: "/admin/gameplay/flappy-bird",
    title: "Flappy Bird",
    desc: "Flappy Bird cổ điển — chạm/space để bay qua ống.",
    icon: <IconFeather size={32} stroke={1.6} />,
  },
];

export default function AdminGameplayPage() {
  return (
    <AdminBody
      crumbs={[
        { label: "Dashboard", href: "/admin", icon: <IconLayoutGrid size={13} stroke={1.8} /> },
        { label: "Gameplay", icon: <IconDeviceGamepad2 size={13} stroke={1.8} />, current: true },
      ]}
      title="Gameplay"
      description="Chọn một game để chơi."
    >
      <div className="gp-grid">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="gp-card">
            <span className="gp-icon">{g.icon}</span>
            <span className="gp-info">
              <b>{g.title}</b>
              <span>{g.desc}</span>
              <small>{g.href}</small>
            </span>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .gp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .gp-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--panel);
          color: var(--text);
          text-decoration: none;
          transition: border-color 0.15s, transform 0.15s;
        }
        .gp-card:hover {
          border-color: var(--accent);
          transform: translateY(-1px);
        }
        .gp-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--accent) 12%, transparent);
          color: var(--accent);
          flex-shrink: 0;
        }
        .gp-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .gp-info b {
          font-size: 15px;
        }
        .gp-info span {
          font-size: 12px;
          opacity: 0.75;
          line-height: 1.4;
        }
        .gp-info small {
          font-family: ui-monospace, monospace;
          font-size: 11px;
          opacity: 0.5;
        }
      `}</style>
    </AdminBody>
  );
}
