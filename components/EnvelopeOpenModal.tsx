"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { fireConfetti } from "@/components/ConfettiBurst";

type EnvelopeOpenModalProps = {
  open: boolean;
  amountVnd: number;
  onAnimationDone: () => void;
};

type Phase = "idle" | "wiggle" | "tear" | "open" | "reveal";

const ANIMATION_TIMING = {
  wiggle: 20,
  tear: 1050,
  open: 2250,
  reveal: 3400,
  confetti: 3600,
  done: 6300,
} as const;

export default function EnvelopeOpenModal({ open, amountVnd, onAnimationDone }: EnvelopeOpenModalProps) {
  const [phase, setPhase] = useState<Phase>(open ? "wiggle" : "idle");
  const confettiTriggered = useRef(false);

  useEffect(() => {
    if (!open) {
      confettiTriggered.current = false;
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase("wiggle"), ANIMATION_TIMING.wiggle));
    timers.push(setTimeout(() => setPhase("tear"), ANIMATION_TIMING.tear));
    timers.push(setTimeout(() => setPhase("open"), ANIMATION_TIMING.open));
    timers.push(setTimeout(() => setPhase("reveal"), ANIMATION_TIMING.reveal));
    timers.push(
      setTimeout(() => {
        if (!confettiTriggered.current) {
          fireConfetti(amountVnd);
          confettiTriggered.current = true;
        }
      }, ANIMATION_TIMING.confetti),
    );
    timers.push(setTimeout(() => onAnimationDone(), ANIMATION_TIMING.done));

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [amountVnd, onAnimationDone, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#300306]/85 p-3 backdrop-blur-sm sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.92, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            className="relative mx-auto my-3 w-full max-w-[22rem] rounded-2xl border border-[#ffcf72]/45 bg-gradient-to-b from-[#7e090b]/95 to-[#5f0408]/95 p-4 text-center shadow-2xl sm:my-4 sm:max-w-md sm:p-6"
          >
            <p className="mb-2 text-sm font-semibold tracking-[0.18em] text-[#ffd992] sm:mb-3 sm:tracking-[0.25em]">
              KHAI BAO LI XI
            </p>
            <div className="relative mx-auto h-[310px] w-[230px]">
              <motion.div
                className="absolute left-[38px] top-[20px] z-40 h-11 w-11 rounded-full border border-[#ffe9bc] bg-gradient-to-b from-[#ffe7ad] to-[#e8b443] shadow-lg"
                animate={
                  phase === "wiggle"
                    ? { rotate: [0, -8, 8, -6, 6, 0], x: [0, -1, 1, 0] }
                    : phase === "tear"
                      ? { x: 110, y: -35, rotate: 50, opacity: 0 }
                      : { rotate: 0, x: 0, y: 0, opacity: 1 }
                }
                transition={{ duration: phase === "tear" ? 0.55 : 0.9 }}
              />

              <div className="absolute inset-x-0 bottom-0 z-10 mx-auto h-[220px] w-[230px] rounded-b-xl border border-[#ffc96f]/50 bg-gradient-to-b from-[#b61818] via-[#940f13] to-[#7a090f] shadow-xl" />

              <motion.div
                className="absolute inset-x-0 top-[66px] z-30 mx-auto h-[120px] w-[230px] origin-top rounded-t-xl border border-[#ffcf79]/55 bg-gradient-to-b from-[#d62a29] to-[#9c1216]"
                animate={phase === "open" || phase === "reveal" ? { rotateX: -154, y: -10 } : { rotateX: 0, y: 0 }}
                transition={{ duration: 0.68, ease: [0.32, 0.72, 0, 1] }}
                style={{ transformPerspective: 860 }}
              />

              <motion.div
                initial={{ y: 118, opacity: 0 }}
                animate={phase === "reveal" ? { y: -12, opacity: 1 } : { y: 118, opacity: 0 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-0 top-[118px] z-20 mx-auto h-[160px] w-[170px] rounded-xl border border-[#ffd892]/80 bg-gradient-to-b from-[#fff2d7] to-[#f8dbab] px-3 py-4 text-[#7a1111] shadow-lg"
              >
                <p className="text-xs font-semibold tracking-[0.16em]">CHUC MUNG NAM MOI</p>
                <p className="mt-4 text-3xl font-extrabold text-[#af1616]">
                  {amountVnd.toLocaleString("vi-VN")}đ
                </p>
                <p className="mt-2 text-xs font-semibold tracking-wide">Tai loc day nha</p>
              </motion.div>
            </div>

            <p className="mt-3 text-sm text-[#f7dab0] sm:mt-4">Dang mo phong bao...</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
