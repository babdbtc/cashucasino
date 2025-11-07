'use client';

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface GameCardProps {
  title: string;
  description: string;
  imageSrc?: string;
  link: string;
  emojis?: string[];
}

const GameCard: React.FC<GameCardProps> = ({ title, description, imageSrc, link, emojis }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePosition({ x, y });
  };

  return (
    <Link href={link} className="block group perspective-1000">
      <div
        className="relative transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
        onMouseMove={handleMouseMove}
        style={{
          transform: `rotateX(${(mousePosition.y - 0.5) * 10}deg) rotateY(${(mousePosition.x - 0.5) * -10}deg)`,
        }}
      >
        {/* Glowing border effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 animate-gradient bg-[length:200%_auto]" />

        {/* Card container */}
        <div className="relative glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 dark:border-white/5">
          {/* Image section with overlay gradient */}
          <div className="relative w-full h-56 overflow-hidden bg-gradient-to-br from-purple-900/40 to-pink-900/40">
            {imageSrc && (
              <Image
                src={imageSrc}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-2"
              />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Animated sparkles */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: `${15 + i * 18}%`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple flex items-center justify-center shadow-neon-purple transform group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Content section */}
          <div className="p-6 relative">
            {/* Animated line */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

            <h3 className="text-2xl font-black mb-3 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-blue bg-clip-text text-transparent group-hover:animate-gradient bg-[length:200%_auto]">
              {title}
            </h3>

            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
              {description}
            </p>

            {/* Play now button */}
            <div className="flex items-center gap-2 text-neon-blue group-hover:text-neon-pink transition-colors duration-300 font-semibold">
              <span>Play Now</span>
              <svg className="w-4 h-4 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>

            {/* Corner accent */}
            <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-neon-purple/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
        </div>
      </div>
    </Link>
  );
};

export default GameCard;
