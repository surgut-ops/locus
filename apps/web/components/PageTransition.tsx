'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.2 },
  },
};

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
