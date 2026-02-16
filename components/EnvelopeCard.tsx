"use client";

import { motion } from "framer-motion";

type EnvelopeCardProps = {
  index: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
};

export default function EnvelopeCard({ index, disabled = false, onSelect }: EnvelopeCardProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -4, rotate: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className="group relative mx-auto aspect-[3/4] w-full max-w-[118px] overflow-hidden rounded-xl border border-[#ffca6d]/55 bg-gradient-to-b from-[#b71717] via-[#8f0f12] to-[#6f0a0e] p-2.5 shadow-lg transition-opacity min-[400px]:max-w-[125px] sm:p-3 disabled:cursor-not-allowed disabled:opacity-55"
      onClick={() => onSelect(index)}
      style={{ transform: `rotate(${(index % 3) - 1}deg)` }}
      aria-label={`Phong bao ${index + 1}`}
    >
      <div className="absolute inset-x-0 top-0 h-[42%] border-b border-[#ffc86b]/60 bg-gradient-to-b from-[#cc2727] to-[#9f1316]" />
      <div className="absolute inset-x-0 top-[30%] mx-auto h-11 w-11 rounded-full border border-[#ffdd9c]/75 bg-gradient-to-b from-[#ffe19f] to-[#e9b13f] shadow-md" />
      <div className="absolute inset-x-0 top-[40%] text-center text-[0.66rem] font-extrabold tracking-[0.16em] text-[#7b1111]">
        LOC
      </div>
      <div className="relative z-10 mt-auto pt-[58%] text-center text-[0.73rem] font-semibold text-[#ffe9ba]">
        Li Xi {index + 1}
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent" />
      </div>
    </motion.button>
  );
}
