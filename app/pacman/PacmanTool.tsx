"use client";
import { useI18n } from "@/lib/i18n";
import { IconHeartFilled, IconPlayerPlay, IconRefresh, IconTrophy } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Maze legend: # wall, . dot, o power, T tunnel, - ghost door, G ghost spawn, P pacman spawn
// Every row is exactly 27 characters.
const MAZE: string[] = [
  "###########################",
  "#............#............#",
  "#.####.#####.#.#####.####.#",
  "#o####.#####.#.#####.####o#",
  "#.####.#####.#.#####.####.#",
  "#.........................#",
  "#.####.##.#######.##.####.#",
  "#......##....#....##......#",
  "######.##### # #####.######",
  "     #.##         ##.#     ",
  "######.## ###-### ##.######",
  "T     .   # GGG #   .     T",
  "######.## ####### ##.######",
  "     #.##         ##.#     ",
  "######.##### # #####.######",
  "#............#............#",
  "#.####.#####.#.#####.####.#",
  "#o..##......P........##..o#",
  "###.##.##.#######.##.##.###",
  "#......##....#....##......#",
  "#.####.####.#.#.####.####.#",
  "#.........................#",
  "###########################",
];
if (MAZE.some((r) => r.length !== 27)) {
  // eslint-disable-next-line no-console
  console.warn("Pac-Man maze rows must be 27 chars", MAZE.map((r) => r.length));
}

const COLS = 27;
const ROWS = MAZE.length;

type Dir = { x: number; y: number; k: string };
const D_LEFT: Dir = { x: -1, y: 0, k: "L" };
const D_RIGHT: Dir = { x: 1, y: 0, k: "R" };
const D_UP: Dir = { x: 0, y: -1, k: "U" };
const D_DOWN: Dir = { x: 0, y: 1, k: "D" };
const DIRS = [D_LEFT, D_RIGHT, D_UP, D_DOWN];

const GHOST_COLORS = ["#ff2b3e", "#ff9dc7", "#00e0ff", "#ffb84a"];
const BEST_KEY = "fb-pacman-best";
const PAC_SPEED = 7; // cells/sec
const GHOST_SPEED = 6;
const GHOST_FRIGHT_SPEED = 3.6;
const GHOST_EATEN_SPEED = 11;

type Cell = { wall: boolean; dot: boolean; power: boolean; door: boolean; tunnel: boolean };

function buildGrid() {
  const grid: Cell[][] = [];
  const ghostSpawns: [number, number][] = [];
  let pacSpawn: [number, number] = [13, 17];
  for (let y = 0; y < ROWS; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < COLS; x++) {
      const c = MAZE[y][x];
      const cell: Cell = { wall: false, dot: false, power: false, door: false, tunnel: false };
      if (c === "#") cell.wall = true;
      else if (c === ".") cell.dot = true;
      else if (c === "o") cell.power = true;
      else if (c === "-") cell.door = true;
      else if (c === "T") cell.tunnel = true;
      else if (c === "G") ghostSpawns.push([x, y]);
      else if (c === "P") pacSpawn = [x, y];
      row.push(cell);
    }
    grid.push(row);
  }
  while (ghostSpawns.length < 4) ghostSpawns.push([13, 10]);
  return { grid, ghostSpawns: ghostSpawns.slice(0, 4), pacSpawn };
}

type Pac = { x: number; y: number; dir: Dir; next: Dir; mouth: number };
type Ghost = {
  x: number;
  y: number;
  dir: Dir;
  queuedDir?: Dir;
  lastCx: number;
  lastCy: number;
  color: string;
  home: [number, number];
  frightened: number;
  eaten: boolean;
};

const REV: Record<string, Dir> = { L: D_RIGHT, R: D_LEFT, U: D_DOWN, D: D_UP };

type Phase = "menu" | "playing" | "over" | "win";

export default function PacmanTool() {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  const phaseRef = useRef<Phase>("menu");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stateRef = useRef({
    grid: [] as Cell[][],
    ghosts: [] as Ghost[],
    pac: { x: 13, y: 17, dir: D_LEFT, next: D_LEFT, mouth: 0 } as Pac,
    dots: 0,
    tick: 0,
    ghostSpawns: [] as [number, number][],
    pacSpawn: [13, 17] as [number, number],
    scoreLocal: 0,
  });

  const canWalk = useCallback((x: number, y: number, isGhost = false) => {
    if (y < 0 || y >= ROWS) return false;
    const g = stateRef.current.grid;
    const w = ((x % COLS) + COLS) % COLS;
    const cell = g[y]?.[w];
    if (!cell) return false;
    if (cell.wall) return false;
    if (cell.door && !isGhost) return false;
    return true;
  }, []);

  const reset = useCallback((fullReset: boolean) => {
    const { grid, ghostSpawns, pacSpawn } = buildGrid();
    const dots = grid.flat().filter((c) => c.dot || c.power).length;
    stateRef.current = {
      grid,
      ghosts: ghostSpawns.map((h, i) => ({
        x: h[0],
        y: h[1],
        dir: D_UP,
        queuedDir: undefined,
        lastCx: h[0],
        lastCy: h[1],
        color: GHOST_COLORS[i % 4],
        home: h,
        frightened: 0,
        eaten: false,
      })),
      pac: { x: pacSpawn[0], y: pacSpawn[1], dir: D_LEFT, next: D_LEFT, mouth: 0 },
      dots,
      tick: 0,
      ghostSpawns,
      pacSpawn,
      scoreLocal: fullReset ? 0 : stateRef.current.scoreLocal,
    };
    if (fullReset) {
      setScore(0);
      setLives(3);
      setLevel(1);
    }
  }, []);

  useEffect(() => {
    const b = Number(localStorage.getItem(BEST_KEY) || 0);
    setBest(isFinite(b) ? b : 0);
    reset(true);
  }, [reset]);

  const start = useCallback(() => {
    reset(true);
    setPhase("playing");
  }, [reset]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: D_LEFT,
        ArrowRight: D_RIGHT,
        ArrowUp: D_UP,
        ArrowDown: D_DOWN,
        a: D_LEFT,
        A: D_LEFT,
        d: D_RIGHT,
        D: D_RIGHT,
        w: D_UP,
        W: D_UP,
        s: D_DOWN,
        S: D_DOWN,
      };
      if (map[e.key]) {
        e.preventDefault();
        stateRef.current.pac.next = map[e.key];
        if (phaseRef.current !== "playing") start();
      } else if ((e.key === " " || e.key === "Enter") && phaseRef.current !== "playing") {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [start]);

  // Touch swipe
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    let sx = 0;
    let sy = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const t0 = e.changedTouches[0];
      const dx = t0.clientX - sx;
      const dy = t0.clientY - sy;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        stateRef.current.pac.next = dx > 0 ? D_RIGHT : D_LEFT;
      } else {
        stateRef.current.pac.next = dy > 0 ? D_DOWN : D_UP;
      }
    };
    c.addEventListener("touchstart", onStart, { passive: true });
    c.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      c.removeEventListener("touchstart", onStart);
      c.removeEventListener("touchend", onEnd);
    };
  }, []);

  // Main loop (smooth, dt-based)
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const moveEntity = (
      ex: number,
      ey: number,
      dir: Dir,
      speed: number,
      dt: number,
      isGhost: boolean,
      tryNext?: Dir,
    ): { x: number; y: number; dir: Dir; hitWall: boolean } => {
      const cx = Math.round(ex);
      const cy = Math.round(ey);
      const atCenterX = Math.abs(ex - cx) < 0.02;
      const atCenterY = Math.abs(ey - cy) < 0.02;
      let d = dir;

      // Attempt to switch to the queued direction when aligned on the
      // perpendicular axis and the target cell is walkable.
      if (tryNext && tryNext.k !== dir.k) {
        const aligned = (tryNext.x !== 0 && atCenterY) || (tryNext.y !== 0 && atCenterX);
        if (aligned && canWalk(cx + tryNext.x, cy + tryNext.y, isGhost)) {
          d = tryNext;
          if (tryNext.x !== 0) ey = cy;
          else ex = cx;
        }
      }

      const step = speed * dt;
      let nx = ex + d.x * step;
      let ny = ey + d.y * step;
      let hitWall = false;

      // Stop at the current cell center whenever the next cell along the
      // motion axis is blocked. This clamps position at the axis center
      // instead of allowing overshoot + snap-back (which produced jitter).
      if (d.x !== 0 && !canWalk(cx + d.x, cy, isGhost)) {
        if (d.x > 0 && nx > cx) {
          nx = cx;
          hitWall = true;
        } else if (d.x < 0 && nx < cx) {
          nx = cx;
          hitWall = true;
        }
      }
      if (d.y !== 0 && !canWalk(cx, cy + d.y, isGhost)) {
        if (d.y > 0 && ny > cy) {
          ny = cy;
          hitWall = true;
        } else if (d.y < 0 && ny < cy) {
          ny = cy;
          hitWall = true;
        }
      }

      // Tunnel wrap (tunnel rows only — but harmless everywhere).
      if (nx < -0.5) nx += COLS;
      if (nx > COLS - 0.5) nx -= COLS;

      return { x: nx, y: ny, dir: d, hitWall };
    };

    const update = (dt: number) => {
      const s = stateRef.current;
      s.tick += dt;

      // Pac-Man
      const pac = s.pac;
      const moved = moveEntity(pac.x, pac.y, pac.dir, PAC_SPEED, dt, false, pac.next);
      pac.x = moved.x;
      pac.y = moved.y;
      pac.dir = moved.dir;
      pac.mouth += moved.hitWall ? 0 : dt * 10;

      // Eat: consume whatever is on Pac-Man's current cell.
      const pcx = ((Math.round(pac.x) % COLS) + COLS) % COLS;
      const pcy = Math.round(pac.y);
      const cell = s.grid[pcy]?.[pcx];
      if (cell?.dot) {
        cell.dot = false;
        s.dots--;
        s.scoreLocal += 10;
        setScore(s.scoreLocal);
      }
      if (cell?.power) {
        cell.power = false;
        s.dots--;
        s.scoreLocal += 50;
        setScore(s.scoreLocal);
        const dur = 7;
        s.ghosts.forEach((g) => {
          if (!g.eaten) g.frightened = dur;
        });
      }

      // Ghosts — decide direction whenever the ghost enters a new cell or
      // is stopped by a wall. Between those moments, motion continues along
      // the current direction, which reads as chasing rather than random.
      s.ghosts.forEach((g, gi) => {
        if (g.frightened > 0) g.frightened = Math.max(0, g.frightened - dt);
        const sp = g.eaten ? GHOST_EATEN_SPEED : g.frightened > 0 ? GHOST_FRIGHT_SPEED : GHOST_SPEED;
        const mv = moveEntity(g.x, g.y, g.dir, sp, dt, true, g.queuedDir);
        g.x = mv.x;
        g.y = mv.y;
        if (g.queuedDir && mv.dir.k === g.queuedDir.k) g.queuedDir = undefined;
        g.dir = mv.dir;

        const gcx = Math.round(g.x);
        const gcy = Math.round(g.y);

        if (g.eaten && gcx === g.home[0] && gcy === g.home[1]) {
          g.eaten = false;
          g.frightened = 0;
        }

        const cellChanged = gcx !== g.lastCx || gcy !== g.lastCy;
        if (!cellChanged && !mv.hitWall) return;
        g.lastCx = gcx;
        g.lastCy = gcy;

        const opts: Dir[] = [];
        for (const d of DIRS) {
          if (d.x === -g.dir.x && d.y === -g.dir.y) continue;
          if (canWalk(gcx + d.x, gcy + d.y, true)) opts.push(d);
        }

        let choice: Dir;
        if (opts.length === 0) {
          choice = REV[g.dir.k];
        } else if (opts.length === 1) {
          choice = opts[0];
        } else if (g.frightened > 0 && !g.eaten) {
          choice = opts[Math.floor(Math.random() * opts.length)];
        } else {
          let tx: number;
          let ty: number;
          if (g.eaten) {
            tx = g.home[0];
            ty = g.home[1];
          } else {
            // Per-ghost personality (Blinky / Pinky / Inky / Clyde-ish).
            const p = pac;
            const off =
              gi === 0
                ? [0, 0]
                : gi === 1
                ? [p.dir.x * 4, p.dir.y * 4]
                : gi === 2
                ? [p.dir.x * 2, p.dir.y * 2]
                : [-p.dir.x * 4, -p.dir.y * 4];
            tx = p.x + off[0];
            ty = p.y + off[1];
          }
          let bestOpt = opts[0];
          let bestD = Infinity;
          for (const d of opts) {
            const dd = Math.hypot(gcx + d.x - tx, gcy + d.y - ty);
            if (dd < bestD) {
              bestD = dd;
              bestOpt = d;
            }
          }
          choice = bestOpt;
        }

        // Queue the choice so moveEntity applies it exactly at the cell
        // center. If we just hit a wall, snap the direction immediately so
        // the ghost isn't stuck for a frame.
        if (mv.hitWall) g.dir = choice;
        else g.queuedDir = choice;
      });

      // Collisions
      for (const g of s.ghosts) {
        if (Math.abs(g.x - pac.x) < 0.6 && Math.abs(g.y - pac.y) < 0.6) {
          if (g.frightened > 0 && !g.eaten) {
            g.eaten = true;
            g.frightened = 0;
            s.scoreLocal += 200;
            setScore(s.scoreLocal);
          } else if (!g.eaten) {
            setLives((l) => {
              const nl = l - 1;
              if (nl <= 0) {
                setPhase("over");
                setBest((b) => {
                  const nb = Math.max(b, s.scoreLocal);
                  localStorage.setItem(BEST_KEY, String(nb));
                  return nb;
                });
              } else {
                const [px, py] = s.pacSpawn;
                s.pac.x = px;
                s.pac.y = py;
                s.pac.dir = D_LEFT;
                s.pac.next = D_LEFT;
                s.ghosts.forEach((gh, i) => {
                  const [hx, hy] = s.ghostSpawns[i];
                  gh.x = hx;
                  gh.y = hy;
                  gh.lastCx = hx;
                  gh.lastCy = hy;
                  gh.frightened = 0;
                  gh.eaten = false;
                  gh.dir = D_UP;
                  gh.queuedDir = undefined;
                });
              }
              return nl;
            });
            return;
          }
        }
      }

      if (s.dots <= 0) {
        setLevel((l) => l + 1);
        setPhase("win");
        setBest((b) => {
          const nb = Math.max(b, s.scoreLocal);
          localStorage.setItem(BEST_KEY, String(nb));
          return nb;
        });
      }
    };

    const draw = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const W = c.clientWidth;
      const H = c.clientHeight;
      if (c.width !== W * dpr || c.height !== H * dpr) {
        c.width = W * dpr;
        c.height = H * dpr;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cell = Math.min(W / COLS, H / ROWS);
      const offX = (W - cell * COLS) / 2;
      const offY = (H - cell * ROWS) / 2;
      const s = stateRef.current;

      // Walls / dots
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cx = offX + x * cell;
          const cy = offY + y * cell;
          const g = s.grid[y]?.[x];
          if (!g) continue;
          if (g.wall) {
            ctx.fillStyle = "#0e1a5a";
            ctx.fillRect(cx, cy, cell, cell);
            ctx.strokeStyle = "#4a63ff";
            ctx.lineWidth = Math.max(1, cell * 0.09);
            ctx.strokeRect(cx + 2, cy + 2, cell - 4, cell - 4);
          } else if (g.door) {
            ctx.fillStyle = "#ff9dc7";
            ctx.fillRect(cx, cy + cell * 0.45, cell, cell * 0.1);
          } else if (g.dot) {
            ctx.fillStyle = "#ffd6a6";
            ctx.beginPath();
            ctx.arc(cx + cell / 2, cy + cell / 2, Math.max(1.2, cell * 0.09), 0, Math.PI * 2);
            ctx.fill();
          } else if (g.power) {
            const pulse = 0.28 + 0.1 * Math.sin(s.tick * 6);
            ctx.fillStyle = "#ffd6a6";
            ctx.beginPath();
            ctx.arc(cx + cell / 2, cy + cell / 2, cell * pulse, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Pac-Man
      const p = s.pac;
      const px = offX + (p.x + 0.5) * cell;
      const py = offY + (p.y + 0.5) * cell;
      const angle = p.dir.x === 1 ? 0 : p.dir.x === -1 ? Math.PI : p.dir.y === -1 ? -Math.PI / 2 : Math.PI / 2;
      const mouth = 0.08 + 0.22 * Math.abs(Math.sin(p.mouth));
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = "#ffdc3c";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cell * 0.46, mouth * Math.PI, (2 - mouth) * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Ghosts
      for (const g of s.ghosts) {
        const gx = offX + (g.x + 0.5) * cell;
        const gy = offY + (g.y + 0.5) * cell;
        const r = cell * 0.44;
        let color = g.color;
        if (g.eaten) color = "rgba(255,255,255,0.12)";
        else if (g.frightened > 0)
          color = g.frightened < 2 && Math.floor(g.frightened * 8) % 2 === 0 ? "#ffffff" : "#2b4dff";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(gx, gy - cell * 0.05, r, Math.PI, 0);
        ctx.lineTo(gx + r, gy + r * 0.85);
        for (let i = 0; i < 3; i++) {
          const step = r / 1.5;
          ctx.lineTo(gx + r - step * (i * 2 + 1), gy + r * 0.55);
          ctx.lineTo(gx + r - step * (i * 2 + 2), gy + r * 0.85);
        }
        ctx.closePath();
        ctx.fill();
        // eyes
        const eyeR = cell * 0.11;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(gx - r * 0.35, gy - cell * 0.05, eyeR, 0, Math.PI * 2);
        ctx.arc(gx + r * 0.25, gy - cell * 0.05, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = g.eaten ? "#0b1450" : "#0b1450";
        const pxo = g.dir.x * eyeR * 0.4;
        const pyo = g.dir.y * eyeR * 0.4;
        ctx.beginPath();
        ctx.arc(gx - r * 0.35 + pxo, gy - cell * 0.05 + pyo, eyeR * 0.55, 0, Math.PI * 2);
        ctx.arc(gx + r * 0.25 + pxo, gy - cell * 0.05 + pyo, eyeR * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05;
      if (phaseRef.current === "playing") update(dt);
      draw();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canWalk]);

  return (
    <div className="pm-root" ref={wrapRef}>
      <div className="pm-hud">
        <div className="pm-stat pm-score">
          <span>{t("pacman_score")}</span>
          <b>{score.toLocaleString()}</b>
        </div>
        <div className="pm-stat pm-best">
          <span>
            <IconTrophy size={13} stroke={2.2} /> {t("pacman_best")}
          </span>
          <b>{best.toLocaleString()}</b>
        </div>
        <div className="pm-stat">
          <span>{t("pacman_level")}</span>
          <b>{level}</b>
        </div>
        <div className="pm-stat pm-lives-stat">
          <span>{t("pacman_lives")}</span>
          <div className="pm-lives">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <IconHeartFilled key={i} size={16} color="#ff4d6d" />
            ))}
          </div>
        </div>
        <button className="pm-btn" onClick={start} type="button">
          {phase === "playing" ? (
            <>
              <IconRefresh size={16} stroke={2} /> {t("pacman_restart")}
            </>
          ) : (
            <>
              <IconPlayerPlay size={16} stroke={2} /> {t("pacman_start")}
            </>
          )}
        </button>
      </div>

      <div className="pm-stage">
        <canvas ref={canvasRef} className="pm-canvas" />
        {phase !== "playing" && (
          <div className="pm-overlay">
            <div className="pm-overlay-title">
              {phase === "menu" && t("pacman_ready")}
              {phase === "over" && t("pacman_gameover")}
              {phase === "win" && t("pacman_win")}
            </div>
            {phase === "over" && score > 0 && score >= best && (
              <div className="pm-overlay-sub">{t("pacman_new_best")}</div>
            )}
            <button className="pm-btn pm-btn-lg" onClick={start} type="button">
              <IconPlayerPlay size={18} stroke={2} />
              {phase === "menu" ? t("pacman_start") : t("pacman_restart")}
            </button>
            <div className="pm-hint">{t("pacman_hint")}</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .pm-root {
          --pm-h: calc(100dvh - 200px);
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
          height: var(--pm-h);
          width: 100%;
        }
        .pm-hud {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 6px;
          background: linear-gradient(180deg, rgba(74, 99, 255, 0.08), transparent);
          border: 1px solid var(--border);
          border-radius: 12px;
          flex-shrink: 0;
        }
        .pm-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6px 14px;
          background: rgba(11, 20, 80, 0.35);
          border: 1px solid rgba(74, 99, 255, 0.35);
          border-radius: 10px;
          min-width: 78px;
          line-height: 1.15;
        }
        .pm-stat span {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #a9b3ff;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }
        .pm-stat b {
          font-size: 18px;
          color: #ffdc3c;
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          letter-spacing: 0.4px;
        }
        .pm-score b {
          color: #ffdc3c;
        }
        .pm-best b {
          color: #ffb84a;
        }
        .pm-lives-stat {
          padding: 4px 14px 6px;
        }
        .pm-lives {
          display: flex;
          gap: 3px;
          margin-top: 3px;
          min-height: 18px;
          align-items: center;
        }
        .pm-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          background: #ffdc3c;
          color: #111;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: transform 0.08s ease, box-shadow 0.15s ease;
          box-shadow: 0 4px 14px rgba(255, 220, 60, 0.25);
        }
        .pm-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(255, 220, 60, 0.4);
        }
        .pm-btn-lg {
          padding: 12px 26px;
          font-size: 15px;
        }
        .pm-stage {
          position: relative;
          flex: 1;
          width: 100%;
          background: #000;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          min-height: 0;
        }
        .pm-canvas {
          width: 100%;
          height: 100%;
          display: block;
          touch-action: none;
        }
        .pm-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          padding: 20px;
          text-align: center;
          backdrop-filter: blur(2px);
        }
        .pm-overlay-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffdc3c;
        }
        .pm-overlay-sub {
          color: #ff9dc7;
          font-size: 13px;
          font-weight: 700;
        }
        .pm-hint {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
