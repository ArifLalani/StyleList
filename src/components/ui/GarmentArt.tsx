"use client";

import { useId, type ReactNode } from "react";
import { colorHex, isLight, shade } from "@/lib/colors";
import type { Category, ClothingItem, Pattern } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Clean vector flat-lays.
 *
 * Every item in Style List needs to look like something. When a person has
 * photographed an item we show their cleaned-up photo; until then (and for the
 * sample closet) we draw the garment from its category and colours so the grid
 * always reads as a visual wardrobe rather than a list of grey boxes.
 */

export type GarmentShape =
  | "tshirt"
  | "shirt"
  | "hoodie"
  | "sweater"
  | "jacket"
  | "coat"
  | "jeans"
  | "pants"
  | "sweatpants"
  | "shorts"
  | "sneaker"
  | "loafer"
  | "cap"
  | "bag"
  | "folded";

const SHAPE_BY_CATEGORY: Record<Category, GarmentShape> = {
  "T-Shirt": "tshirt",
  Shirt: "shirt",
  Hoodie: "hoodie",
  Sweater: "sweater",
  Jacket: "jacket",
  Coat: "coat",
  Jeans: "jeans",
  Pants: "pants",
  Sweatpants: "sweatpants",
  Shorts: "shorts",
  Shoes: "sneaker",
  Hat: "cap",
  Bag: "bag",
  Other: "folded",
};

export function shapeForItem(item: Pick<ClothingItem, "category" | "name" | "subcategory">): GarmentShape {
  const text = `${item.name} ${item.subcategory ?? ""}`.toLowerCase();
  if (item.category === "Shoes") {
    if (/(loafer|dress shoe|oxford|derby|boot)/.test(text)) return "loafer";
    return "sneaker";
  }
  return SHAPE_BY_CATEGORY[item.category] ?? "folded";
}

interface Palette {
  base: string;
  dark: string;
  darker: string;
  light: string;
  line: string;
  accent: string;
}

function palette(primary: string, secondary?: string): Palette {
  const base = colorHex(primary);
  const light = isLight(base);
  return {
    base,
    dark: shade(base, light ? -0.08 : 0.08),
    darker: shade(base, light ? -0.16 : 0.16),
    light: shade(base, light ? -0.04 : 0.12),
    line: shade(base, light ? -0.3 : 0.28),
    accent: secondary ? colorHex(secondary) : shade(base, light ? -0.4 : 0.35),
  };
}

interface ShapeDef {
  /** Main silhouette. Also reused to clip patterns. */
  body: string;
  /** Drawn underneath the body (hoods, back panels). */
  behind?: ReactNode;
  /** Drawn on top of the body (seams, pockets, buttons). */
  details?: ReactNode;
  /** Where a printed graphic would sit: x, y, width, height. */
  chest?: [number, number, number, number];
  /** Where the contact shadow sits, for shapes that do not reach the floor. */
  shadowY?: number;
}

/* ------------------------------------------------------------------ */
/* Silhouettes. Everything is drawn in a shared 200 x 200 box so the    */
/* closet grid lines up no matter what the item is.                     */
/* ------------------------------------------------------------------ */

function buildShape(shape: GarmentShape, p: Palette): ShapeDef {
  const seam = { stroke: p.line, strokeWidth: 1.6, fill: "none", strokeLinecap: "round" as const };
  const softSeam = { ...seam, strokeWidth: 1.2, opacity: 0.55 };

  switch (shape) {
    case "tshirt":
      return {
        body:
          "M74,40 C66,41 58,44 52,49 L26,74 L48,98 L62,85 L62,164 C86,171 114,171 138,164 L138,85 L152,98 L174,74 L148,49 C142,44 134,41 126,40 C118,55 82,55 74,40 Z",
        chest: [78, 74, 44, 40],
        details: (
          <>
            <path d="M78,43 C86,57 114,57 122,43" {...seam} />
            <path d="M48,98 L62,85" {...softSeam} />
            <path d="M152,98 L138,85" {...softSeam} />
            <path d="M64,160 C86,166 114,166 136,160" {...softSeam} />
          </>
        ),
      };

    case "shirt":
      return {
        body:
          "M76,42 C68,43 60,46 54,51 L34,70 C30,74 30,80 33,85 L46,148 C47,153 51,156 56,155 L64,153 L64,168 C86,174 114,174 136,168 L136,153 L144,155 C149,156 153,153 154,148 L167,85 C170,80 170,74 166,70 L146,51 C140,46 132,43 124,42 C116,56 84,56 76,42 Z",
        chest: [80, 78, 40, 34],
        details: (
          <>
            <path d="M76,42 L92,60 L100,52 L108,60 L124,42" fill={p.dark} stroke={p.line} strokeWidth={1.4} strokeLinejoin="round" />
            <path d="M100,52 L100,170" {...seam} />
            <rect x="94" y="52" width="12" height="118" fill={p.light} opacity={0.5} />
            <circle cx="100" cy="82" r="2.2" fill={p.line} />
            <circle cx="100" cy="108" r="2.2" fill={p.line} />
            <circle cx="100" cy="134" r="2.2" fill={p.line} />
            <path d="M68,78 L86,78 L84,98 L70,98 Z" {...softSeam} />
            <path d="M46,148 L56,152" {...softSeam} />
            <path d="M154,148 L144,152" {...softSeam} />
          </>
        ),
      };

    case "hoodie":
      return {
        body:
          "M76,48 L50,58 C42,62 37,69 35,78 L25,138 C24,145 27,150 33,152 L49,157 C55,159 60,156 61,150 L66,122 L66,172 C88,179 112,179 134,172 L134,122 L139,150 C140,156 145,159 151,157 L167,152 C173,150 176,145 175,138 L165,78 C163,69 158,62 150,58 L124,48 C116,62 84,62 76,48 Z",
        chest: [80, 82, 40, 32],
        behind: (
          <path
            d="M74,52 C68,22 132,22 126,52 C112,64 88,64 74,52 Z"
            fill={p.darker}
            stroke={p.line}
            strokeWidth={1.4}
          />
        ),
        details: (
          <>
            <path
              d="M72,140 L128,140 C130,140 132,142 132,144 L133,166 C133,168 131,169 129,169 L71,169 C69,169 67,168 67,166 L68,144 C68,142 70,140 72,140 Z"
              fill={p.dark}
              stroke={p.line}
              strokeWidth={1.4}
            />
            <path d="M92,58 L90,92" stroke={p.accent} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M108,58 L110,92" stroke={p.accent} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M33,146 L60,152" {...softSeam} />
            <path d="M167,146 L140,152" {...softSeam} />
            <path d="M66,168 C88,174 112,174 134,168" {...softSeam} />
          </>
        ),
      };

    case "sweater":
      return {
        body:
          "M76,46 L50,57 C42,61 37,68 35,77 L25,137 C24,144 27,149 33,151 L49,156 C55,158 60,155 61,149 L66,121 L66,168 C88,175 112,175 134,168 L134,121 L139,149 C140,155 145,158 151,156 L167,151 C173,149 176,144 175,137 L165,77 C163,68 158,61 150,57 L124,46 C116,60 84,60 76,46 Z",
        chest: [80, 78, 40, 34],
        details: (
          <>
            <path
              d="M78,47 C86,62 114,62 122,47 C114,40 86,40 78,47 Z"
              fill={p.dark}
              stroke={p.line}
              strokeWidth={1.4}
            />
            <path d="M66,158 C88,164 112,164 134,158" {...seam} />
            <path d="M30,143 L58,149" {...seam} />
            <path d="M170,143 L142,149" {...seam} />
            <path d="M84,74 L84,150" {...softSeam} />
            <path d="M100,72 L100,152" {...softSeam} />
            <path d="M116,74 L116,150" {...softSeam} />
          </>
        ),
      };

    case "jacket":
      return {
        body:
          "M76,44 L50,55 C42,59 37,66 35,75 L25,134 C24,141 27,146 33,148 L49,153 C55,155 60,152 61,146 L66,118 L66,166 C88,173 112,173 134,166 L134,118 L139,146 C140,152 145,155 151,153 L167,148 C173,146 176,141 175,134 L165,75 C163,66 158,59 150,55 L124,44 C116,58 84,58 76,44 Z",
        chest: [78, 80, 44, 30],
        details: (
          <>
            <path d="M76,44 L96,62 L100,56 L104,62 L124,44" fill={p.darker} stroke={p.line} strokeWidth={1.4} strokeLinejoin="round" />
            <path d="M100,56 L100,168" stroke={p.line} strokeWidth={1.8} fill="none" />
            <circle cx="100" cy="86" r="2.6" fill={p.accent} />
            <circle cx="100" cy="112" r="2.6" fill={p.accent} />
            <circle cx="100" cy="138" r="2.6" fill={p.accent} />
            <path d="M70,84 L88,84 L88,100 L70,100 Z" fill={p.dark} stroke={p.line} strokeWidth={1.3} />
            <path d="M112,84 L130,84 L130,100 L112,100 Z" fill={p.dark} stroke={p.line} strokeWidth={1.3} />
            <path d="M66,152 C88,158 112,158 134,152 L134,166 C112,173 88,173 66,166 Z" fill={p.dark} opacity={0.75} />
          </>
        ),
      };

    case "coat":
      return {
        body:
          "M76,40 L48,52 C40,56 35,63 33,72 L23,136 C22,143 25,148 31,150 L47,155 C53,157 58,154 59,148 L64,120 L60,182 C86,190 114,190 140,182 L136,120 L141,148 C142,154 147,157 153,155 L169,150 C175,148 178,143 177,136 L167,72 C165,63 160,56 152,52 L124,40 C116,54 84,54 76,40 Z",
        chest: [78, 76, 44, 34],
        details: (
          <>
            <path d="M76,40 L94,74 L100,64 L106,74 L124,40" fill={p.darker} stroke={p.line} strokeWidth={1.4} strokeLinejoin="round" />
            <path d="M100,64 L100,186" stroke={p.line} strokeWidth={1.8} fill="none" />
            <circle cx="100" cy="92" r="3" fill={p.accent} />
            <circle cx="100" cy="122" r="3" fill={p.accent} />
            <circle cx="100" cy="152" r="3" fill={p.accent} />
            <path d="M68,118 L88,118" {...seam} />
            <path d="M112,118 L132,118" {...seam} />
          </>
        ),
      };

    case "jeans":
    case "pants":
      return {
        body:
          "M60,26 L140,26 L145,80 L138,184 C138,186 136,188 134,188 L112,188 C110,188 108,186 108,184 L100,102 L92,184 C92,186 90,188 88,188 L66,188 C64,188 62,186 62,184 L55,80 Z",
        chest: [80, 120, 40, 30],
        details: (
          <>
            <path d="M60,26 L140,26 L141,44 L59,44 Z" fill={p.dark} stroke={p.line} strokeWidth={1.4} />
            <path d="M100,44 L100,72" {...seam} />
            <path d="M104,46 C112,54 112,62 106,70" {...softSeam} />
            <circle cx="100" cy="40" r="2.4" fill={p.line} />
            <path d="M62,48 C72,54 78,62 80,72" {...seam} />
            <path d="M138,48 C128,54 122,62 120,72" {...seam} />
            <path d="M70,32 L70,44" {...softSeam} />
            <path d="M130,32 L130,44" {...softSeam} />
            {shape === "jeans" ? (
              <>
                <path d="M112,86 C122,92 128,100 130,110" stroke={p.accent} strokeWidth={1.4} fill="none" opacity={0.8} />
                <path d="M88,86 C78,92 72,100 70,110" stroke={p.accent} strokeWidth={1.4} fill="none" opacity={0.8} />
              </>
            ) : (
              <>
                <path d="M78,92 L74,184" {...softSeam} />
                <path d="M122,92 L126,184" {...softSeam} />
              </>
            )}
          </>
        ),
      };

    case "sweatpants":
      return {
        body:
          "M60,26 L140,26 L146,84 L134,176 C134,178 132,180 130,180 L112,180 C110,180 108,178 108,176 L100,104 L92,176 C92,178 90,180 88,180 L70,180 C68,180 66,178 66,176 L54,84 Z",
        chest: [80, 120, 40, 30],
        details: (
          <>
            <path d="M60,26 L140,26 L141,46 L59,46 Z" fill={p.dark} stroke={p.line} strokeWidth={1.4} />
            <path d="M92,40 L84,58" stroke={p.accent} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M108,40 L116,58" stroke={p.accent} strokeWidth={3} strokeLinecap="round" fill="none" />
            <path d="M66,168 L108,168" {...seam} />
            <path d="M92,168 L134,168" {...seam} />
            <path d="M62,60 C70,68 76,78 78,90" {...softSeam} />
            <path d="M138,60 C130,68 124,78 122,90" {...softSeam} />
          </>
        ),
      };

    case "shorts":
      return {
        body:
          "M60,30 L140,30 L146,82 L140,132 C140,134 138,136 136,136 L112,136 C110,136 108,134 108,132 L100,96 L92,132 C92,134 90,136 88,136 L64,136 C62,136 60,134 60,132 L54,82 Z",
        chest: [80, 78, 40, 26],
        details: (
          <>
            <path d="M60,30 L140,30 L141,48 L59,48 Z" fill={p.dark} stroke={p.line} strokeWidth={1.4} />
            <path d="M100,48 L100,70" {...seam} />
            <path d="M62,124 L108,124" {...softSeam} />
            <path d="M92,124 L138,124" {...softSeam} />
          </>
        ),
      };

    case "sneaker":
      return {
        body:
          "M30,126 C26,110 30,94 42,84 L70,62 C78,56 88,55 96,60 L118,74 C130,82 142,87 156,90 C170,93 178,102 180,116 L181,128 C181,138 174,144 162,144 L44,144 C35,144 30,137 30,128 Z",
        chest: [96, 84, 34, 28],
        shadowY: 160,
        details: (
          <>
            <path
              d="M28,130 L182,130 C182,142 174,148 162,148 L44,148 C34,148 28,141 28,132 Z"
              fill={p.accent}
              stroke={p.line}
              strokeWidth={1.2}
            />
            <path d="M28,138 L182,138" stroke={p.line} strokeWidth={1} opacity={0.4} fill="none" />
            <path d="M96,60 L122,104 C126,112 134,116 143,116 L180,116" {...seam} />
            <path d="M72,72 L86,92" {...seam} />
            <path d="M84,66 L98,86" {...seam} />
            <path d="M60,82 C48,92 42,106 42,122" {...softSeam} />
            <path d="M150,96 C158,102 162,110 162,120" {...softSeam} />
            <circle cx="79" cy="82" r="1.6" fill={p.line} />
            <circle cx="91" cy="76" r="1.6" fill={p.line} />
          </>
        ),
      };

    case "loafer":
      return {
        body:
          "M34,132 C30,116 36,102 52,94 L92,74 C104,68 116,70 126,78 L154,100 C168,111 174,120 174,130 C174,140 166,144 154,144 L48,144 C38,144 34,139 34,132 Z",
        chest: [96, 92, 30, 22],
        shadowY: 160,
        details: (
          <>
            <path d="M32,134 L176,134 C176,142 168,148 156,148 L48,148 C38,148 32,142 32,136 Z" fill={p.accent} stroke={p.line} strokeWidth={1.2} />
            <path d="M74,88 C88,100 112,104 138,102" {...seam} />
            <path d="M86,84 L94,94 L112,90 L104,80 Z" fill={p.dark} stroke={p.line} strokeWidth={1.2} />
            <path d="M52,100 C46,110 44,120 46,130" {...softSeam} />
          </>
        ),
      };

    case "cap":
      return {
        body: "M48,130 C48,88 70,64 100,64 C130,64 148,90 148,130 Z",
        chest: [80, 86, 40, 26],
        shadowY: 158,
        details: (
          <>
            {/* Brim, sweeping forward from the base of the crown. */}
            <path
              d="M143,130 C170,129 188,135 188,141 C188,147 164,149 140,144 C142,140 143,135 143,130 Z"
              fill={p.dark}
              stroke={p.line}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
            {/* Sweatband along the opening. */}
            <path d="M48,123 L148,123 L148,131 L48,131 Z" fill={p.dark} opacity={0.85} />
            <path d="M100,65 L100,123" {...softSeam} />
            <path d="M77,71 C70,88 68,106 68,123" {...softSeam} />
            <path d="M123,71 C130,88 132,106 132,123" {...softSeam} />
            <circle cx="100" cy="67" r="3.6" fill={p.dark} stroke={p.line} strokeWidth={1.1} />
          </>
        ),
      };

    case "bag":
      return {
        body:
          "M54,78 L146,78 C150,78 153,81 153,85 L157,160 C157,166 153,170 147,170 L53,170 C47,170 43,166 43,160 L47,85 C47,81 50,78 54,78 Z",
        chest: [82, 104, 36, 32],
        shadowY: 180,
        details: (
          <>
            <path d="M74,78 C74,46 126,46 126,78" stroke={p.line} strokeWidth={5} fill="none" strokeLinecap="round" />
            <path d="M47,96 L153,96" {...softSeam} />
          </>
        ),
      };

    case "folded":
    default:
      return {
        body:
          "M46,62 L154,62 C158,62 161,65 161,69 L161,141 C161,145 158,148 154,148 L46,148 C42,148 39,145 39,141 L39,69 C39,65 42,62 46,62 Z",
        chest: [76, 84, 48, 34],
        shadowY: 162,
        details: (
          <>
            <path d="M39,92 L161,92" {...seam} />
            <path d="M39,120 L161,120" {...seam} />
            <path d="M100,62 L100,92" {...softSeam} />
          </>
        ),
      };
  }
}

export interface GarmentArtProps {
  shape: GarmentShape;
  primaryColor: string;
  secondaryColor?: string;
  pattern?: Pattern;
  /** Back views are drawn a little plainer, like a real back panel. */
  view?: "front" | "back";
  className?: string;
}

export function GarmentArt({
  shape,
  primaryColor,
  secondaryColor,
  pattern = "Solid",
  view = "front",
  className,
}: GarmentArtProps) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const p = palette(primaryColor, secondaryColor);
  const def = buildShape(shape, p);
  const showFrontDetails = view === "front";

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn("h-full w-full", className)}
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
        </linearGradient>
        <pattern id={`${id}-stripes`} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="5" fill={p.accent} opacity="0.85" />
        </pattern>
        <pattern id={`${id}-plaid`} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="none" />
          <rect width="16" height="3" fill={p.accent} opacity="0.7" />
          <rect width="3" height="16" fill={p.accent} opacity="0.7" />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <path d={def.body} />
        </clipPath>
      </defs>

      <ellipse cx="100" cy={def.shadowY ?? 182} rx="56" ry="7" fill="#000000" opacity="0.05" />

      {def.behind}

      <path d={def.body} fill={p.base} stroke={p.line} strokeWidth="1.6" strokeLinejoin="round" />

      {pattern === "Striped" && (
        <path d={def.body} fill={`url(#${id}-stripes)`} clipPath={`url(#${id}-clip)`} />
      )}
      {pattern === "Plaid" && (
        <path d={def.body} fill={`url(#${id}-plaid)`} clipPath={`url(#${id}-clip)`} />
      )}
      {pattern === "Camo" && (
        <g clipPath={`url(#${id}-clip)`} opacity="0.55">
          <ellipse cx="74" cy="86" rx="22" ry="15" fill={p.accent} />
          <ellipse cx="126" cy="118" rx="26" ry="16" fill={p.accent} />
          <ellipse cx="92" cy="146" rx="18" ry="12" fill={p.darker} />
          <ellipse cx="132" cy="70" rx="16" ry="11" fill={p.darker} />
        </g>
      )}

      <path d={def.body} fill={`url(#${id}-depth)`} stroke="none" />

      {showFrontDetails && def.details}

      {showFrontDetails && pattern === "Graphic" && def.chest && (
        <g clipPath={`url(#${id}-clip)`} opacity="0.9">
          <rect
            x={def.chest[0]}
            y={def.chest[1]}
            width={def.chest[2]}
            height={def.chest[3]}
            rx="4"
            fill={p.accent}
            opacity="0.85"
          />
        </g>
      )}
      {showFrontDetails && pattern === "Logo" && def.chest && (
        <g clipPath={`url(#${id}-clip)`}>
          <rect
            x={def.chest[0] + def.chest[2] / 2 - 9}
            y={def.chest[1] + 2}
            width="18"
            height="7"
            rx="3.5"
            fill={p.accent}
            opacity="0.9"
          />
        </g>
      )}

      {!showFrontDetails && (
        <g clipPath={`url(#${id}-clip)`} opacity="0.5">
          <path
            d="M100,40 L100,190"
            stroke={p.line}
            strokeWidth="1.2"
            fill="none"
            strokeDasharray="4 6"
          />
        </g>
      )}
    </svg>
  );
}
