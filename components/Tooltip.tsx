"use client";

import clsx from "clsx";
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
          className={clsx(
            'pointer-events-none fixed z-50 rounded-lg border border-border/60 bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg transition-colors',
            className,
          )}
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <div
            className="absolute h-3 w-3 rotate-45 border border-border/60 bg-popover"
            style={{
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}
    </>
  );
}
