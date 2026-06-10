# Motion for React Reference Documentation

- **Official docs**: https://motion.dev/docs/react-quick-start
- **GitHub**: https://github.com/motiondivision/motion
- **Version**: Latest (as of 2026-06)
- **Install**: `npm i motion`
- **Import**: `import { motion, AnimatePresence } from "motion/react"`

> ⚠️ **Rebrand**: Formerly "Framer Motion" (`framer-motion` package). Now published as `motion`.

## Core API

### motion Components

```tsx
import { motion } from "motion/react";

<motion.div layout />            {/* auto-animate layout changes */}
<motion.button />                {/* any HTML element */}
<motion.circle />                {/* any SVG element */}
<motion.ul animate={{ rotate: 360 }} />
```

### Props

```tsx
// Basic animation
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
/>

// Disable entrance animation
<motion.div initial={false} animate={{ scale: 1 }} />

// Gestures
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  onHoverStart={() => console.log('hover started!')}
/>

// Scroll-triggered
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
/>

// Drag
<motion.div drag />
<motion.div drag="x" />           {/* horizontal only */}
<motion.div dragConstraints={{ left: 0, right: 100 }} />
```

### AnimatePresence — Exit Animations

```tsx
import { AnimatePresence } from "motion/react";

<AnimatePresence mode="wait">
  {show ? (
    <motion.div
      key="box"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -50 }}
    />
  ) : null}
</AnimatePresence>
```

### Layout Animations

```tsx
// Auto-animate position/size changes
<motion.div layout />

// Shared element transitions across components
<motion.div layoutId="shared-element" />

// Group layout animations
<motion.div layout>
  <motion.div layout />
  <motion.div layout />
</motion.div>
```

### Hooks

```tsx
import { useScroll, useTransform, useSpring, useDragControls } from "motion/react";

// Scroll-linked animation
const { scrollYProgress } = useScroll();
const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });
return <motion.div style={{ scaleX }} />;

// Value transformation
const x = useMotionValue(0);
const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);

// Drag controls
const dragControls = useDragControls();
<motion.div dragControls={dragControls} drag />
<button onPointerDown={(e) => dragControls.start(e)}>Drag Handle</button>

// Reduced motion
import { useReducedMotion } from "motion/react";
const shouldReduceMotion = useReducedMotion();
```

### Transition Options

```tsx
<motion.div
  animate={{ scale: 2 }}
  transition={{
    duration: 2,
    ease: "easeInOut",
    type: "spring",    // spring or tween
    stiffness: 100,
    damping: 10,
    delay: 0.5,
    repeat: Infinity,
    repeatType: "reverse",
  }}
/>
```

**Key behavior:**
- Physical properties (`x`, `y`, `scale`, `rotate`) → spring by default
- Visual properties (`opacity`, `color`) → tween by default
- Override with `type: "spring"` or `type: "tween"`

### Performance

- Web Animations API for native 120fps browser animations
- Falls back to JavaScript for spring physics, interruptible keyframes, gesture tracking
- "Fully tree-shakable so you only include what you import"
- Use `useReducedMotion()` to respect `prefers-reduced-motion`
