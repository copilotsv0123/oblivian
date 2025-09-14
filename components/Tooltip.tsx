"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  className?: string;
  delay?: number;
}

export default function Tooltip({
  children,
  content,
  className = "",
  delay = 0,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        showTooltip(e);
      }, delay);
    } else {
      showTooltip(e);
    }
  };

  const showTooltip = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 5,
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={elementRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={`fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg ${className}`}
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {content}
          <div
            className="absolute w-2 h-2 bg-gray-900 rotate-45"
            style={{
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          />
        </div>
      )}
    </>
  );
}
