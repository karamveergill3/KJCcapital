"use client";

import { useCallback } from "react";

export default function Reveal({ as = "div", delay = 0, className = "", children, ...rest }) {
  // Visibility is a class on a DOM node, not application state, so this is a
  // ref callback rather than an effect holding useState: nothing here needs a
  // re-render, and the observer disconnects through the returned cleanup.
  // Safe because every caller passes a static className; React only rewrites
  // the attribute when its own computed value changes, which it never does.
  const observe = useCallback((node) => {
    if (!node) return undefined;
    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const Tag = as;
  const delayClass = delay ? `delay-${delay}` : "";
  return (
    <Tag ref={observe} className={`fade-up ${delayClass} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
