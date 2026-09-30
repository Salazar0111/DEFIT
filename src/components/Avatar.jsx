import { motion } from "motion/react";
import { avatarSrc } from "../lib/avatars";

export default function Avatar({ id, mood, size = 40, ring = false, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.9, rotate: -6 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      aria-label="Avatar"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        padding: ring ? 2 : 0,
        background: ring ? "linear-gradient(145deg, var(--accent), var(--accent-strong))" : "transparent",
        boxShadow: ring ? "0 6px 18px color-mix(in srgb, var(--accent) 35%, transparent)" : "none",
        flexShrink: 0,
        pointerEvents: onClick ? "auto" : "none",
      }}
    >
      <img
        src={avatarSrc(id, mood)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ width: "100%", height: "100%", display: "block", borderRadius: "50%" }}
      />
    </motion.button>
  );
}
