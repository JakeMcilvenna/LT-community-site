import type { SVGProps } from "react";

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <g fill="currentColor">
        <path d="m10.7 11.9 3.2-2.1-1 26.7-2.5 2.1.3-26.7Z" opacity="0.7" />
        <path d="m19.1 10.2 3-1.4-.7 28.5-2.8 1.3.5-28.4Z" opacity="0.74" />
        <path d="m27.3 10.7 3.4-1.7-1.1 28.4-2.7 1.2.4-27.9Z" opacity="0.68" />
        <path d="m35.3 12 3.1-1.6-.7 25.8-2.8 2 .4-26.2Z" opacity="0.72" />
        <path d="M7.2 38.5 38.8 8.8l2.4 3L9.6 41.2l-2.4-2.7Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeLinecap="square">
        <path d="m11.8 12.4-.5 23.1m8.9-24.1-.4 24.5m8.8-24.1-.5 24.2m8.4-22.7-.4 21.9" strokeWidth="0.65" opacity="0.35" />
        <path d="M8.8 40.2 40 10.9" strokeWidth="0.8" opacity="0.42" />
        <path d="m13.2 20.1-2.8 2.5m11-5.1-3 2.7m11.4 7.1-3 2.8m11.1-10-3.1 2.7" strokeWidth="0.75" opacity="0.32" />
      </g>
    </svg>
  );
}
