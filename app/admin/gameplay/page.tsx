"use client";
import { IconArrowRight, IconDeviceGamepad2, IconFeather, IconGhost2, IconLayoutGrid, IconPlayerPlayFilled } from "@tabler/icons-react";
import Link from "next/link";
import AdminBody from "../AdminBody";

type Game = {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  tag: string;
  gradient: string;
  accent: string;
};

const GAMES: Game[] = [
  {
    href: "/admin/gameplay/pacman",
    title: "Pac-Man",
    desc: "Game cổ điển — mũi tên/WASD, né ma, ăn hết chấm vàng.",
    icon: <IconGhost2 size={40} stroke={1.6} />,
    tag: "Arcade",
    gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
    accent: "#FFD93D",
  },
  {
    href: "/admin/gameplay/flappy-bird",
    title: "Flappy Bird",
    desc: "Chạm hoặc space để bay vượt qua những ống xanh.",
    icon: <IconFeather size={40} stroke={1.6} />,
    tag: "Casual",
    gradient: "linear-gradient(135deg, #4FC3F7 0%, #7E57C2 100%)",
    accent: "#4FC3F7",
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
      description="Chọn một game để bắt đầu chơi."
    >
      <div className="gp-grid">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="gp-card" style={{ ["--card-accent" as any]: g.accent }}>
            <div className="gp-cover" style={{ background: g.gradient }}>
              <span className="gp-tag">{g.tag}</span>
              <span className="gp-cover-icon">{g.icon}</span>
              <span className="gp-play">
                <IconPlayerPlayFilled size={14} />
                Chơi ngay
              </span>
            </div>
            <div className="gp-body">
              <div className="gp-title">
                <b>{g.title}</b>
                <IconArrowRight size={16} stroke={2} className="gp-arrow" />
              </div>
              <span className="gp-desc">{g.desc}</span>
            </div>
          </Link>
        ))}
      </div>

      <style jsx>{`
        .gp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 14px;
        }
        .gp-card {
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--panel);
          color: var(--text);
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }
        .gp-card:hover {
          transform: translateY(-3px);
          border-color: var(--card-accent);
          box-shadow: 0 10px 24px -12px color-mix(in srgb, var(--card-accent) 60%, transparent);
        }
        .gp-card:hover .gp-arrow {
          transform: translateX(3px);
          color: var(--card-accent);
        }
        .gp-card:hover .gp-cover-icon {
          transform: scale(1.08) rotate(-4deg);
        }
        .gp-cover {
          position: relative;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          overflow: hidden;
        }
        .gp-cover::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.25) 0, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.18) 0, transparent 45%);
        }
        .gp-cover-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: transform 0.25s ease;
        }
        .gp-tag {
          position: absolute;
          top: 10px;
          left: 10px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          backdrop-filter: blur(4px);
        }
        .gp-play {
          position: absolute;
          top: 10px;
          right: 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          color: #111;
        }
        .gp-body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .gp-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .gp-title b {
          font-size: 15px;
          font-weight: 600;
        }
        .gp-arrow {
          opacity: 0.5;
          transition: transform 0.18s ease, color 0.18s ease, opacity 0.18s ease;
        }
        .gp-card:hover .gp-arrow {
          opacity: 1;
        }
        .gp-desc {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.45;
        }
      `}</style>
    </AdminBody>
  );
}
