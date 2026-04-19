import { useState, useEffect, useRef } from "react";

function parseTarget(value: string): { num: number; prefix: string; suffix: string } {
  const match = value.match(/^([^0-9]*)([0-9,]+(?:\.[0-9]+)?)([^0-9]*)$/);
  if (!match) {
    return { num: 0, prefix: "", suffix: "" };
  }
  const prefix = match[1] || "";
  const numStr = match[2].replace(/,/g, "");
  const suffix = match[3] || "";
  return { num: parseFloat(numStr), prefix, suffix };
}

export function useCountUp(target: string, duration = 2000) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const { num, prefix, suffix } = parseTarget(target);
            const startTime = performance.now();

            const animate = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutQuart = 1 - Math.pow(1 - progress, 4);
              const current = Math.round(num * easeOutQuart);

              const formatted = current.toLocaleString("en-US");
              setDisplay(`${prefix}${formatted}${suffix}`);

              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };

            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { display, ref };
}
