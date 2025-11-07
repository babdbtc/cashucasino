"use client";

import { useEffect, useState, useRef } from 'react';

interface BallProps {
  path: number[]; // Array of 0s and 1s (0=left, 1=right)
  onComplete: () => void;
  multiplier: number;
}

const Ball = ({ path, onComplete, multiplier }: BallProps) => {
  const [position, setPosition] = useState({ x: 300, y: 20 });
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const pathRef = useRef(path);
  const onCompleteRef = useRef(onComplete);

  // Update refs when props change (but don't restart animation)
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Animation only runs once on mount
  useEffect(() => {
    completedRef.current = false;

    const pegSpacing = 35;
    const rowHeight = 35;
    const startX = 300;
    const startY = 20;

    let currentStep = 0;
    let currentX = startX;
    let currentY = startY;
    let targetX = startX;
    let targetY = startY;
    let progress = 0;
    let lastTime = performance.now();
    const stepDuration = 150; // Time in milliseconds per step (consistent across all devices)

    const animate = (currentTime: number) => {
      if (completedRef.current) return;

      // Calculate delta time (time since last frame)
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Time-based progress increment (consistent speed on all devices)
      progress += deltaTime / stepDuration;

      if (progress >= 1) {
        // Move to next step
        currentX = targetX;
        currentY = targetY;
        currentStep++;

        if (currentStep > 16) {
          // Reached bottom
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(() => {
              setVisible(false);
              onCompleteRef.current();
            }, 200);
          }
          return;
        }

        // Calculate next target
        targetY = startY + currentStep * rowHeight;

        if (currentStep <= 16) {
          const move = pathRef.current[currentStep - 1];
          if (move === 1) {
            targetX += pegSpacing / 2;
          } else {
            targetX -= pegSpacing / 2;
          }
        }

        progress = 0;
      }

      // Smooth easing
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const x = currentX + (targetX - currentX) * easeProgress;
      const y = currentY + (targetY - currentY) * easeProgress;

      setPosition({ x, y });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    targetY = startY + rowHeight;
    const firstMove = pathRef.current[0];
    targetX = startX + (firstMove === 1 ? pegSpacing / 2 : -pegSpacing / 2);
    currentStep = 1;
    progress = 0;

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount

  if (!visible) return null;

  return (
    <circle
      cx={position.x}
      cy={position.y}
      r={7}
      fill="url(#ballGradient)"
      filter="url(#ballGlow)"
    />
  );
};

export default Ball;
