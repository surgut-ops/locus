export const listStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const listItemReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: 'easeOut' as const,
    },
  },
};

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -6,
    scale: 1.03,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const imageScale = {
  rest: { scale: 1 },
  hover: {
    scale: 1.08,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};
