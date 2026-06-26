"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreCircleProps {
  score: number;
  grade: string;
  size?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-text-success";
  if (score >= 60) return "text-text-info";
  if (score >= 40) return "text-text-warning";
  return "text-text-error";
}

function getStrokeColor(score: number): string {
  if (score >= 80) return "#18AD4F";
  if (score >= 60) return "#1169DB";
  if (score >= 40) return "#F2870D";
  return "#E24C3C";
}

function getTrackColor(score: number): string {
  if (score >= 80) return "rgba(24,173,79,0.15)";
  if (score >= 60) return "rgba(17,105,219,0.15)";
  if (score >= 40) return "rgba(242,135,13,0.15)";
  return "rgba(226,76,60,0.15)";
}

export function ScoreCircle({
  score,
  grade,
  size = 120,
  className,
}: ScoreCircleProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    let rafId: number;
    const duration = 1000;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - pct, 3);
      setAnimatedScore(Math.round(eased * score));
      if (pct < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getTrackColor(score)}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      {/* Grade + Score inside */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-[2rem] font-bold leading-none",
            getScoreColor(score)
          )}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}
