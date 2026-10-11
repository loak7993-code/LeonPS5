import { AnimatePresence, motion } from "motion/react";
import { GameArt } from "./Art";
import { iconUrl, type Game } from "./api";

function Ribbons() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="ribbon-a absolute top-[16%] left-[-20%] h-[300px] w-[140%] opacity-[0.16]"
        viewBox="0 0 1440 300"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ribbon-main" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2f6bff" stopOpacity="0" />
            <stop offset="0.22" stopColor="#2f6bff" />
            <stop offset="0.72" stopColor="#3fa9c9" />
            <stop offset="1" stopColor="#3fa9c9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 150 C 220 40 420 250 700 150 S 1180 40 1440 150"
          stroke="url(#ribbon-main)"
          strokeWidth="2.5"
        />
        <path
          d="M0 190 C 260 90 460 280 740 190 S 1220 96 1440 190"
          stroke="url(#ribbon-main)"
          strokeWidth="1.2"
          opacity="0.55"
        />
      </svg>
      <svg
        className="ribbon-b absolute top-[58%] left-[-20%] h-[260px] w-[140%] opacity-[0.1]"
        viewBox="0 0 1440 260"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 130 C 240 40 460 210 740 130 S 1200 40 1440 130"
          stroke="url(#ribbon-main)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function GlowHaze() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(48vw 36vw at -6% -10%, rgba(47,107,255,0.13), transparent 70%), radial-gradient(52vw 40vw at 106% 108%, rgba(63,169,201,0.09), transparent 70%)",
      }}
    />
  );
}

type BackdropProps = { game: Game | null };

function ArtBackdrop({ game }: BackdropProps) {
  return (
    <AnimatePresence mode="popLayout">
      {game && (
        <motion.div
          key={game.id}
          className="absolute -inset-32"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        >
          {game.hasIcon ? (
            <img
              src={iconUrl(game.id)}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
              style={{ filter: "blur(64px) brightness(0.5) saturate(1.25)" }}
            />
          ) : (
            <div className="h-full w-full" style={{ filter: "blur(64px) brightness(0.5) saturate(1.25)" }}>
              <GameArt id={game.id} title={game.title} className="h-full w-full" />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Background({ game }: BackdropProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "var(--color-canvas)" }}>
      <ArtBackdrop game={game} />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(7,11,28,0.55) 0%, rgba(7,11,28,0.25) 40%, rgba(7,11,28,0.82) 100%)",
        }}
      />
      <GlowHaze />
      <Ribbons />
    </div>
  );
}
