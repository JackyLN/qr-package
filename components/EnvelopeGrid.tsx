"use client";

import EnvelopeCard from "@/components/EnvelopeCard";

type EnvelopeGridProps = {
  envelopeCount: number;
  disabled?: boolean;
  onPick: (index: number) => void;
};

export default function EnvelopeGrid({ envelopeCount, disabled = false, onPick }: EnvelopeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5">
      {Array.from({ length: envelopeCount }, (_, index) => (
        <EnvelopeCard key={index} index={index} disabled={disabled} onSelect={onPick} />
      ))}
    </div>
  );
}
