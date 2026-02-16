import confetti from "canvas-confetti";

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export function fireConfetti(amountVnd: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const tier = clamp(Math.floor(amountVnd / 50000), 1, 8);
  const particleCount = 28 + tier * 8;

  confetti({
    particleCount,
    spread: 80,
    startVelocity: 32,
    gravity: 1,
    scalar: 0.85,
    origin: { x: 0.3, y: 0.68 },
    colors: ["#ffd36d", "#f7bc45", "#e7232f", "#fff2ce"],
  });

  setTimeout(() => {
    confetti({
      particleCount: Math.floor(particleCount * 0.75),
      spread: 96,
      startVelocity: 28,
      gravity: 0.95,
      scalar: 0.82,
      origin: { x: 0.7, y: 0.7 },
      colors: ["#ffd36d", "#f7bc45", "#e7232f", "#fff2ce"],
    });
  }, 180);
}
