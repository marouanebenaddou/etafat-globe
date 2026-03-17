"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BoxesCore = ({ className, isStatic = false, ...rest }: { className?: string; isStatic?: boolean }) => {
  const rows = new Array(isStatic ? 40 : 80).fill(1);
  const cols = new Array(isStatic ? 25 : 50).fill(1);

  const colors = [
    "rgb(0 123 255)",   // etafat primary #007BFF
    "rgb(0 102 157)",   // etafat accent  #00669D
    "rgb(14 165 233)",  // sky-500
    "rgb(56 189 248)",  // sky-400
    "rgb(125 211 252)", // sky-300
    "rgb(2 132 199)",   // sky-600
    "rgb(3 105 161)",   // sky-700
    "rgb(186 230 253)", // sky-200
    "rgb(29 78 216)",   // blue-700
  ];

  const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0",
        className
      )}
      {...rest}
    >
      {rows.map((_, i) => (
        isStatic ? (
          <div key={`row` + i} className="w-16 h-8 border-l border-[#007BFF]/20 relative">
            {cols.map((_, j) => (
              <div key={`col` + j} className="w-16 h-8 border-r border-t border-[#007BFF]/20 relative">
                {j % 2 === 0 && i % 2 === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
                    className="absolute h-6 w-10 -top-[14px] -left-[22px] text-[#007BFF]/30 stroke-[1px] pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <motion.div key={`row` + i} className="w-16 h-8 border-l border-[#007BFF]/20 relative">
            {cols.map((_, j) => (
              <motion.div
                whileHover={{ backgroundColor: getRandomColor(), transition: { duration: 0 } }}
                animate={{ transition: { duration: 2 } }}
                key={`col` + j}
                className="w-16 h-8 border-r border-t border-[#007BFF]/20 relative"
              >
                {j % 2 === 0 && i % 2 === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"
                    className="absolute h-6 w-10 -top-[14px] -left-[22px] text-[#007BFF]/30 stroke-[1px] pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                ) : null}
              </motion.div>
            ))}
          </motion.div>
        )
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
