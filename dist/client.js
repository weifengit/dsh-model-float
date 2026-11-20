window.__ModuleLoader__.load({
	id: "dsh-model-float",
	factory: (require) => {
	var module = { exports: {} };
	var exports = module.exports;
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/src/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// client/src/float.tsx
var import_react8 = require("react");
var import_react_dom2 = require("react-dom");

// client/src/ring/ring.tsx
var import_react2 = require("react");

// client/src/ring/geometry.ts
var INNER_RADIUS = 50;
var OUTER_RADIUS = 112;
var ICON_RADIUS = (INNER_RADIUS + OUTER_RADIUS) / 2;
var HIT_INNER_RADIUS = 26;
var HIT_OUTER_SLACK = 8;
function visibleArc(horizontal, vertical) {
  const TAU = Math.PI * 2;
  const up = 0;
  const right = Math.PI / 2;
  const down = Math.PI;
  const left = Math.PI * 1.5;
  const half = Math.PI;
  const quarter = Math.PI / 2;
  if (horizontal === "none" && vertical === "none") return { start: up, span: TAU };
  if (horizontal === "none") {
    return vertical === "top" ? { start: right, span: half } : { start: left, span: half };
  }
  if (vertical === "none") {
    return horizontal === "left" ? { start: up, span: half } : { start: down, span: half };
  }
  if (horizontal === "left" && vertical === "top") return { start: right, span: quarter };
  if (horizontal === "right" && vertical === "top") return { start: down, span: quarter };
  if (horizontal === "left" && vertical === "bottom") return { start: up, span: quarter };
  return { start: left, span: quarter };
}
function layoutWedges(ids, horizontal, vertical) {
  const { start, span } = visibleArc(horizontal, vertical);
  const count = ids.length;
  if (count === 0) return [];
  const step = span / count;
  return ids.map((id, index) => {
    const from = start + step * index;
    const to = from + step;
    const middle = (from + to) / 2;
    return {
      id,
      start: from,
      end: to,
      middle,
      iconX: Math.sin(middle) * ICON_RADIUS,
      iconY: -Math.cos(middle) * ICON_RADIUS
    };
  });
}
function angleOf(dx, dy) {
  const angle = Math.atan2(dx, -dy);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}
function wedgeAt(wedges, dx, dy) {
  const distance = Math.hypot(dx, dy);
  if (distance < HIT_INNER_RADIUS || distance > OUTER_RADIUS + HIT_OUTER_SLACK) return void 0;
  const angle = angleOf(dx, dy);
  for (const wedge of wedges) {
    const offset = (angle - wedge.start + Math.PI * 4) % (Math.PI * 2);
    if (offset <= wedge.end - wedge.start) return wedge.id;
  }
  return void 0;
}
function wedgePath(wedge, inner = INNER_RADIUS, outer = OUTER_RADIUS) {
  const point = (radius, angle) => [
    Math.sin(angle) * radius,
    -Math.cos(angle) * radius
  ];
  const [x1, y1] = point(outer, wedge.start);
  const [x2, y2] = point(outer, wedge.end);
  const [x3, y3] = point(inner, wedge.end);
  const [x4, y4] = point(inner, wedge.start);
  const large = wedge.end - wedge.start > Math.PI ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z"
  ].join(" ");
}
function arcPath(horizontal, vertical, inner = INNER_RADIUS, outer = OUTER_RADIUS) {
  const { start, span } = visibleArc(horizontal, vertical);
  const point = (radius, angle) => [
    Math.sin(angle) * radius,
    -Math.cos(angle) * radius
  ];
  return [
    `M ${point(outer, start).map((n) => n.toFixed(2)).join(" ")}`,
    radiusArcs(outer, start, span, true, point),
    `L ${point(inner, start + span).map((n) => n.toFixed(2)).join(" ")}`,
    radiusArcs(inner, start + span, span, false, point, -1),
    "Z"
  ].join(" ");
}
function radiusArcs(radius, from, sweep, clockwise, point, direction = 1) {
  const parts = [];
  let angle = from;
  for (const each of sweep >= Math.PI * 2 - 1e-6 ? [Math.PI, Math.PI] : [sweep]) {
    const [x, y] = point(radius, angle + each * direction);
    parts.push(`A ${radius} ${radius} 0 ${each > Math.PI ? 1 : 0} ${clockwise ? 1 : 0} ${x.toFixed(2)} ${y.toFixed(2)}`);
    angle += each * direction;
  }
  return parts.join(" ");
}
function arcRimPath(horizontal, vertical, radius = OUTER_RADIUS) {
  const { start, span } = visibleArc(horizontal, vertical);
  const point = (angle2) => [
    Math.sin(angle2) * radius,
    -Math.cos(angle2) * radius
  ];
  const parts = [`M ${point(start).map((n) => n.toFixed(2)).join(" ")}`];
  let angle = start;
  for (const each of span >= Math.PI * 2 - 1e-6 ? [Math.PI, Math.PI] : [span]) {
    const [x, y] = point(angle + each);
    parts.push(`A ${radius} ${radius} 0 ${each > Math.PI ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)}`);
    angle += each;
  }
  return parts.join(" ");
}

// client/src/ring/icons.tsx
var import_react = __toESM(require("react"), 1);

// client/src/whale.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var VIEWBOX = { width: 23.16, height: 17.04 };
var FISH_LOGO_PATH = "M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z";
function WhaleMark({ size = 62 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      className: "mf-whale",
      width: size,
      height: size * VIEWBOX.height / VIEWBOX.width,
      viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
      fill: "none",
      "aria-hidden": "true",
      focusable: "false",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: FISH_LOGO_PATH, fill: "currentColor" })
    }
  );
}

// client/src/ring/icons.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var MARK = {
  stroke: "#ffffff",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none"
};
var BOX = 16;
function fishMark() {
  const scale = BOX / Math.max(VIEWBOX.width, VIEWBOX.height);
  const offsetX = (24 - VIEWBOX.width * scale) / 2;
  const offsetY = (24 - VIEWBOX.height * scale) / 2;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "path",
    {
      d: FISH_LOGO_PATH,
      transform: `translate(${offsetX.toFixed(3)} ${offsetY.toFixed(3)}) scale(${scale.toFixed(4)})`,
      fill: "#ffffff",
      stroke: "none"
    }
  );
}
var CHIPS = {
  // 白嫖模型: the whale itself — the same silhouette the float wears, so the
  // wedge says "this is what the whale is".
  whale: { from: "#6f8bff", to: "#2f4bd8", mark: fishMark() },
  // 一键锁屏: a padlock. The shackle above the body and the keyhole in the
  // middle are what make it a lock rather than a box.
  lock: {
    from: "#b07bff",
    to: "#6b34d6",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8.6 10.6V8.2a3.4 3.4 0 0 1 6.8 0v2.4", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "6.4", y: "10.6", width: "11.2", height: "8", rx: "2.2", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 13.6v2.2", ...MARK })
    ] })
  },
  // 内存释放: a broom, standing upright — handle, collar, and a flared brush
  // with a middle seam. A diagonal solid wedge reads as a cursor arrow, and
  // a pointed triangle reads as a leaf; neither says "sweep".
  broom: {
    from: "#37e0b0",
    to: "#0d9f86",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 4.6v6.6", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "9.6", y: "11", width: "4.8", height: "2.2", rx: "0.7", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M10.1 13.4 7.5 19.5h9L13.9 13.4", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 13.8v5.4", ...MARK, opacity: "0.7" })
    ] })
  },
  // 系统监控: three bars on a baseline — the shape everyone already reads as
  // load.
  chart: {
    from: "#ffb34d",
    to: "#e0721c",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M5.6 18.4h12.8", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M8.6 18.4v-4", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 18.4V9.6", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15.4 18.4v-6.4", ...MARK })
    ] })
  },
  // 时钟: a face, two hands, the pin in the middle.
  clock: {
    from: "#4ecbff",
    to: "#1f7fe0",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "6.4", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 8.6V12l2.6 1.6", ...MARK })
    ] })
  },
  // 笔记: a page with a folded corner and two lines of text.
  note: {
    from: "#f472b6",
    to: "#c2257e",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M7.2 5.2h6.6l3.4 3.4v10.2H7.2z", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M13.8 5.2v3.4h3.4", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M9.6 12.4h4.8M9.6 15.2h4.8", ...MARK, opacity: "0.7" })
    ] })
  },
  // 设置: a cog — a body ring, a hub and eight teeth reaching past the ring.
  // Teeth floating around a bare circle read as a sun.
  gear: {
    from: "#a3aec4",
    to: "#5a6579",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "5", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "1.6", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "path",
        {
          d: "M12 7v-2M12 17v2M7 12H5M17 12h2M15.5 8.5 17 7M8.5 15.5 7 17M15.5 15.5 17 17M8.5 8.5 7 7",
          ...MARK
        }
      )
    ] })
  },
  // 电源: the power glyph — an arc open at the top with a stem through it.
  power: {
    from: "#ff7a6e",
    to: "#d43b3b",
    mark: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M7.8 8.2a5.6 5.6 0 1 0 8.4 0", ...MARK }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 4.8v6.2", ...MARK })
    ] })
  }
};
function RingIcon({ name, size = 38 }) {
  const chip = CHIPS[name];
  const uid = import_react.default.useId().replace(/[^a-zA-Z0-9]/g, "");
  if (chip === void 0) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_jsx_runtime2.Fragment, {});
  const id = `mfchip${uid}-${name}`;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "svg",
    {
      className: "mf-icon",
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      "aria-hidden": "true",
      focusable: "false",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("defs", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("linearGradient", { id: `${id}-fill`, x1: "0", y1: "0", x2: "0.35", y2: "1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("stop", { offset: "0", stopColor: chip.from }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("stop", { offset: "1", stopColor: chip.to })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("linearGradient", { id: `${id}-gloss`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("stop", { offset: "0", stopColor: "#ffffff", stopOpacity: "0.5" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("stop", { offset: "0.55", stopColor: "#ffffff", stopOpacity: "0.06" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("stop", { offset: "1", stopColor: "#ffffff", stopOpacity: "0" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "1.2", y: "1.2", width: "21.6", height: "21.6", rx: "7.2", fill: `url(#${id}-fill)` }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "rect",
          {
            x: "1.2",
            y: "1.2",
            width: "21.6",
            height: "21.6",
            rx: "7.2",
            fill: "none",
            stroke: "#ffffff",
            strokeOpacity: "0.34",
            strokeWidth: "0.8"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "2.6", y: "2.2", width: "18.8", height: "9.6", rx: "5.6", fill: `url(#${id}-gloss)` }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("g", { children: chip.mark })
      ]
    }
  );
}

// client/src/ring/ring.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var CHIP_SIZE = 38;
var CHIP_HALF = CHIP_SIZE / 2;
function Ring(props) {
  const { actions, open, horizontal, vertical, hovered, onHover, onOpen, onClose, onRun, t } = props;
  const svgRef = (0, import_react2.useRef)(null);
  const wedges = (0, import_react2.useMemo)(
    () => layoutWedges(actions.map((action) => action.id), horizontal, vertical),
    [actions, horizontal, vertical]
  );
  if (!open) return null;
  const pick3 = (event) => {
    const svg = svgRef.current;
    if (svg === null) return void 0;
    const rect = svg.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    return wedgeAt(wedges, dx, dy);
  };
  const band = arcPath(horizontal, vertical);
  const rim = arcRimPath(horizontal, vertical);
  const size = (OUTER_RADIUS + 6) * 2;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "svg",
    {
      ref: svgRef,
      className: "mf-ring",
      width: size,
      height: size,
      viewBox: `${-size / 2} ${-size / 2} ${size} ${size}`,
      onPointerEnter: onOpen,
      onPointerMove: (event) => onHover(pick3(event)),
      onPointerLeave: () => {
        onHover(void 0);
        onClose();
      },
      "aria-label": t("ring.label"),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "path",
          {
            className: "mf-ring-hit",
            d: arcPath(horizontal, vertical, HIT_INNER_RADIUS, OUTER_RADIUS + HIT_OUTER_SLACK)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { className: "mf-ring-band", d: band }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { className: "mf-ring-rim", d: rim }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { className: "mf-ring-inner", d: arcRimPath(horizontal, vertical, INNER_RADIUS) }),
        wedges.map((wedge) => {
          const action = actions.find((candidate) => candidate.id === wedge.id);
          if (action === void 0) return null;
          const active = hovered === wedge.id;
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "g",
            {
              className: "mf-ring-wedge-group",
              onClick: () => {
                if (action.enabled !== false) onRun(wedge.id);
              },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "path",
                  {
                    className: `mf-ring-wedge ${active ? "is-active" : ""} ${action.enabled === false ? "is-disabled" : ""}`,
                    d: wedgePath(wedge)
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "g",
                  {
                    className: `mf-ring-glyph ${active ? "is-active" : ""}`,
                    transform: `translate(${wedge.iconX - CHIP_HALF} ${wedge.iconY - CHIP_HALF})`,
                    children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RingIcon, { name: action.icon, size: CHIP_SIZE })
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("title", { children: action.label })
              ]
            },
            wedge.id
          );
        })
      ]
    }
  );
}

// client/src/features/free-model/vendor-card.tsx
var import_react3 = require("react");

// client/src/features/free-model/data.ts
var OFM_API = "/api/our-free-model";
var CHANNEL_PACK_API = "/api/channel-pack";
var VENDORS = [
  { id: "codearts", name: "CodeArts", org: "\u534E\u4E3A\u4E91", accent: "#C7000B", unit: "credits", balance: true, claim: true },
  { id: "buddy", name: "WorkBuddy \u56FD\u5185\u7248", org: "\u817E\u8BAF \xB7 copilot.tencent.com", accent: "#0A7AFF", unit: "credits", balance: true, claim: true },
  { id: "workbuddy", name: "WorkBuddy \u56FD\u9645\u7248", org: "\u817E\u8BAF \xB7 workbuddy.ai", accent: "#0B63CE", unit: "credits", balance: false, claim: false },
  { id: "lobsterai", name: "LobsterAI", org: "\u6709\u9053", accent: "#FF6A00", unit: "credits", balance: true, claim: true },
  { id: "qoder", name: "Qoder", org: "\u963F\u91CC\u7CFB", accent: "#615CED", unit: "credits", balance: true, claim: true },
  { id: "qodercn", name: "Qoder \u4E2D\u56FD\u7248", org: "\u963F\u91CC\u7CFB", accent: "#7A6CF0", unit: "credits", balance: true, claim: true },
  { id: "trae", name: "TRAE", org: "\u5B57\u8282", accent: "#00BFA6", unit: "credits", balance: true, claim: true },
  { id: "cline", name: "Cline", org: "Cline", accent: "#5B5BD6", unit: "dollars", balance: true, claim: false },
  { id: "loomy", name: "Loomy", org: "\u8BAF\u98DE", accent: "#2F6BFF", unit: "credits", balance: true, claim: true },
  { id: "raccoon", name: "Raccoon", org: "\u5546\u6C64", accent: "#00A6A6", unit: "credits", balance: true, claim: false },
  { id: "minimax", name: "MiniMax Code", org: "MiniMax", accent: "#E4007F", unit: "credits", balance: true, claim: true },
  { id: "zcode", name: "ZCode", org: "\u667A\u8C31", accent: "#3B6EF6", unit: "tokens", balance: true, claim: true },
  { id: "gemini", name: "Gemini", org: "Google Code Assist", accent: "#4285F4", unit: "quota", balance: true, claim: false }
];
function isUnusable(row) {
  if (row.visibleModelCount === 0) return false;
  if (row.state === "closed" || row.state === "idle" || row.state === "unknown") return true;
  if (row.balance === null) return false;
  return row.balance <= 0;
}
var HttpError = class extends Error {
};
async function getJson(path, signal) {
  const response = await fetch(path, {
    headers: { accept: "application/json" },
    ...signal === void 0 ? {} : { signal }
  });
  if (!response.ok) {
    throw new HttpError(`${response.status} ${response.statusText}`.trim());
  }
  return response.json();
}
async function callChannelPack(method, payload, signal) {
  const rpcId = `mf-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  const response = await fetch(CHANNEL_PACK_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "client-request",
      rpcId,
      method: "channel-pack",
      payload: { method, payload }
    }),
    ...signal === void 0 ? {} : { signal }
  });
  if (!response.ok) throw new HttpError(`${response.status} ${response.statusText}`.trim());
  const frame = await response.json();
  const result = frame.result;
  if (result === void 0) throw new HttpError("malformed rpc envelope");
  if (result.ok === true) return { ok: true, value: result.value };
  const error = result.error;
  return { ok: false, error: error?.message ?? error?.code ?? "rpc failed" };
}
async function readSnapshot(signal, hiddenByPanel = /* @__PURE__ */ new Set()) {
  const [laneResult, vendorRows] = await Promise.all([
    readLane(signal),
    readVendors(signal, hiddenByPanel)
  ]);
  if (laneResult.error !== "" && vendorRows.length === 0) {
    return {
      lane: EMPTY_LANE,
      vendors: [],
      models: [],
      at: Date.now(),
      error: laneResult.error
    };
  }
  return {
    lane: laneResult.lane,
    vendors: vendorRows,
    models: laneResult.models,
    at: Date.now(),
    error: laneResult.error
  };
}
var EMPTY_LANE = {
  total: 0,
  available: 0,
  regionBlocked: 0,
  unavailable: 0,
  throttled: 0,
  unknown: 0,
  channelsReady: false,
  channelsError: "",
  probedAt: 0
};
async function readLane(signal) {
  try {
    const payload = await getJson(`${OFM_API}/summary`, signal);
    const catalog = payload.catalog ?? [];
    const models = catalog.map((entry) => ({
      id: String(entry.id ?? ""),
      name: String(entry.name ?? entry.id ?? ""),
      availability: String(entry.availability ?? "unknown"),
      detail: String(entry.detail ?? ""),
      route: String(entry.route ?? ""),
      availabilitySource: String(entry.availabilitySource ?? ""),
      probedAt: Number(entry.probedAt ?? 0),
      hiddenByUser: entry.hiddenByUser === true
    }));
    const counts = { available: 0, regionBlocked: 0, unavailable: 0, throttled: 0, unknown: 0 };
    for (const entry of models) {
      switch (entry.availability) {
        case "available":
          counts.available += 1;
          break;
        case "region-blocked":
          counts.regionBlocked += 1;
          break;
        case "unavailable":
          counts.unavailable += 1;
          break;
        case "throttled":
          counts.throttled += 1;
          break;
        default:
          counts.unknown += 1;
          break;
      }
    }
    const channels = payload.channels ?? {};
    return {
      lane: {
        total: models.length,
        ...counts,
        channelsReady: channels.state === "ready",
        channelsError: String(channels.error ?? ""),
        probedAt: Number(payload.probedAt ?? 0)
      },
      models,
      error: ""
    };
  } catch (error) {
    return { lane: EMPTY_LANE, models: [], error: messageOf(error) };
  }
}
async function readLaneModels(signal) {
  const { models } = await readLane(signal);
  return models;
}
async function readVendors(signal, hiddenByPanel) {
  let statuses = {};
  let statusError = "";
  try {
    const status = await callChannelPack(
      "provider.status",
      { providers: VENDORS.map((vendor) => vendor.id) },
      signal
    );
    if (status.ok) {
      statuses = status.value.statuses ?? {};
    } else {
      statusError = status.error;
    }
  } catch (error) {
    statusError = messageOf(error);
  }
  const rows = await Promise.all(VENDORS.map(async (vendor) => {
    const entry = statuses[vendor.id];
    const base = {
      vendor,
      state: "unknown",
      modelCount: Number(entry?.models?.total ?? 0),
      disabledCount: Number(entry?.models?.disabled ?? 0),
      visibleModelCount: Math.max(0, Number(entry?.models?.total ?? 0) - Number(entry?.models?.disabled ?? 0)),
      accountCount: Number(entry?.accounts?.total ?? 0),
      enabledAccountCount: Number(entry?.accounts?.enabled ?? 0),
      balance: null,
      total: null,
      accounts: [],
      error: "",
      at: Date.now()
    };
    if (entry === void 0) return null;
    if (entry.closed === true) {
      const state2 = hiddenByPanel.has(vendor.id) ? "hidden" : "closed";
      return { ...base, state: state2 };
    }
    if (!vendor.balance) {
      const state2 = base.enabledAccountCount > 0 ? "on" : base.accountCount > 0 ? "idle" : "unknown";
      return { ...base, state: state2 };
    }
    let balances;
    try {
      balances = await callChannelPack("credits.balances", { provider: vendor.id }, signal);
    } catch (error) {
      balances = { ok: false, error: messageOf(error) };
    }
    if (!balances.ok) {
      const unsupported = balances.error.includes("unsupported provider");
      return {
        ...base,
        state: base.enabledAccountCount > 0 ? "on" : base.accountCount > 0 ? "idle" : "unknown",
        error: unsupported ? "" : balances.error
      };
    }
    const accounts = (balances.value.accounts ?? []).map((account) => ({
      accountId: String(account.accountId ?? ""),
      nickname: String(account.nickname ?? ""),
      balance: numeric(account.balance?.total),
      total: numeric(account.balance?.total),
      error: String(account.error ?? "")
    }));
    const known = accounts.filter((account) => account.balance !== null);
    const failed = accounts.filter((account) => account.error !== "");
    const balance = known.length === 0 ? null : known.reduce((sum, account) => sum + (account.balance ?? 0), 0);
    const total = known.length === 0 ? null : known.reduce((sum, account) => sum + (account.total ?? 0), 0);
    const state = base.enabledAccountCount > 0 ? "on" : base.accountCount > 0 ? "idle" : "unknown";
    return {
      ...base,
      state,
      balance,
      total,
      accounts,
      error: failed.length === 0 ? "" : failed[0]?.error ?? ""
    };
  }));
  return rows.filter((row) => row !== null);
}
async function readVendorModels(provider) {
  const result = await callChannelPack(
    "model.list",
    { provider }
  );
  if (!result.ok) throw new Error(result.error);
  return (result.value.models ?? []).map((model) => ({
    id: String(model.id ?? ""),
    name: String(model.name ?? model.id ?? ""),
    disabled: model.disabled === true,
    dead: model.dead === true
  }));
}
async function setVendorModelsDisabled(provider, modelIds, disabled) {
  const ids = [...new Set(modelIds.filter((id) => id !== ""))];
  if (ids.length === 0) return { changed: 0, error: "" };
  try {
    const result = await callChannelPack("model.setDisabledMany", {
      provider,
      modelIds: ids,
      disabled
    });
    if (!result.ok) return { changed: 0, error: result.error };
    return { changed: ids.length, error: "" };
  } catch (error) {
    return { changed: 0, error: messageOf(error) };
  }
}
var SWITCH_API = "/api/model-float/switch";
var AVAILABILITY_API = "/api/model-float/availability";
var DEFAULT_SWITCH = { enabled: false, hidden: {} };
async function readSwitch() {
  try {
    const response = await fetch(SWITCH_API, { headers: { accept: "application/json" } });
    if (!response.ok) return DEFAULT_SWITCH;
    const payload = await response.json();
    const hidden = {};
    for (const [provider, ids] of Object.entries(payload.hidden ?? {})) {
      if (Array.isArray(ids)) {
        hidden[provider] = ids.filter((id) => typeof id === "string");
      }
    }
    return { enabled: payload.enabled === true, hidden };
  } catch {
    return DEFAULT_SWITCH;
  }
}
async function writeSwitch(state) {
  const response = await fetch(SWITCH_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: state.enabled, hidden: state.hidden })
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  const payload = await response.json();
  return { enabled: payload.enabled === true, hidden: payload.hidden ?? {} };
}
function numeric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function messageOf(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
async function readAvailabilityCache(signal) {
  try {
    const response = await fetch(AVAILABILITY_API, {
      headers: { accept: "application/json" },
      ...signal === void 0 ? {} : { signal }
    });
    if (!response.ok) return {};
    const payload = await response.json();
    const cache2 = {};
    for (const [id, row] of Object.entries(payload.results ?? {})) {
      if (typeof row?.state !== "string") continue;
      cache2[id] = {
        state: row.state,
        detail: typeof row.detail === "string" ? row.detail : "",
        at: Number.isFinite(row.at) ? Number(row.at) : 0
      };
    }
    return cache2;
  } catch {
    return {};
  }
}

// client/src/features/free-model/verdicts.ts
var POSITIVE = "available";
var NEGATIVE = /* @__PURE__ */ new Set([
  "region-blocked",
  "unavailable",
  "throttled",
  "no-credit",
  "no-credential"
]);
function probeTtl(state) {
  return state === "available" ? 60 * 60 * 1e3 : 6 * 60 * 60 * 1e3;
}
function isUsable(verdict) {
  return verdict.state === POSITIVE;
}
function isRefused(verdict) {
  return NEGATIVE.has(verdict.state);
}
function isVendorFault(state) {
  return state === "no-credential" || state === "no-credit";
}
function laneVerdict(row) {
  const state = normalise(row.availability);
  const source = row.availabilitySource;
  if (source === "manual") return { state, source: "lane-manual", detail: row.detail ?? "", at: row.probedAt ?? 0 };
  if (source === "probe") return { state, source: "lane-probe", detail: row.detail ?? "", at: row.probedAt ?? 0 };
  if (state === "unknown") return { state: "unknown", source: "listing", detail: row.detail ?? "", at: 0 };
  return { state, source: "lane-probe", detail: row.detail ?? "", at: row.probedAt ?? 0 };
}
function cachedVerdict(cache2, id, now = Date.now()) {
  const row = cache2[id];
  if (row === void 0) return void 0;
  if (row.at <= 0 || now - row.at > probeTtl(row.state)) return void 0;
  return { state: row.state, source: "gateway-probe", detail: row.detail, at: row.at };
}
function bestVerdict(lane, cached) {
  if (lane === void 0 && cached === void 0) return { state: "unknown", source: "none", detail: "", at: 0 };
  if (lane === void 0) return cached;
  if (cached === void 0) return lane;
  if (cached.at > lane.at) return cached;
  if (lane.at > cached.at) return lane;
  return isUsable(lane) ? lane : cached;
}
function probeKey(provider, modelId) {
  return `${provider}/${modelId}`;
}
function laneCacheKeys(cache2, modelId) {
  const suffix = `/${modelId}`;
  return Object.keys(cache2).filter((key) => key !== modelId && key.endsWith(suffix)).sort((a, b) => a.length - b.length);
}
function cachedLaneVerdict(cache2, modelId, now = Date.now()) {
  for (const key of laneCacheKeys(cache2, modelId)) {
    const verdict = cachedVerdict(cache2, key, now);
    if (verdict !== void 0) return verdict;
  }
  return void 0;
}
function doomedModelIds(provider, models, verdicts, vendorUnusable) {
  const visible = models.filter((model) => !model.disabled && !model.dead);
  if (vendorUnusable) return visible.map((model) => model.id);
  return visible.filter((model) => {
    const verdict = verdicts[probeKey(provider, model.id)];
    return verdict !== void 0 && (isRefused(verdict) || isVendorFault(verdict.state));
  }).map((model) => model.id);
}
function normalise(value) {
  switch (value) {
    case "available":
      return "available";
    case "region-blocked":
      return "region-blocked";
    case "unavailable":
      return "unavailable";
    case "throttled":
      return "throttled";
    case "no-credit":
      return "no-credit";
    case "no-credential":
      return "no-credential";
    default:
      return "unknown";
  }
}

// client/src/features/free-model/vendor-card.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function ProbeGlyph() {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "svg",
    {
      className: "mf-probe-glyph",
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      "aria-hidden": "true",
      focusable: "false",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("circle", { cx: "10.5", cy: "10.5", r: "6.5" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M15.5 15.5 21 21" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("path", { d: "M10.5 7v7" })
      ]
    }
  );
}
function VendorCard(props) {
  const { open, side, vertical, freeModel, onOpen, onClose, t } = props;
  const {
    snapshot: snapshot2,
    loading,
    error,
    refresh,
    switchOn,
    hiddenVendors,
    switchPending,
    setSwitch,
    verdicts,
    sweeping,
    sweepProgress,
    sweepError,
    runSweep: runSweep2,
    stopSweep: stopSweep2
  } = freeModel;
  const [expanded, setExpanded] = (0, import_react3.useState)(false);
  const cardRef = (0, import_react3.useRef)(null);
  const lane = snapshot2?.lane;
  const vendors = snapshot2?.vendors ?? [];
  const usable = vendors.filter((row) => row.state === "on").length;
  const withCredit = vendors.filter((row) => row.balance !== null && row.balance > 0).length;
  const visibleModels = vendors.reduce((sum, row) => sum + row.visibleModelCount, 0);
  const refusedByVendor = (0, import_react3.useMemo)(() => {
    const counts = {};
    for (const [key, verdict] of Object.entries(verdicts)) {
      if (!isRefused(verdict)) continue;
      const slash = key.indexOf("/");
      if (slash <= 0) continue;
      const provider = key.slice(0, slash);
      counts[provider] = (counts[provider] ?? 0) + 1;
    }
    return counts;
  }, [verdicts]);
  const unusable = vendors.filter(isUnusable);
  const unusableModels = vendors.reduce((sum, row) => sum + (isUnusable(row) ? row.visibleModelCount : Math.min(refusedByVendor[row.vendor.id] ?? 0, row.visibleModelCount)), 0);
  const listed = switchOn ? vendors.filter((row) => !hiddenVendors.includes(row.vendor.id)) : vendors;
  const laneUnknown = (snapshot2?.models ?? []).filter((model) => !model.hiddenByUser && (verdicts[model.id]?.state ?? "unknown") === "unknown").length;
  const probedVendorKeys = (0, import_react3.useMemo)(() => Object.keys(verdicts).filter((key) => key.includes("/")), [verdicts]);
  const vendorUnknown = vendors.reduce((sum, row) => {
    const prefix = `${row.vendor.id}/`;
    const answered = probedVendorKeys.filter((key) => key.startsWith(prefix)).length;
    return sum + Math.max(0, row.visibleModelCount - answered);
  }, 0);
  const probeCount = laneUnknown + vendorUnknown;
  const usableLane = (snapshot2?.models ?? []).filter((model) => !model.hiddenByUser && (verdicts[model.id]?.state ?? "unknown") === "available").length;
  const usableByVendor = (0, import_react3.useMemo)(() => {
    const counts = {};
    for (const [key, verdict] of Object.entries(verdicts)) {
      if (verdict.state !== "available") continue;
      const slash = key.indexOf("/");
      if (slash <= 0) continue;
      const provider = key.slice(0, slash);
      counts[provider] = (counts[provider] ?? 0) + 1;
    }
    return counts;
  }, [verdicts]);
  (0, import_react3.useEffect)(() => {
    if (!open) return void 0;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "div",
    {
      className: `mf-card-shell ${open ? "is-open" : ""}`,
      "data-mf-side": side,
      "data-mf-vertical": vertical,
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          className: "mf-card",
          ref: cardRef,
          role: "dialog",
          "aria-label": t("card.title"),
          "aria-hidden": !open,
          onPointerEnter: onOpen,
          onPointerLeave: onClose,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "mf-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mf-card-head-text", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: t("card.title") }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-card-sub", children: lane === void 0 ? t("card.loading") : t("card.summary", {
                  usable,
                  vendors: vendors.length,
                  credit: withCredit,
                  models: usableLane,
                  total: lane.total
                }) }),
                visibleModels > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-card-sub", children: t("card.pickerModels", { count: visibleModels }) }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mf-card-actions", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `mf-icon-btn mf-probe-btn ${sweeping ? "is-running" : ""}`,
                    onClick: () => {
                      if (sweeping) {
                        stopSweep2();
                      } else {
                        void runSweep2();
                      }
                    },
                    disabled: probeCount === 0 && !sweeping,
                    title: sweeping ? t("sweep.progress", { done: sweepProgress.done, total: sweepProgress.total }) : probeCount > 0 ? t("sweep.start", { count: probeCount }) : t("sweep.allTested"),
                    "aria-label": sweeping ? t("sweep.stop") : t("sweep.start", { count: probeCount }),
                    children: sweeping ? `${sweepProgress.done}/${sweepProgress.total}` : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ProbeGlyph, {})
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "mf-icon-btn",
                    onClick: refresh,
                    disabled: loading,
                    title: t("card.refresh"),
                    "aria-label": t("card.refresh"),
                    children: loading ? "\u2026" : "\u27F3"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
                  "button",
                  {
                    type: "button",
                    role: "switch",
                    "aria-checked": switchOn,
                    className: `mf-switch ${switchOn ? "is-on" : ""}`,
                    disabled: switchPending,
                    onClick: () => {
                      void setSwitch(!switchOn);
                    },
                    title: switchOn ? t("switch.off") : t("switch.on", { count: unusableModels }),
                    "aria-label": switchOn ? t("switch.off") : t("switch.on", { count: unusableModels }),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-switch-knob", "aria-hidden": "true" }),
                      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-switch-text", children: switchOn ? t("switch.onShort") : t("switch.offShort") })
                    ]
                  }
                )
              ] })
            ] }),
            error !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mf-error", role: "alert", children: error }) : null,
            switchOn && unusable.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mf-note", children: t("switch.hidden", { count: unusable.length, models: unusableModels }) }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "mf-vendor-list", children: listed.map((row) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
              VendorRowView,
              {
                row,
                usable: usableByVendor[row.vendor.id] ?? 0,
                refused: refusedByVendor[row.vendor.id] ?? 0,
                t
              },
              row.vendor.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("footer", { className: "mf-card-foot", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                "button",
                {
                  type: "button",
                  className: "mf-text-btn",
                  onClick: () => setExpanded((current) => !current),
                  "aria-expanded": expanded,
                  children: expanded ? t("card.hideModels") : t("card.showModels")
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-foot-time", children: snapshot2 === null ? "" : t("card.updated", { time: formatTime(snapshot2.at) }) })
            ] }),
            sweepError !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mf-note", children: t("sweep." + sweepError) }) : null,
            expanded ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ModelList, { models: snapshot2?.models ?? [], verdicts, t }) : null
          ]
        }
      )
    }
  );
}
function VendorRowView({ row, usable, refused, t }) {
  const state = stateOf(row, refused);
  const balanceText = balanceTextOf(row, t);
  const allHidden = row.modelCount > 0 && row.visibleModelCount === 0;
  const hasModels = row.modelCount > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `mf-vendor is-${state} ${allHidden ? "is-hidden-models" : ""}`, title: row.error === "" ? void 0 : row.error, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-vendor-stripe", style: { background: row.vendor.accent }, "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mf-vendor-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-vendor-name", children: row.vendor.name }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "mf-vendor-org", children: [
        row.vendor.org,
        hasModels ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-vendor-models", children: allHidden ? t("vendor.modelsHidden", { count: row.modelCount }) : t("vendor.modelsUsable", { usable, visible: row.visibleModelCount, total: row.modelCount }) }) : null
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "mf-vendor-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `mf-vendor-state is-${state}`, children: stateLabel(state, t) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-vendor-balance", children: balanceText })
    ] })
  ] });
}
function ModelList({ models, verdicts, t }) {
  const shown = models.filter((model) => !model.hiddenByUser).map((model) => ({ model, verdict: verdicts[model.id] })).filter((entry) => entry.verdict === void 0 || !isRefusedOrHidden(entry.verdict)).sort((a, b) => rank(a.verdict) - rank(b.verdict));
  if (shown.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "mf-empty", children: t("card.noModels") });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "mf-model-list", children: shown.map(({ model, verdict }) => {
    const state = verdict?.state ?? "unknown";
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: `mf-model is-${state}`, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-model-name", title: model.id, children: model.name }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-model-state", children: availabilityLabel(state, t) }),
      verdict !== void 0 && verdict.detail !== "" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "mf-model-detail", title: verdict.detail, children: verdict.detail }) : null
    ] }, model.id);
  }) });
}
function isRefusedOrHidden(verdict) {
  return verdict.state !== "available" && verdict.state !== "unknown";
}
function rank(verdict) {
  if (verdict === void 0 || verdict.state === "unknown") return 2;
  return verdict.state === "available" ? 0 : 1;
}
function stateOf(row, refused) {
  if (row.state === "hidden") return "hidden";
  if (row.state === "closed") return "closed";
  if (row.state === "on" && row.balance !== null && row.balance <= 0) return "empty";
  if (row.state === "on" && row.visibleModelCount > 0 && refused >= row.visibleModelCount) return "broken";
  if (row.state === "on") return "on";
  if (row.state === "idle") return "idle";
  if (row.error !== "") return "error";
  return "unknown";
}
function stateLabel(state, t) {
  switch (state) {
    case "on":
      return t("vendor.on");
    case "idle":
      return t("vendor.idle");
    case "closed":
      return t("vendor.closed");
    case "hidden":
      return t("vendor.hidden");
    case "empty":
      return t("vendor.empty");
    case "error":
      return t("vendor.error");
    case "broken":
      return t("vendor.broken");
    default:
      return t("vendor.unknown");
  }
}
function availabilityLabel(state, t) {
  switch (state) {
    case "available":
      return t("model.available");
    case "region-blocked":
      return t("model.regionBlocked");
    case "unavailable":
      return t("model.unavailable");
    case "throttled":
      return t("model.throttled");
    case "no-credit":
      return t("model.noCredit");
    case "no-credential":
      return t("model.noCredential");
    default:
      return t("model.untested");
  }
}
function balanceTextOf(row, t) {
  if (row.balance === null) {
    if (row.vendor.balance && row.error !== "") return t("vendor.readFailed");
    if (!row.vendor.balance) return t("vendor.noBalance");
    return t("vendor.unknown");
  }
  const unit = row.vendor.unit;
  if (unit === "dollars") {
    return `$${row.balance.toFixed(2)}`;
  }
  if (unit === "tokens") {
    return `${formatNumber(row.balance)} tok`;
  }
  if (unit === "quota") {
    return `${formatNumber(row.balance)}`;
  }
  return formatNumber(row.balance);
}
function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toLocaleString("en-US") : rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatTime(at) {
  if (!Number.isFinite(at) || at <= 0) return "\u2014";
  try {
    return new Date(at).toLocaleTimeString();
  } catch {
    return "\u2014";
  }
}

// client/src/features/lockscreen/lock-screen.tsx
var import_react5 = require("react");
var import_react_dom = require("react-dom");

// client/src/features/wall/wall.tsx
var import_react4 = require("react");

// client/src/features/wall/format.ts
function formatBytes(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return "\u2014";
  if (value < 0) return "\u2014";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let node = value;
  let index = 0;
  while (node >= 1024 && index < units.length - 1) {
    node /= 1024;
    index += 1;
  }
  const digits = index === 0 ? 0 : node >= 100 ? 0 : node >= 10 ? 1 : 2;
  return `${node.toFixed(digits)} ${units[index]}`;
}
function formatFraction(value, digits = 0) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return "\u2014";
  return `${(value * 100).toFixed(digits)}%`;
}
function fractionToPercent(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return void 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}
function formatMoney(text, units, currency) {
  const asNumber = Number.parseFloat(text ?? "");
  if (Number.isFinite(asNumber)) return withCurrency(roundMoney(asNumber), currency);
  if (typeof units === "number" && Number.isFinite(units)) return withCurrency(roundMoney(units / 1e6), currency);
  return "\u2014";
}
function roundMoney(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1e4) return Math.round(value).toLocaleString("en-US");
  if (absolute >= 100) return value.toFixed(1);
  return value.toFixed(2);
}
function withCurrency(value, currency) {
  if (currency === null || currency === void 0 || currency === "") return value;
  return `${currency} ${value}`;
}
function formatAgo(at, now) {
  if (at === null || at === void 0 || !Number.isFinite(at)) return "\u2014";
  const delta = Math.max(0, now - at);
  if (delta < 45e3) return "\u521A\u521A";
  if (delta < 36e5) return `${Math.round(delta / 6e4)} \u5206\u949F\u524D`;
  if (delta < 864e5) return `${Math.round(delta / 36e5)} \u5C0F\u65F6\u524D`;
  if (delta < 7 * 864e5) return `${Math.round(delta / 864e5)} \u5929\u524D`;
  return new Date(at).toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function formatCount(value) {
  if (value === null || value === void 0 || !Number.isFinite(value)) return "\u2014";
  return Math.round(value).toLocaleString("en-US");
}
function formatDate(value) {
  if (value === null || value === void 0 || value === "") return "\u2014";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
}

// client/src/features/wall/reading.ts
async function through(call, method, args) {
  const answer = await call(method, args);
  if (answer.ok) return answer.value;
  return { code: answer.code === "transport" ? "transport" : answer.code, message: answer.message };
}
function absentCard(ctx) {
  return { tone: "idle", caption: ctx.t("wall.needHomepage") };
}
function failedCard(data, ctx) {
  if (data.code === "absent" || data.code === "transport") return absentCard(ctx);
  return { tone: "bad", caption: ctx.t("wall.cardFailed"), note: data.message };
}
function pick(value, ...path) {
  let node = value;
  for (const key of path) {
    if (node === null || typeof node !== "object") return void 0;
    node = node[key];
  }
  return node;
}
function list(value, ...path) {
  const node = pick(value, ...path);
  return Array.isArray(node) ? node : [];
}
function isFailure(value) {
  if (typeof value !== "object" || value === null) return false;
  const code = value.code;
  return typeof code === "string" && ["absent", "refused", "unreachable", "transport"].includes(code);
}
function loadTone(...fractions) {
  const worst = fractions.reduce((sum, value) => Math.max(sum, typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
  if (worst >= 0.9) return "bad";
  if (worst >= 0.75) return "warn";
  return "ok";
}

// client/src/features/wall/cards/audit.ts
function toneOf(state, verdict) {
  if (verdict === "unsafe") return "bad";
  if (verdict === "warn") return "warn";
  if (verdict === "safe") return "ok";
  if (state === "running" || state === "installing") return "idle";
  return "idle";
}
function fold(payload) {
  const audits = list(payload, "audits");
  const rows = audits.map((row) => ({
    auditId: row.auditId ?? "",
    state: row.state ?? "",
    verdict: row.verdict ?? null,
    pluginName: row.plugin?.name ?? "",
    pluginVersion: row.plugin?.version ?? "",
    startedAt: row.startedAt ?? 0,
    updatedAt: row.updatedAt ?? 0,
    summary: row.summary ?? ""
  }));
  return {
    audits: rows,
    latest: rows[0] ?? null
  };
}
async function load(ctx) {
  const answer = await through(ctx.call, "pluginAuditList");
  return isFailure(answer) ? answer : fold(answer);
}
function preview(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const latest = data.latest;
  if (latest === null) {
    return { tone: "idle", caption: ctx.t("wall.auditNone") };
  }
  return {
    tone: toneOf(latest.state, latest.verdict),
    headline: latest.verdict ?? latest.state,
    caption: latest.pluginName || "\u2014",
    figures: [
      { label: ctx.t("wall.auditState"), value: latest.state },
      { label: ctx.t("wall.auditUpdated"), value: formatAgo(latest.updatedAt, ctx.now) }
    ]
  };
}
function detail(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.auditAll"),
      rows: data.audits.slice(0, 10).map((row) => ({
        label: row.pluginName || row.auditId,
        value: `${row.verdict ?? row.state} \xB7 ${formatAgo(row.updatedAt, ctx.now)}`,
        tone: toneOf(row.state, row.verdict)
      }))
    }]
  };
}
var auditCard = {
  id: "audit",
  title: (ctx) => ctx.t("wall.card.audit"),
  glyph: "audit",
  span: [1, 1],
  refreshMs: 0,
  load,
  preview,
  detail
};

// client/src/features/wall/cards/core.ts
function fold2(upstream, local) {
  const head = pick(upstream, "head");
  const release = pick(upstream, "release");
  const versions = list(local, "versions");
  const installed = versions[0];
  const localVersion = installed?.version ?? null;
  const localBranch = installed?.branch ?? null;
  const localCommit = installed?.short ?? null;
  const upToDate = head?.short !== void 0 && installed?.short !== void 0 && installed.short !== null && head.short !== null && head.short !== void 0 ? installed.short === head.short : null;
  return {
    head: head === null || head === void 0 ? null : {
      sha: head.sha ?? "",
      short: head.short ?? "",
      message: head.message ?? "",
      author: head.author ?? "",
      date: head.date ?? "",
      url: head.url ?? ""
    },
    release: release === null || release === void 0 ? null : {
      tag: release.tag ?? "",
      name: release.name ?? "",
      url: release.url ?? "",
      publishedAt: release.publishedAt ?? ""
    },
    localVersion,
    localBranch,
    localCommit,
    at: pick(upstream, "at") ?? null,
    reason: pick(upstream, "reason") ?? null,
    upToDate
  };
}
async function load2(ctx) {
  const [upstream, local] = await Promise.all([
    through(ctx.call, "dsh"),
    through(ctx.call, "dshLocal", { options: {} })
  ]);
  if (isFailure(upstream) && isFailure(local)) return upstream;
  return fold2(isFailure(upstream) ? {} : upstream, isFailure(local) ? {} : local);
}
function preview2(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const versionLabel = data.localVersion ?? data.release?.tag ?? data.head?.short ?? "\u2014";
  return {
    tone: data.upToDate === false ? "warn" : data.upToDate === true ? "ok" : "idle",
    headline: versionLabel,
    caption: data.upToDate === false ? ctx.t("wall.coreBehind") : data.upToDate === true ? ctx.t("wall.coreUpToDate") : ctx.t("wall.coreUnknown"),
    figures: [
      ...data.release === null ? [] : [{ label: ctx.t("wall.coreRelease"), value: data.release.tag || "\u2014" }],
      ...data.localBranch === null ? [] : [{ label: ctx.t("wall.coreBranch"), value: data.localBranch }]
    ]
  };
}
function detail2(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [
      {
        title: ctx.t("wall.coreLocal"),
        rows: [
          { label: ctx.t("wall.coreVersion"), value: data.localVersion ?? "\u2014" },
          { label: ctx.t("wall.coreBranch"), value: data.localBranch ?? "\u2014" },
          { label: ctx.t("wall.coreCommit"), value: data.localCommit ?? "\u2014" }
        ]
      },
      {
        title: ctx.t("wall.coreUpstream"),
        rows: [
          { label: ctx.t("wall.coreHead"), value: data.head?.short ?? "\u2014" },
          { label: ctx.t("wall.coreMessage"), value: data.head?.message ?? "\u2014" },
          { label: ctx.t("wall.coreAuthor"), value: data.head?.author ?? "\u2014" },
          { label: ctx.t("wall.coreDate"), value: formatDate(data.head?.date) },
          ...data.release === null ? [] : [
            { label: ctx.t("wall.coreReleaseTag"), value: data.release.tag },
            { label: ctx.t("wall.coreReleaseDate"), value: formatDate(data.release.publishedAt) }
          ]
        ]
      }
    ],
    note: data.reason === "network" ? ctx.t("wall.coreNetworkNote") : void 0
  };
}
var coreCard = {
  id: "core",
  title: (ctx) => ctx.t("wall.card.core"),
  glyph: "core",
  span: [1, 1],
  refreshMs: 3e5,
  load: load2,
  preview: preview2,
  detail: detail2
};

// client/src/features/wall/cards/device.ts
function fromHomepage(payload) {
  return {
    at: pick(payload, "at") ?? Date.now(),
    cpu: pick(payload, "cpu", "usage") ?? null,
    cores: pick(payload, "cpu", "count") ?? 0,
    memoryUsed: pick(payload, "memory", "used") ?? 0,
    memoryTotal: pick(payload, "memory", "total") ?? 0,
    memory: pick(payload, "memory", "usage") ?? null,
    disk: pick(payload, "disk", "usage") ?? null,
    diskFree: pick(payload, "disk", "free") ?? null,
    gpu: pick(payload, "gpu", "usage") ?? null,
    gpuName: pick(payload, "gpu", "name") ?? "",
    temperature: pick(payload, "temperature", "celsius") ?? null,
    netDown: null,
    netUp: null,
    hostname: pick(payload, "system", "hostname") ?? "",
    platform: pick(payload, "system", "platform") ?? "",
    uptime: pick(payload, "system", "uptime") ?? null,
    coreUsages: pick(payload, "cpu", "cores") ?? [],
    local: false
  };
}
function fromSampler(sample) {
  return {
    at: sample.at,
    cpu: sample.cpu,
    cores: 0,
    memoryUsed: sample.systemUsed,
    memoryTotal: sample.systemTotal,
    memory: sample.systemTotal > 0 ? sample.systemUsed / sample.systemTotal : null,
    disk: null,
    diskFree: null,
    gpu: null,
    gpuName: "",
    temperature: null,
    netDown: sample.netDown,
    netUp: sample.netUp,
    hostname: "",
    platform: "",
    uptime: null,
    coreUsages: [],
    local: true
  };
}
async function load3(ctx) {
  const answer = await ctx.call("device");
  if (answer.ok) return fromHomepage(answer.value);
  if (ctx.sampler === null) return { code: answer.code, message: answer.message };
  try {
    return fromSampler(await ctx.sampler());
  } catch (error) {
    return { code: "unreachable", message: error instanceof Error ? error.message : String(error) };
  }
}
function preview3(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const figures = [
    {
      label: ctx.t("wall.memory"),
      value: `${formatBytes(data.memoryUsed)} / ${formatBytes(data.memoryTotal)}`,
      percent: fractionToPercent(data.memory)
    },
    ...data.disk === null ? [] : [{ label: ctx.t("wall.disk"), value: formatFraction(data.disk), percent: fractionToPercent(data.disk) }],
    ...data.gpu === null ? [] : [{ label: ctx.t("wall.gpu"), value: formatFraction(data.gpu), percent: fractionToPercent(data.gpu) }],
    ...data.temperature === null ? [] : [{ label: ctx.t("wall.temperature"), value: `${data.temperature.toFixed(0)}\xB0C` }],
    ...data.netDown === null && data.netUp === null ? [] : [{
      label: ctx.t("wall.net"),
      value: `${formatBytes(data.netDown ?? 0)}/s \u2193 ${formatBytes(data.netUp ?? 0)}/s \u2191`
    }]
  ];
  return {
    tone: loadTone(data.cpu, data.memory),
    headline: data.cpu === null ? "\u2014" : formatFraction(data.cpu),
    caption: ctx.t(data.local ? "wall.cpuLocal" : "wall.cpuOf", { cores: data.cores > 0 ? ` \xB7 ${data.cores}c` : "" }),
    figures: figures.slice(0, 4)
  };
}
function detail3(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  const perCore = data.coreUsages;
  return {
    groups: [
      {
        title: ctx.t("wall.machine"),
        rows: [
          { label: ctx.t("wall.hostname"), value: data.hostname || "\u2014" },
          { label: ctx.t("wall.platform"), value: data.platform || "\u2014" },
          { label: ctx.t("wall.memory"), value: `${formatBytes(data.memoryUsed)} / ${formatBytes(data.memoryTotal)}`, percent: fractionToPercent(data.memory) },
          ...data.disk === null ? [] : [{ label: ctx.t("wall.diskFree"), value: formatBytes(data.diskFree) }],
          ...data.uptime === null ? [] : [{ label: ctx.t("wall.uptime"), value: `${Math.round(data.uptime / 36) / 24} d` }]
        ]
      },
      ...perCore.length === 0 ? [] : [{
        title: ctx.t("wall.cores"),
        rows: perCore.map((value, index) => ({
          label: `#${index + 1}`,
          value: formatFraction(typeof value === "number" ? value : null),
          percent: fractionToPercent(typeof value === "number" ? value : null)
        }))
      }]
    ],
    note: data.local ? ctx.t("wall.deviceLocalNote") : void 0
  };
}
var deviceCard = {
  id: "device",
  title: (ctx) => ctx.t("wall.card.device"),
  glyph: "device",
  span: [1, 1],
  refreshMs: 2e3,
  load: load3,
  preview: preview3,
  detail: detail3
};

// client/src/features/wall/cards/groups.ts
function fold3(payload) {
  const layout = pick(payload, "layout") ?? {};
  const groups = list(layout, "groups");
  const members = layout.members ?? {};
  return {
    mode: layout.mode ?? "grouped",
    groups: groups.map((row) => ({
      id: row.id ?? "",
      title: row.title ?? "",
      color: row.color ?? null,
      collapsed: row.collapsed ?? false,
      sort: row.sort ?? "manual"
    })),
    memberCount: Object.keys(members).length,
    at: pick(payload, "at") ?? layout.updatedAt ?? null
  };
}
async function load4(ctx) {
  const answer = await through(ctx.call, "sidebarLayout");
  return isFailure(answer) ? answer : fold3(answer);
}
function preview4(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  return {
    tone: data.groups.length > 0 ? "ok" : "idle",
    headline: String(data.groups.length),
    caption: ctx.t("wall.groupsCaption", { mode: data.mode }),
    figures: [
      { label: ctx.t("wall.groupsMode"), value: data.mode },
      { label: ctx.t("wall.groupsMembers"), value: String(data.memberCount) }
    ]
  };
}
function detail4(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.groupsAll"),
      rows: data.groups.map((row) => ({
        label: row.title || row.id,
        value: `${row.sort}${row.collapsed ? " \xB7 collapsed" : ""}`,
        tone: row.collapsed ? "idle" : "ok"
      }))
    }]
  };
}
var groupsCard = {
  id: "groups",
  title: (ctx) => ctx.t("wall.card.groups"),
  glyph: "groups",
  span: [1, 1],
  refreshMs: 0,
  load: load4,
  preview: preview4,
  detail: detail4
};

// client/src/features/wall/cards/network.ts
function fold4(payload) {
  return {
    proxies: list(payload, "proxies").map((row) => ({
      name: row.name ?? "",
      kind: row.kind === "bypass" ? "bypass" : "proxy",
      masked: row.masked ?? "",
      hasAuth: row.hasAuth ?? false
    })),
    tls: list(payload, "tls").map((row) => ({ name: row.name ?? "", value: row.value ?? "" })),
    redirectors: list(payload, "redirectors").map((row) => ({ name: row.name ?? "", value: row.value ?? "" })),
    platform: pick(payload, "platform") ?? "",
    arch: pick(payload, "arch") ?? "",
    node: pick(payload, "node") ?? "",
    capturedAt: pick(payload, "capturedAt") ?? null
  };
}
async function load5(ctx) {
  const answer = await through(ctx.call, "environment");
  return isFailure(answer) ? answer : fold4(answer);
}
function preview5(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const proxyCount = data.proxies.filter((row) => row.kind === "proxy").length;
  return {
    tone: proxyCount > 0 ? "warn" : "ok",
    headline: String(proxyCount),
    caption: ctx.t("wall.networkProxies", { count: proxyCount }),
    figures: [
      ...data.tls.length === 0 ? [] : [{ label: ctx.t("wall.networkTls"), value: String(data.tls.length) }],
      ...data.redirectors.length === 0 ? [] : [{ label: ctx.t("wall.networkRedirectors"), value: String(data.redirectors.length) }],
      { label: ctx.t("wall.networkNode"), value: data.node || "\u2014" }
    ]
  };
}
function detail5(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [
      { title: ctx.t("wall.networkProxiesTitle"), rows: data.proxies.map((row) => ({ label: row.name, value: row.masked || "\u2014", tone: row.kind === "bypass" ? "idle" : "warn" })) },
      { title: ctx.t("wall.networkTlsTitle"), rows: data.tls.map((row) => ({ label: row.name, value: row.value || "\u2014" })) },
      { title: ctx.t("wall.networkRedirectorsTitle"), rows: data.redirectors.map((row) => ({ label: row.name, value: row.value || "\u2014" })) }
    ]
  };
}
var networkCard = {
  id: "network",
  title: (ctx) => ctx.t("wall.card.network"),
  glyph: "network",
  span: [1, 1],
  refreshMs: 0,
  load: load5,
  preview: preview5,
  detail: detail5
};

// client/src/features/wall/cards/projects.ts
function fold5(payload) {
  const summary = pick(payload, "summary") ?? {};
  const projects = list(payload, "projects");
  return {
    summary: {
      total: summary.total ?? 0,
      dirty: summary.dirty ?? 0,
      live: summary.live ?? 0,
      running: summary.running ?? 0,
      worktrees: summary.worktrees ?? 0,
      missing: summary.missing ?? 0
    },
    projects: projects.map((row) => {
      const git = row.git;
      const isRepo = git !== null && git !== void 0 && git.repo === true;
      return {
        id: row.id ?? "",
        title: row.title ?? "",
        path: row.path ?? "",
        sessions: row.sessions ?? 0,
        running: row.running ?? 0,
        branch: isRepo ? git.branch ?? null : null,
        dirty: isRepo ? git.dirty ?? null : null,
        ahead: isRepo ? git.ahead ?? null : null,
        behind: isRepo ? git.behind ?? null : null,
        lastCommit: isRepo ? git.lastCommit?.subject ?? null : null,
        lastCommitAt: isRepo ? git.lastCommit?.at ?? null : null
      };
    }),
    at: pick(payload, "at") ?? null
  };
}
async function load6(ctx) {
  const answer = await through(ctx.call, "projects", { options: {} });
  if (isFailure(answer)) return answer;
  const folded = fold5(answer);
  if (pick(answer, "available") === false) {
    return { code: "refused", message: pick(answer, "reason") ?? "projects unavailable" };
  }
  return folded;
}
function preview6(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const s = data.summary;
  return {
    tone: s.dirty > 0 ? "warn" : s.running > 0 ? "ok" : "idle",
    headline: String(s.total),
    caption: ctx.t("wall.projectsCaption", { dirty: s.dirty, running: s.running }),
    figures: [
      { label: ctx.t("wall.projectsDirty"), value: String(s.dirty) },
      { label: ctx.t("wall.projectsRunning"), value: String(s.running) },
      { label: ctx.t("wall.projectsWorktrees"), value: String(s.worktrees) },
      { label: ctx.t("wall.projectsMissing"), value: String(s.missing) }
    ]
  };
}
function detail6(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.projectsAll"),
      rows: data.projects.slice(0, 20).map((row) => ({
        label: row.title || row.path,
        value: row.branch === null ? "\u2014" : `${row.branch}${row.dirty !== null && row.dirty > 0 ? ` \xB7 +${row.dirty}` : ""}`,
        tone: row.running > 0 ? "ok" : row.dirty !== null && row.dirty > 0 ? "warn" : "idle"
      }))
    }]
  };
}
var projectsCard = {
  id: "projects",
  title: (ctx) => ctx.t("wall.card.projects"),
  glyph: "projects",
  span: [2, 1],
  refreshMs: 15e3,
  load: load6,
  preview: preview6,
  detail: detail6
};

// client/src/features/wall/cards/sessions.ts
function fold6(sessions, runtime) {
  return {
    running: sessions.filter((row) => row.running).length,
    titles: sessions.map((row) => ({ id: row.id, title: row.title, running: row.running })),
    total: pick(runtime, "sessions", "total") ?? null,
    agents: pick(runtime, "agents", "total") ?? null,
    roots: pick(runtime, "agents", "roots") ?? null
  };
}
async function load7(ctx) {
  const answer = await through(ctx.call, "collect", { options: { names: ["runtime"] } });
  const runtime = isFailure(answer) ? null : answer;
  return fold6(ctx.sessions, runtime);
}
function preview7(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const figures = [
    ...data.total === null ? [] : [{ label: ctx.t("wall.sessionsTotal"), value: String(data.total) }],
    ...data.agents === null ? [] : [{ label: ctx.t("wall.sessionsAgents"), value: String(data.agents) }],
    ...data.roots === null ? [] : [{ label: ctx.t("wall.sessionsRoots"), value: String(data.roots) }]
  ];
  return {
    tone: data.running > 0 ? "ok" : "idle",
    headline: ctx.t("wall.sessionsRunning", { count: data.running }),
    caption: data.titles.length === 0 ? ctx.t("wall.sessionsNone") : data.titles.slice(0, 2).map((row) => row.title).join(" \xB7 ") + (data.titles.length > 2 ? " \u2026" : ""),
    figures
  };
}
function detail7(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.sessionsAll"),
      rows: data.titles.map((row) => ({
        label: row.title,
        value: row.running ? ctx.t("wall.sessionsOn") : ctx.t("wall.sessionsIdle"),
        tone: row.running ? "ok" : "idle"
      }))
    }],
    actions: data.titles.filter((row) => row.running).map((row) => ({
      id: `stop-${row.id}`,
      label: `${ctx.t("wall.sessionsStop")} \xB7 ${row.title}`,
      method: "act",
      args: { options: { action: "session.stop", payload: { sessionId: row.id } } },
      confirm: true,
      report: (value) => pick(value, "stopped") ? ctx.t("wall.sessionsStopped") : ctx.t("wall.sessionsNotStopped")
    }))
  };
}
var sessionsCard = {
  id: "sessions",
  title: (ctx) => ctx.t("wall.card.sessions"),
  glyph: "sessions",
  span: [2, 1],
  refreshMs: 5e3,
  load: load7,
  preview: preview7,
  detail: detail7
};

// client/src/features/wall/cards/skills.ts
function fold7(payload) {
  const counts = pick(payload, "counts") ?? {};
  const skills = list(payload, "skills");
  return {
    counts: {
      total: counts.total ?? 0,
      enabled: counts.enabled ?? 0,
      disabled: counts.disabled ?? 0,
      writable: counts.writable ?? 0
    },
    skills: skills.map((row) => ({
      name: row.name ?? "",
      description: row.description ?? "",
      source: row.source ?? "",
      modelInvocable: row.modelInvocable ?? false,
      userInvocable: row.userInvocable ?? false,
      writable: row.writable ?? false
    })),
    generatedAt: pick(payload, "generatedAt") ?? null
  };
}
async function load8(ctx) {
  const answer = await through(ctx.call, "skillList", { options: {} });
  return isFailure(answer) ? answer : fold7(answer);
}
function preview8(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  return {
    tone: data.counts.enabled > 0 ? "ok" : "idle",
    headline: String(data.counts.enabled),
    caption: ctx.t("wall.skillsCaption", { total: data.counts.total }),
    figures: [
      { label: ctx.t("wall.skillsTotal"), value: String(data.counts.total) },
      { label: ctx.t("wall.skillsDisabled"), value: String(data.counts.disabled) },
      { label: ctx.t("wall.skillsWritable"), value: String(data.counts.writable) }
    ]
  };
}
function detail8(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.skillsAll"),
      rows: data.skills.slice(0, 30).map((row) => ({
        label: row.name,
        value: row.description || row.source,
        tone: row.modelInvocable || row.userInvocable ? "ok" : "idle"
      }))
    }]
  };
}
var skillsCard = {
  id: "skills",
  title: (ctx) => ctx.t("wall.card.skills"),
  glyph: "skills",
  span: [1, 1],
  refreshMs: 0,
  load: load8,
  preview: preview8,
  detail: detail8
};

// client/src/features/wall/cards/storage.ts
function fold8(payload) {
  const categories = list(payload, "categories");
  return {
    available: pick(payload, "available") ?? false,
    totalBytes: pick(payload, "totalBytes") ?? 0,
    totalFiles: pick(payload, "totalFiles") ?? 0,
    reclaimableBytes: pick(payload, "reclaimableBytes") ?? 0,
    reclaimableFiles: pick(payload, "reclaimableFiles") ?? 0,
    categories: categories.map((row) => ({
      id: row.id ?? "",
      bytes: row.bytes ?? 0,
      files: row.files ?? 0,
      reclaimableBytes: row.reclaimableBytes ?? 0,
      reclaimableFiles: row.reclaimableFiles ?? 0,
      truncated: row.truncated ?? false
    })),
    at: pick(payload, "at") ?? null
  };
}
async function load9(ctx) {
  const answer = await through(ctx.call, "hygiene", { options: {} });
  if (isFailure(answer)) return answer;
  const folded = fold8(answer);
  if (!folded.available) return { code: "refused", message: pick(answer, "reason") ?? "hygiene unavailable" };
  return folded;
}
function preview9(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const reclaimFraction = data.totalBytes > 0 ? data.reclaimableBytes / data.totalBytes : null;
  return {
    tone: data.reclaimableBytes > 100 * 1024 * 1024 ? "warn" : "ok",
    headline: formatBytes(data.totalBytes),
    caption: ctx.t("wall.storageFiles", { count: data.totalFiles }),
    figures: [
      { label: ctx.t("wall.storageReclaimable"), value: formatBytes(data.reclaimableBytes), percent: fractionToPercent(reclaimFraction) },
      ...data.categories.slice(0, 3).map((row) => ({
        label: ctx.t(`wall.storageCategory.${row.id}`),
        value: formatBytes(row.bytes)
      }))
    ]
  };
}
function detail9(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.storageCategories"),
      rows: data.categories.map((row) => ({
        label: ctx.t(`wall.storageCategory.${row.id}`),
        value: `${formatBytes(row.bytes)} \xB7 ${row.files} files`
      }))
    }],
    actions: data.reclaimableFiles > 0 ? [{
      id: "prune",
      label: ctx.t("wall.storagePrune", { count: data.reclaimableFiles }),
      method: "act",
      args: { options: { action: "hygiene.logs.prune", payload: { olderThanDays: 7 } } },
      confirm: true,
      report: (value) => ctx.t("wall.storagePruned", { bytes: formatBytes(pick(value, "bytes") ?? 0) })
    }] : []
  };
}
var storageCard = {
  id: "storage",
  title: (ctx) => ctx.t("wall.card.storage"),
  glyph: "storage",
  span: [1, 1],
  refreshMs: 12e4,
  load: load9,
  preview: preview9,
  detail: detail9
};

// client/src/features/wall/cards/token.ts
function fold9(payload) {
  const wallets = list(payload, "wallets");
  const bonuses = list(payload, "bonusWallets");
  const currency = pick(payload, "currency") ?? null;
  const history = list(payload, "history");
  const today = history[0];
  const yesterday = history[1];
  const balanceWallet = wallets.find((wallet) => (wallet.currency ?? null) === currency) ?? wallets[0];
  const bonusWallet = bonuses[0];
  return {
    currency,
    balance: formatMoney(balanceWallet?.balance, balanceWallet?.units, currency),
    bonus: bonusWallet === void 0 ? null : formatMoney(bonusWallet.balance, null, currency),
    today: today === void 0 ? null : {
      day: today.day ?? "\u2014",
      spend: today.spend ?? "\u2014",
      credit: today.credit ?? "\u2014",
      samples: today.samples ?? 0
    },
    yesterday: yesterday === void 0 ? null : {
      day: yesterday.day ?? "\u2014",
      spend: yesterday.spend ?? "\u2014",
      credit: yesterday.credit ?? "\u2014",
      samples: yesterday.samples ?? 0
    },
    history: history.map((day) => ({
      day: day.day ?? "\u2014",
      spend: day.spend ?? "\u2014",
      credit: day.credit ?? "\u2014",
      samples: day.samples ?? 0
    })),
    accountStatus: pick(payload, "account", "status") ?? "unknown",
    sampledAt: pick(payload, "sampledAt") ?? null,
    storage: pick(payload, "storage") ?? ""
  };
}
async function load10(ctx) {
  return through(ctx.call, "overview", { options: { historyDays: 14 } }).then((answer) => isFailure(answer) ? answer : fold9(answer));
}
function preview10(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  const figures = [
    ...data.today === null ? [] : [{ label: ctx.t("wall.tokenToday"), value: data.today.spend }],
    ...data.yesterday === null ? [] : [{ label: ctx.t("wall.tokenYesterday"), value: data.yesterday.spend }],
    ...data.bonus === null ? [] : [{ label: ctx.t("wall.tokenBonus"), value: data.bonus }]
  ];
  return {
    tone: data.accountStatus === "signed-out" ? "idle" : data.accountStatus === "unknown" ? "warn" : "ok",
    headline: data.balance,
    caption: ctx.t("wall.tokenCaption", { status: data.accountStatus }),
    figures
  };
}
function detail10(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [
      {
        title: ctx.t("wall.tokenHistory"),
        rows: data.history.slice(0, 14).map((day) => ({
          label: day.day,
          value: `${day.spend} / ${day.credit}`
        }))
      }
    ],
    note: data.sampledAt === null ? void 0 : ctx.t("wall.tokenUpdated", { time: formatAgo(data.sampledAt, ctx.now) }),
    actions: [{
      id: "refresh",
      label: ctx.t("wall.tokenRefresh"),
      method: "refresh",
      confirm: false,
      report: () => ctx.t("wall.tokenRefreshed")
    }]
  };
}
var tokenCard = {
  id: "token",
  title: (ctx) => ctx.t("wall.card.token"),
  glyph: "token",
  span: [2, 1],
  refreshMs: 3e4,
  load: load10,
  preview: preview10,
  detail: detail10
};

// client/src/features/wall/cards/tools.ts
function fold10(payload) {
  const totals = pick(payload, "totals") ?? {};
  const tools = list(payload, "tools");
  return {
    available: pick(payload, "available") ?? false,
    calls: totals.calls ?? 0,
    errors: totals.errors ?? 0,
    errorRate: totals.errorRate ?? 0,
    argChars: totals.argChars ?? 0,
    outChars: totals.outChars ?? 0,
    argTokens: totals.argTokens ?? 0,
    outTokens: totals.outTokens ?? 0,
    ms: totals.ms ?? 0,
    tools: tools.map((row) => ({
      name: row.name ?? "",
      calls: row.calls ?? 0,
      errors: row.errors ?? 0,
      errorRate: row.errorRate ?? 0,
      ms: row.ms ?? 0
    })),
    at: pick(payload, "at") ?? null
  };
}
async function load11(ctx) {
  const answer = await through(ctx.call, "toolUsage", { options: {} });
  if (isFailure(answer)) return answer;
  const folded = fold10(answer);
  if (!folded.available) return { code: "refused", message: pick(answer, "reason") ?? "tool usage unavailable" };
  return folded;
}
function preview11(data, ctx) {
  if (isFailure(data)) return failedCard(data, ctx);
  return {
    tone: data.errorRate >= 0.1 ? "warn" : "ok",
    headline: formatCount(data.calls),
    caption: ctx.t("wall.toolsCalls", { errors: data.errors }),
    figures: [
      { label: ctx.t("wall.toolsErrorRate"), value: `${(data.errorRate * 100).toFixed(1)}%`, percent: fractionToPercent(data.errorRate) },
      { label: ctx.t("wall.toolsArgTokens"), value: `\u2248 ${formatCount(data.argTokens)}` },
      { label: ctx.t("wall.toolsOutTokens"), value: `\u2248 ${formatCount(data.outTokens)}` },
      { label: ctx.t("wall.toolsDuration"), value: `${(data.ms / 1e3).toFixed(0)} s` }
    ]
  };
}
function detail11(data, ctx) {
  if (isFailure(data)) return { groups: [], note: data.message };
  return {
    groups: [{
      title: ctx.t("wall.toolsAll"),
      rows: data.tools.slice(0, 20).map((row) => ({
        label: row.name,
        value: `${formatCount(row.calls)} \xB7 ${(row.errorRate * 100).toFixed(0)}%`,
        percent: fractionToPercent(row.errorRate),
        tone: row.errorRate >= 0.1 ? "warn" : "ok"
      }))
    }]
  };
}
var toolsCard = {
  id: "tools",
  title: (ctx) => ctx.t("wall.card.tools"),
  glyph: "tools",
  span: [2, 1],
  refreshMs: 6e4,
  load: load11,
  preview: preview11,
  detail: detail11
};

// client/src/features/wall/cards.ts
var CARDS = [
  sessionsCard,
  deviceCard,
  tokenCard,
  networkCard,
  coreCard,
  storageCard,
  projectsCard,
  toolsCard,
  skillsCard,
  groupsCard,
  auditCard
];

// client/src/features/homepage/rpc.ts
var HOMEPAGE_NAMESPACE = "homepage";
function looksAbsent(text) {
  const haystack = text.toLowerCase();
  return haystack.includes("not found") || haystack.includes("unknown endpoint") || haystack.includes("unknown method") || haystack.includes("no endpoint") || haystack.includes("not registered") || haystack.includes("no such") || haystack.includes("unavailable");
}
function createHomepageRpc(readCall) {
  let status = "unknown";
  const listeners2 = /* @__PURE__ */ new Set();
  const settle = (next) => {
    if (next === status) return;
    status = next;
    for (const listener of [...listeners2]) listener();
  };
  const call = async (method, args) => {
    const invoke = readCall();
    if (invoke === null) {
      settle("absent");
      return { ok: false, code: "transport", message: "\u8FD9\u4E2A\u9875\u9762\u6CA1\u6709\u5171\u4EAB RPC \u901A\u9053" };
    }
    try {
      const frame = await invoke("/api", `${HOMEPAGE_NAMESPACE}/${method}`, { args: args ?? {} });
      if (frame !== void 0 && frame !== null && frame.ok === true) {
        settle("present");
        return { ok: true, value: frame.value };
      }
      const failure = frame?.error;
      const text = `${failure?.code ?? ""} ${failure?.message ?? ""}`.trim();
      if (looksAbsent(text)) {
        settle("absent");
        return { ok: false, code: "absent", message: failure?.message ?? failure?.code ?? "dsh-homepage \u4E0D\u5728\u573A" };
      }
      settle("present");
      return { ok: false, code: "refused", message: failure?.message ?? failure?.code ?? `${method} \u8C03\u7528\u5931\u8D25` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (looksAbsent(message)) {
        settle("absent");
        return { ok: false, code: "absent", message };
      }
      return { ok: false, code: "unreachable", message };
    }
  };
  const subscribe = (listener) => {
    listeners2.add(listener);
    return () => {
      listeners2.delete(listener);
    };
  };
  return { status: () => status, subscribe, call };
}
function channelCallFrom(ctx) {
  if (ctx === null || ctx === void 0) return null;
  let connection = null;
  try {
    connection = ctx.connection ?? (typeof ctx.get === "function" ? ctx.get("connection") : null);
  } catch {
    return null;
  }
  const rpc = connection?.rpc;
  const call = rpc?.call;
  if (typeof call !== "function" || typeof rpc !== "object" || rpc === null) return null;
  return (channel, endpoint, payload) => call.call(rpc, channel, endpoint, payload);
}

// client/src/features/system/metrics-client.ts
var METRICS_API = "/api/model-float/metrics";
var MEMORY_API = "/api/model-float/memory/release";
async function readMetrics() {
  const response = await fetch(METRICS_API, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  return response.json();
}
async function releaseMemory() {
  const response = await fetch(MEMORY_API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`.trim());
  return response.json();
}

// client/src/features/wall/wall.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var EMPTY_SLOT = { data: null, at: null, failure: null };
function Wall(props) {
  const { t, useSessions, ctx } = props;
  const [now, setNow] = (0, import_react4.useState)(() => Date.now());
  const [slots, setSlots] = (0, import_react4.useState)(() => Object.fromEntries(CARDS.map((card) => [card.id, EMPTY_SLOT])));
  const [expanded, setExpanded] = (0, import_react4.useState)(null);
  (0, import_react4.useEffect)(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1e3);
    return () => window.clearInterval(timer);
  }, []);
  const sessions = useSessions((state) => state);
  const sessionRows = (0, import_react4.useMemo)(() => {
    if (sessions === null || sessions === void 0) return [];
    return sessions.ids.map((id) => {
      const row = sessions.byId[id];
      if (row === void 0) return void 0;
      return { id, title: row.displayTitle ?? "", running: row.running === true };
    }).filter((row) => row !== void 0);
  }, [sessions]);
  const rpc = (0, import_react4.useMemo)(() => createHomepageRpc(() => channelCallFrom(ctx ?? null)), [ctx]);
  const sampler = (0, import_react4.useCallback)(() => readMetrics(), []);
  const wallCtx = (0, import_react4.useMemo)(() => ({
    t,
    now,
    sessions: sessionRows,
    call: rpc.call,
    sampler
  }), [t, now, sessionRows, rpc, sampler]);
  const refresh = (0, import_react4.useCallback)(async (card) => {
    try {
      const data = await card.load(wallCtx);
      setSlots((previous) => ({ ...previous, [card.id]: { data, at: Date.now(), failure: null } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSlots((previous) => ({ ...previous, [card.id]: { data: null, at: Date.now(), failure: { code: "unreachable", message } } }));
    }
  }, [wallCtx]);
  (0, import_react4.useEffect)(() => {
    const timers = [];
    for (const card of CARDS) {
      void refresh(card);
      if (card.refreshMs > 0) {
        const timer = setInterval(() => {
          void refresh(card);
        }, card.refreshMs);
        timers.push(timer);
      }
    }
    return () => {
      timers.forEach((timer) => clearInterval(timer));
    };
  }, [refresh]);
  (0, import_react4.useEffect)(() => {
    if (expanded === null) return void 0;
    const onKey = (event) => {
      if (event.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mf-wall", children: [
    CARDS.map((card) => {
      const slot = slots[card.id] ?? EMPTY_SLOT;
      const reading = card.preview(slot.failure ?? slot.data, wallCtx);
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: `mf-wall-card is-${reading.tone}`,
          onClick: () => card.detail !== void 0 && setExpanded(card.id),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(WallGlyph, { name: card.glyph }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-card-title", children: card.title(wallCtx) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-card-headline", children: reading.headline ?? "\u2014" }),
            reading.caption !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-card-caption", children: reading.caption }),
            reading.figures !== void 0 && reading.figures.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-card-figures", children: reading.figures.map((figure, index) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mf-wall-card-figure", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-card-figure-label", children: figure.label }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-card-figure-value", children: figure.value }),
              figure.percent !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-card-figure-bar", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-card-figure-fill", style: { width: `${Math.max(0, Math.min(100, figure.percent))}%` } }) })
            ] }, index)) }),
            reading.note !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-card-note", children: reading.note })
          ]
        },
        card.id
      );
    }),
    expanded !== null && (() => {
      const card = CARDS.find((c) => c.id === expanded);
      if (card === void 0 || card.detail === void 0) return null;
      const slot = slots[card.id] ?? EMPTY_SLOT;
      const detail12 = card.detail(slot.failure ?? slot.data, wallCtx);
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-detail", role: "dialog", "aria-modal": "true", onClick: () => setExpanded(null), children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mf-wall-detail-inner", onClick: (event) => event.stopPropagation(), children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: "mf-wall-detail-close", onClick: () => setExpanded(null), children: "\xD7" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-detail-title", children: card.title(wallCtx) }),
        detail12.note !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-detail-note", children: detail12.note }),
        detail12.groups.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "mf-wall-detail-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-detail-group-title", children: group.title }),
          group.rows.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: `mf-wall-detail-row${row.tone !== void 0 ? ` is-${row.tone}` : ""}`, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-detail-row-label", children: row.label }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "mf-wall-detail-row-value", children: row.value })
          ] }, rowIndex))
        ] }, index)),
        detail12.actions !== void 0 && detail12.actions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "mf-wall-detail-actions", children: detail12.actions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "button",
          {
            type: "button",
            className: `mf-wall-detail-action${action.confirm ? " is-confirm" : ""}`,
            onClick: async () => {
              if (action.confirm && !window.confirm(action.label)) return;
              try {
                const answer = await rpc.call(action.method, action.args);
                if (answer.ok && action.report !== void 0) {
                  const message = action.report(answer.value);
                  if (message !== "") window.alert(message);
                }
                void refresh(card);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : String(error));
              }
            },
            children: action.label
          },
          action.id
        )) })
      ] }) });
    })()
  ] });
}
function WallGlyph({ name }) {
  const paths = {
    sessions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3 6h18M3 12h18M3 18h12" }),
    device: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M7 7v10M12 7v10M17 7v10" })
    ] }),
    token: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "12", cy: "12", r: "9" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M12 7v10M9 10h6M9 14h6" })
    ] }),
    network: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "6", cy: "6", r: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "18", cy: "6", r: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("circle", { cx: "12", cy: "18", r: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M8 7l4 9M16 7l-4 9" })
    ] }),
    core: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M4 9h16M9 4v16" })
    ] }),
    storage: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3 7c0-1.5 4-3 9-3s9 1.5 9 3v10c0 1.5-4 3-9 3s-9-1.5-9-3z" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3 12c0 1.5 4 3 9 3s9-1.5 9-3" })
    ] }),
    projects: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M3 7h6l2 2h10v10H3z" }) }),
    tools: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M14.7 6.3a4 4 0 0 1 0 5.4L10 16.4l-3-3 4.7-4.7a4 4 0 0 1 3-2.4z" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M5 19l4-4" })
    ] }),
    skills: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" }) }),
    groups: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" })
    ] }),
    audit: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6z" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("path", { d: "M9 12l2 2 4-4" })
    ] })
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("svg", { className: "mf-wall-glyph", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: paths[name] ?? paths.device });
}

// client/src/features/lockscreen/lock-screen.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function LockScreen(props) {
  const { open, onClose, t, ctx } = props;
  const [now, setNow] = (0, import_react5.useState)(() => /* @__PURE__ */ new Date());
  (0, import_react5.useEffect)(() => {
    if (!open) return void 0;
    const timer = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
    return () => window.clearInterval(timer);
  }, [open]);
  (0, import_react5.useEffect)(() => {
    if (!open) return void 0;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return (0, import_react_dom.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mf-lock", role: "dialog", "aria-modal": "true", "aria-label": t("lock.title"), onClick: onClose, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mf-lock-inner", onClick: (event) => event.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { type: "button", className: "mf-lock-close", onClick: onClose, "aria-label": t("lock.close"), children: "\xD7" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Clock, { now }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Wall, { t, useSessions: props.useSessions, ctx })
    ] }) }),
    document.body
  );
}
function Clock({ now }) {
  const time = now.toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString(void 0, { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "mf-lock-clock", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mf-lock-time", children: time }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "mf-lock-date", children: date })
  ] });
}

// client/src/features/registry.ts
var ACTIONS = [
  {
    id: "free-model",
    icon: "whale",
    label: "\u767D\u5AD6\u6A21\u578B",
    kind: "toggle",
    run: () => void 0
  },
  {
    id: "lock-screen",
    icon: "lock",
    label: "\u4E00\u952E\u9501\u5C4F",
    kind: "toggle",
    run: () => void 0
  },
  {
    id: "memory",
    icon: "broom",
    label: "\u5185\u5B58\u91CA\u653E",
    kind: "momentary",
    run: () => void 0
  }
];

// client/src/features/free-model/placement.ts
var PLACEMENT_KEY = "dsh-model-float:placement:v1";
var WHALE_SIZE = 54;
var EDGE_GAP = 8;
var HOME_MARGIN = 22;
function clampPlacement(placement, viewportWidth, viewportHeight) {
  const maxX = Math.max(EDGE_GAP, viewportWidth - WHALE_SIZE - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, viewportHeight - WHALE_SIZE - EDGE_GAP);
  return {
    x: Math.min(maxX, Math.max(EDGE_GAP, placement.x)),
    y: Math.min(maxY, Math.max(EDGE_GAP, placement.y))
  };
}
function cornerPlacement(corner, viewportWidth, viewportHeight) {
  const home = HOME_MARGIN;
  const right = viewportWidth - WHALE_SIZE - home;
  const bottom = viewportHeight - WHALE_SIZE - home;
  switch (corner) {
    case "bottom-left":
      return { x: home, y: bottom };
    case "top-right":
      return { x: right, y: home };
    case "top-left":
      return { x: home, y: home };
    default:
      return { x: right, y: bottom };
  }
}
function readPlacement(viewportWidth, viewportHeight) {
  try {
    const raw = window.localStorage.getItem(PLACEMENT_KEY);
    if (raw === null) return cornerPlacement("bottom-right", viewportWidth, viewportHeight);
    const parsed = JSON.parse(raw);
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return cornerPlacement("bottom-right", viewportWidth, viewportHeight);
    }
    return clampPlacement({ x: parsed.x, y: parsed.y }, viewportWidth, viewportHeight);
  } catch {
    return cornerPlacement("bottom-right", viewportWidth, viewportHeight);
  }
}
function writePlacement(placement) {
  try {
    window.localStorage.setItem(PLACEMENT_KEY, JSON.stringify(placement));
  } catch {
  }
}

// client/src/features/free-model/use-free-model.ts
var import_react7 = require("react");

// client/src/features/free-model/probe.ts
var SWEEP_POLL_MS = 1500;
async function readGatewayPort(signal) {
  try {
    const response = await fetch(`${OFM_API}/chan-gateway`, {
      headers: { accept: "application/json" },
      ...signal === void 0 ? {} : { signal }
    });
    if (!response.ok) return 0;
    const payload = await response.json();
    const port = Number(payload.gateway?.port ?? 0);
    return Number.isInteger(port) && port > 0 ? port : 0;
  } catch {
    return 0;
  }
}
async function runSweep(port, targets, { signal, onProgress } = {}) {
  const started = await postSweep({ port, targets }, signal);
  if (started === null) return { verdicts: {}, error: "sweep-request-failed" };
  onProgress?.(started);
  if (started.error !== "") return { verdicts: {}, error: started.error };
  if (started.total === 0) return { verdicts: {}, error: "" };
  let status = started;
  while (status.running) {
    if (signal?.aborted === true) {
      await stopSweep(signal);
      break;
    }
    await delay(SWEEP_POLL_MS, signal);
    const next = await getSweep(signal);
    if (next === null) break;
    status = next;
    onProgress?.(status);
  }
  return { verdicts: { ...status.results }, error: status.error };
}
async function postSweep(plan, signal) {
  return request("/sweep", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(plan),
    ...signal === void 0 ? {} : { signal }
  });
}
async function getSweep(signal) {
  return request("/sweep", {
    headers: { accept: "application/json" },
    ...signal === void 0 ? {} : { signal }
  });
}
async function stopSweep(signal) {
  return request("/sweep/stop", {
    method: "POST",
    headers: { accept: "application/json" },
    ...signal === void 0 ? {} : { signal }
  });
}
var SWEEP_API = "/api/model-float";
async function request(path, init) {
  try {
    const response = await fetch(`${SWEEP_API}${path}`, init);
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      running: payload.running === true,
      total: Number(payload.total ?? 0),
      done: Number(payload.done ?? 0),
      error: String(payload.error ?? ""),
      startedAt: Number(payload.startedAt ?? 0),
      results: payload.results ?? {}
    };
  } catch {
    return null;
  }
}
function delay(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    function onAbort() {
      clearTimeout(timer);
      done();
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

// client/src/features/free-model/sweep.ts
var LANE_GATEWAY_PREFIX = "our-free-model/";
var MAX_SWEEP = 240;
function gatewayModelId(key, provider) {
  return provider === "" ? `${LANE_GATEWAY_PREFIX}${key}` : key;
}
function planSweep(lane, vendorModels, cache2, verdicts, now = Date.now()) {
  const targets = [];
  for (const row of lane) {
    if (row.hiddenByUser === true) continue;
    if (!needsAsking(row.id, verdicts, cache2, now)) continue;
    targets.push({ key: row.id, provider: "", label: row.name });
  }
  for (const [provider, models] of Object.entries(vendorModels)) {
    if (vendorFaulted(provider, models, verdicts)) continue;
    for (const model of models) {
      if (model.disabled === true || model.dead === true) continue;
      const key = probeKey(provider, model.id);
      if (!needsAsking(key, verdicts, cache2, now)) continue;
      targets.push({ key, provider, label: model.name });
    }
  }
  return targets.slice(0, MAX_SWEEP);
}
function applyProbe(verdicts, key, state, detail12, now = Date.now()) {
  verdicts[key] = { state, source: "gateway-probe", detail: detail12, at: now };
}
function needsAsking(key, verdicts, cache2, now) {
  const verdict = verdicts[key];
  if (verdict !== void 0 && verdict.state !== "unknown") return false;
  const stored = cache2[key];
  if (stored !== void 0 && stored.at > 0 && now - stored.at <= probeTtl(stored.state)) return false;
  return true;
}
function vendorFaulted(provider, models, verdicts) {
  for (const model of models) {
    if (model.disabled === true || model.dead === true) continue;
    const verdict = verdicts[probeKey(provider, model.id)];
    if (verdict !== void 0 && isVendorFault(verdict.state)) return true;
  }
  return false;
}

// client/src/features/free-model/verdict-store.ts
var import_react6 = require("react");
var EMPTY = Object.freeze({});
var MIN_READ_GAP_MS = 5e3;
var laneRows = [];
var cache = {};
var probes = {};
var snapshot = EMPTY;
var listeners = /* @__PURE__ */ new Set();
var inflight = null;
var lastReadAt = 0;
function fold11() {
  const table = {};
  for (const row of laneRows) {
    table[row.id] = bestVerdict(laneVerdict(row), cachedLaneVerdict(cache, row.id));
  }
  for (const key of Object.keys(cache)) {
    if (table[key] !== void 0) continue;
    const fresh = cachedVerdict(cache, key);
    if (fresh !== void 0) table[key] = fresh;
  }
  for (const [key, verdict] of Object.entries(probes)) table[key] = verdict;
  return table;
}
function sameAnswers(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (right === void 0) return false;
    if (left.state !== right.state || left.at !== right.at || left.detail !== right.detail) return false;
  }
  return true;
}
function sameRoster(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (right === void 0) return false;
    if (left.id !== right.id || left.availability !== right.availability) return false;
    if (left.availabilitySource !== right.availabilitySource || left.probedAt !== right.probedAt) return false;
    if (left.hiddenByUser !== right.hiddenByUser || left.detail !== right.detail) return false;
  }
  return true;
}
function reflow() {
  const next = fold11();
  if (sameAnswers(snapshot, next)) return;
  snapshot = next;
  for (const listener of listeners) listener();
}
function publishLaneModels(rows) {
  if (rows.length === 0 && laneRows.length > 0) return;
  if (sameRoster(laneRows, rows)) return;
  laneRows = rows;
  reflow();
}
function getVerdicts() {
  return snapshot;
}
function getCache() {
  return cache;
}
function refreshReadings(force = false) {
  if (inflight !== null) return inflight;
  if (!force && Date.now() - lastReadAt < MIN_READ_GAP_MS) return Promise.resolve();
  inflight = Promise.all([
    readLaneModels().catch(() => void 0),
    readAvailabilityCache().catch(() => void 0)
  ]).then(([rows, stored]) => {
    if (rows !== void 0 && rows.length > 0) laneRows = rows;
    if (stored !== void 0 && Object.keys(stored).length > 0) {
      cache = { ...cache, ...stored };
    }
    lastReadAt = Date.now();
    reflow();
  }).finally(() => {
    inflight = null;
  });
  return inflight;
}
function recordProbes(landed) {
  const next = { ...probes };
  for (const [key, row] of Object.entries(landed)) {
    if (row.state === "unknown") continue;
    applyProbe(next, key, normalise(row.state), row.detail, row.at);
  }
  probes = next;
  reflow();
}
function subscribeVerdicts(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function verdictSnapshot() {
  return snapshot;
}
function useVerdicts() {
  return (0, import_react6.useSyncExternalStore)(subscribeVerdicts, verdictSnapshot);
}
void refreshReadings();

// client/src/features/free-model/use-free-model.ts
var POLL_MS = 9e4;
function useFreeModel() {
  const [snapshot2, setSnapshot] = (0, import_react7.useState)(null);
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)("");
  const [switchOn, setSwitchOn] = (0, import_react7.useState)(false);
  const [hiddenVendors, setHiddenVendors] = (0, import_react7.useState)([]);
  const [switchPending, setSwitchPending] = (0, import_react7.useState)(false);
  const [sweeping, setSweeping] = (0, import_react7.useState)(false);
  const [sweepProgress, setSweepProgress] = (0, import_react7.useState)({ done: 0, total: 0 });
  const [sweepError, setSweepError] = (0, import_react7.useState)("");
  const mounted = (0, import_react7.useRef)(true);
  const snapshotRef = (0, import_react7.useRef)(null);
  const hiddenRef = (0, import_react7.useRef)([]);
  const sweepRef = (0, import_react7.useRef)(null);
  const refresh = (0, import_react7.useCallback)(() => {
    setLoading(true);
    const controller = new AbortController();
    void readSnapshot(controller.signal, new Set(hiddenRef.current)).then((result) => {
      if (!mounted.current) return;
      snapshotRef.current = result;
      setSnapshot(result);
      setError(result.error);
    }).catch((reason) => {
      if (!mounted.current) return;
      setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => {
      if (mounted.current) setLoading(false);
    });
  }, []);
  const verdicts = useVerdicts();
  (0, import_react7.useEffect)(() => {
    if (snapshot2 !== null) publishLaneModels(snapshot2.models);
  }, [snapshot2]);
  const hideRefusedModels = (0, import_react7.useCallback)(async () => {
    const current = snapshotRef.current;
    const table = getVerdicts();
    const hidden = {};
    const failures = [];
    for (const row of current?.vendors ?? []) {
      if (row.visibleModelCount === 0) continue;
      try {
        const models = await readVendorModels(row.vendor.id);
        const doomed = doomedModelIds(row.vendor.id, models, table, isUnusable(row));
        if (doomed.length === 0) continue;
        const result = await setVendorModelsDisabled(row.vendor.id, doomed, true);
        if (result.error !== "") {
          failures.push(`${row.vendor.name}\uFF1A${result.error}`);
          continue;
        }
        hidden[row.vendor.id] = doomed;
      } catch (err) {
        failures.push(`${row.vendor.name}\uFF1A${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (failures.length > 0 && Object.keys(hidden).length === 0) {
      throw new Error(failures.join("\uFF1B"));
    }
    return hidden;
  }, []);
  const runSweep2 = (0, import_react7.useCallback)(async () => {
    if (sweepRef.current !== null) return;
    const current = snapshotRef.current;
    if (current === null) return;
    const port = await readGatewayPort();
    if (port === 0) {
      setSweepError("no-gateway");
      return;
    }
    const vendorModels = {};
    for (const row of current.vendors) {
      if (row.visibleModelCount === 0) continue;
      try {
        const models = await readVendorModels(row.vendor.id);
        vendorModels[row.vendor.id] = models.map((model) => ({
          id: model.id,
          name: model.name,
          disabled: model.disabled,
          dead: model.dead
        }));
      } catch {
      }
    }
    const stored = getCache();
    const table = { ...getVerdicts() };
    const targets = planSweep(
      current.models.map((model) => ({
        id: model.id,
        name: model.name,
        availability: model.availability,
        availabilitySource: model.availabilitySource,
        detail: model.detail,
        probedAt: model.probedAt,
        hiddenByUser: model.hiddenByUser
      })),
      vendorModels,
      stored,
      table
    );
    if (targets.length === 0) {
      setSweepError("");
      return;
    }
    const controller = new AbortController();
    sweepRef.current = controller;
    setSweeping(true);
    setSweepError("");
    setSweepProgress({ done: 0, total: targets.length });
    const queue = targets.map((target) => ({
      key: target.key,
      modelId: gatewayModelId(target.key, target.provider)
    }));
    const { error: sweepFailure } = await runSweep(port, queue, {
      signal: controller.signal,
      onProgress: (status) => {
        setSweepProgress({ done: status.done, total: status.total });
        recordProbes(status.results);
      }
    });
    await refreshReadings(true);
    if (mounted.current) {
      setSweepError(sweepFailure);
      setSweeping(false);
    }
    sweepRef.current = null;
    refresh();
    if ((await readSwitch()).enabled) {
      try {
        const extra = await hideRefusedModels();
        if (Object.keys(extra).length > 0) {
          const state = await readSwitch();
          const merged = {};
          for (const [provider, ids] of Object.entries(state.hidden)) merged[provider] = [...ids];
          for (const [provider, ids] of Object.entries(extra)) {
            merged[provider] = [.../* @__PURE__ */ new Set([...merged[provider] ?? [], ...ids])];
          }
          await writeSwitch({ enabled: true, hidden: merged });
          if (mounted.current) refresh();
        }
      } catch {
      }
    }
  }, [refresh, hideRefusedModels]);
  const stopSweep2 = (0, import_react7.useCallback)(() => {
    sweepRef.current?.abort();
  }, []);
  (0, import_react7.useEffect)(() => {
    mounted.current = true;
    refresh();
    void refreshReadings(true);
    void readSwitch().then((state) => {
      if (!mounted.current) return;
      setSwitchOn(state.enabled);
      hiddenRef.current = Object.keys(state.hidden);
      setHiddenVendors(hiddenRef.current);
    });
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      sweepRef.current?.abort();
    };
  }, [refresh]);
  const setSwitch = (0, import_react7.useCallback)(async (on) => {
    setSwitchPending(true);
    try {
      if (on) {
        const hidden = await hideRefusedModels();
        await writeSwitch({ enabled: true, hidden });
        setSwitchOn(true);
        hiddenRef.current = Object.keys(hidden);
        setHiddenVendors(hiddenRef.current);
      } else {
        const state = await readSwitch();
        const remaining = {};
        for (const [provider, ids] of Object.entries(state.hidden)) {
          const result = await setVendorModelsDisabled(provider, ids, false);
          if (result.error === "") continue;
          const retired = /retired|已移除|不支持此渠道/i.test(result.error);
          if (!retired) remaining[provider] = [...ids];
        }
        await writeSwitch({ enabled: false, hidden: remaining });
        setSwitchOn(false);
        hiddenRef.current = Object.keys(remaining);
        setHiddenVendors(hiddenRef.current);
      }
      refresh();
    } finally {
      setSwitchPending(false);
    }
  }, [refresh, hideRefusedModels]);
  const doReleaseMemory = (0, import_react7.useCallback)(async () => {
    const result = await releaseMemory();
    refresh();
    return result;
  }, [refresh]);
  return {
    snapshot: snapshot2,
    vendors: snapshot2?.vendors ?? [],
    loading,
    error,
    switchOn,
    hiddenVendors,
    switchPending,
    refresh,
    setSwitch,
    releaseMemory: doReleaseMemory,
    verdicts,
    sweeping,
    sweepProgress,
    sweepError,
    runSweep: runSweep2,
    stopSweep: stopSweep2
  };
}

// client/src/float.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function ModelFloat(props) {
  const { t } = props;
  const freeModel = useFreeModel();
  const [viewport, setViewport] = (0, import_react8.useState)(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [placement, setPlacement] = (0, import_react8.useState)(() => readPlacement(window.innerWidth, window.innerHeight));
  const [ringOpen, setRingOpen] = (0, import_react8.useState)(false);
  const [cardOpen, setCardOpen] = (0, import_react8.useState)(false);
  const [lockOpen, setLockOpen] = (0, import_react8.useState)(false);
  const [hovered, setHovered] = (0, import_react8.useState)(void 0);
  const [notice, setNotice] = (0, import_react8.useState)("");
  const dragRef = (0, import_react8.useRef)(null);
  const rootRef = (0, import_react8.useRef)(null);
  const timerRef = (0, import_react8.useRef)(void 0);
  const cardOpenRef = (0, import_react8.useRef)(false);
  (0, import_react8.useEffect)(() => {
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setViewport({ width, height });
      setPlacement((current) => {
        const clamped = clampPlacement(current, width, height);
        writePlacement(clamped);
        return clamped;
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const actions = (0, import_react8.useMemo)(() => ACTIONS.map((action) => {
    if (action.id === "free-model") {
      return {
        ...action,
        detail: freeModel.vendors.length === 0 ? void 0 : `${freeModel.vendors.length}`,
        run: () => {
          setCardOpen((current) => !current);
          setRingOpen(false);
          return void 0;
        }
      };
    }
    if (action.id === "lock-screen") {
      return {
        ...action,
        run: () => {
          setLockOpen(true);
          setRingOpen(false);
          return void 0;
        }
      };
    }
    if (action.id === "memory") {
      return {
        ...action,
        // The Host answers with a reason code; the sentence is ours to write,
        // because only the page knows which language it is showing.
        run: async () => {
          const result = await freeModel.releaseMemory();
          const key = result.reason === "collected" || result.reason === "expose-gc-missing" ? `memory.${result.reason}` : "memory.done";
          setNotice(t(key, { mb: (result.freedBytes / 1024 / 1024).toFixed(1) }));
          return void 0;
        }
      };
    }
    return action;
  }), [freeModel, t]);
  const openSoon = (0, import_react8.useCallback)(() => {
    if (timerRef.current !== void 0) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (!cardOpenRef.current) setRingOpen(true);
    }, 160);
  }, []);
  const closeSoon = (0, import_react8.useCallback)(() => {
    if (timerRef.current !== void 0) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setRingOpen(false);
      setHovered(void 0);
    }, 700);
  }, []);
  const cardEnter = (0, import_react8.useCallback)(() => {
    if (timerRef.current !== void 0) window.clearTimeout(timerRef.current);
    setRingOpen(false);
    setHovered(void 0);
  }, []);
  const cardLeave = (0, import_react8.useCallback)(() => {
  }, []);
  (0, import_react8.useEffect)(() => () => {
    if (timerRef.current !== void 0) window.clearTimeout(timerRef.current);
  }, []);
  (0, import_react8.useEffect)(() => {
    cardOpenRef.current = cardOpen;
  }, [cardOpen]);
  (0, import_react8.useEffect)(() => {
    if (notice === "") return void 0;
    const timer = window.setTimeout(() => setNotice(""), 5e3);
    return () => window.clearTimeout(timer);
  }, [notice]);
  (0, import_react8.useEffect)(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setRingOpen(false);
      setCardOpen(false);
      setHovered(void 0);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  (0, import_react8.useEffect)(() => {
    if (!cardOpen) return void 0;
    const onPointerDown2 = (event) => {
      const root = rootRef.current;
      if (root === null) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      setCardOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown2, true);
    return () => document.removeEventListener("pointerdown", onPointerDown2, true);
  }, [cardOpen]);
  (0, import_react8.useEffect)(() => {
    if (!cardOpen) return void 0;
    const onBlur = () => {
      if (document.activeElement instanceof HTMLIFrameElement) setCardOpen(false);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [cardOpen]);
  const onPointerDown = (0, import_react8.useCallback)((event) => {
    if (event.button !== 0) return;
    const root = rootRef.current;
    if (root === null) return;
    const rect = root.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
    }
  }, []);
  const onPointerMove = (0, import_react8.useCallback)((event) => {
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) drag.moved = true;
    if (!drag.moved) return;
    setPlacement(clampPlacement(
      { x: drag.originX + dx, y: drag.originY + dy },
      window.innerWidth,
      window.innerHeight
    ));
  }, []);
  const endDrag = (0, import_react8.useCallback)((event) => {
    const drag = dragRef.current;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
    }
    if (drag === null) return;
    if (drag.moved) {
      setPlacement((current) => {
        const clamped = clampPlacement(current, window.innerWidth, window.innerHeight);
        writePlacement(clamped);
        return clamped;
      });
      return;
    }
    setRingOpen((current) => !current);
  }, []);
  const edges = (0, import_react8.useMemo)(() => {
    const centreX = placement.x + WHALE_SEAT / 2;
    const centreY = placement.y + WHALE_SEAT / 2;
    return {
      horizontal: centreX - OUTER_RADIUS <= 0 ? "left" : centreX + OUTER_RADIUS >= viewport.width ? "right" : "none",
      vertical: centreY - OUTER_RADIUS <= 0 ? "top" : centreY + OUTER_RADIUS >= viewport.height ? "bottom" : "none"
    };
  }, [placement.x, placement.y, viewport.width, viewport.height]);
  const cardSide = placement.x > viewport.width / 2 ? "left" : "right";
  const cardVertical = placement.y > viewport.height / 2 ? "up" : "down";
  return (0, import_react_dom2.createPortal)(
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "div",
        {
          className: "mf-root",
          ref: rootRef,
          style: { left: `${placement.x}px`, top: `${placement.y}px` },
          "data-mf-side": cardSide,
          "data-mf-vertical": cardVertical,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Ring,
              {
                actions,
                open: ringOpen,
                horizontal: edges.horizontal,
                vertical: edges.vertical,
                hovered,
                onHover: setHovered,
                onOpen: openSoon,
                onClose: closeSoon,
                onRun: (id) => {
                  void runAction(id);
                },
                t
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              VendorCard,
              {
                open: cardOpen,
                side: cardSide,
                vertical: cardVertical,
                freeModel,
                onOpen: cardEnter,
                onClose: cardLeave,
                t
              }
            ),
            notice !== "" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "mf-notice", role: "status", children: notice }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              "button",
              {
                type: "button",
                className: "mf-whale-btn",
                onPointerDown,
                onPointerMove,
                onPointerUp: endDrag,
                onPointerCancel: endDrag,
                onPointerEnter: openSoon,
                onPointerLeave: closeSoon,
                onFocus: openSoon,
                onBlur: () => {
                },
                onClick: (event) => event.preventDefault(),
                "aria-label": t("float.label"),
                "aria-expanded": ringOpen,
                title: t("float.label"),
                children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(WhaleMark, { size: WHALE_WIDTH })
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        LockScreen,
        {
          open: lockOpen,
          onClose: () => setLockOpen(false),
          useSessions: props.useSessions,
          t,
          ctx: props.ctx
        }
      )
    ] }),
    document.body
  );
  async function runAction(id) {
    const action = actions.find((candidate) => candidate.id === id);
    if (action === void 0) return;
    const message = await action.run();
    if (typeof message === "string") setNotice(message);
  }
}
var WHALE_SEAT = 54;
var WHALE_WIDTH = 54;

// client/src/styles.ts
var CSS = `
/*
 * DeepSeek's own brand blue, taken from the official site's stylesheet
 * (the --ds-color-brand token, #4d6bfe).
 */
.mf-root {
  --mf-brand-blue: #4d6bfe;
  position: fixed;
  /* Above every layer the app draws (splitters 99, pane resizers 100, the
     workbench title bar 40, the composer seat 35) and below its toasts
     (1200) \u2014 a notification is allowed to cover the float, a splitter is not.
     The float is portalled onto the body, so this value is not confined by
     the overlay layer's own stacking context. */
  z-index: 1000;
  pointer-events: none;
  font-family: var(--dsw-alias-font-family, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 1.45;
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-card-shell {
  /* The seat is 54 \xD7 54 \u2014 the same square the reference music ball uses \u2014 so
     the float is the same size and drags with the same hitbox.
     It is absolutely placed so it does not push the whale down the flow: the
     whale is the float's anchor, and the card is what hangs off it. */
  position: absolute;
  left: 0;
  top: 0;
  width: 54px;
  height: 54px;
  pointer-events: none;
}

/* The card opens beside the whale: on the whale's right when it sits on the
   left of the screen, on its left when it sits on the right. Vertically it
   opens upward from a whale in the lower half and downward from one in the
   upper half, so it never runs off the screen. */
.mf-root[data-mf-side="left"] .mf-card { right: 0; }
.mf-root[data-mf-side="right"] .mf-card { left: 0; }
/* The whale sits at the root's origin; the card hangs beside it. */
.mf-root > .mf-whale-btn { position: absolute; left: 0; top: 0; }
.mf-root[data-mf-vertical="up"] .mf-card { bottom: calc(100% + 10px); }
.mf-root[data-mf-vertical="down"] .mf-card { top: calc(100% + 10px); }
.mf-root[data-mf-side="left"] .mf-card { transform-origin: bottom left; }
.mf-root[data-mf-side="right"] .mf-card { transform-origin: bottom right; }
.mf-root[data-mf-vertical="down"] .mf-card { transform-origin: top left; }
.mf-root[data-mf-vertical="down"][data-mf-side="left"] .mf-card { transform-origin: top right; }

/* \u2500\u2500 the card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-card {
  position: absolute;
  pointer-events: auto;
  width: 320px;
  max-height: min(64vh, 520px);
  overflow: hidden auto;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
  opacity: 0;
  transform: translateY(6px) scale(0.98);
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
}
.mf-card-shell.is-open .mf-card {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .mf-card { transition: none; }
  .mf-whale { animation: none !important; }
}

.mf-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px 8px;
  position: sticky;
  top: 0;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94));
  z-index: 1;
}
.mf-card-head-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mf-card-head strong { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary, #1f2430); }
.mf-card-sub { font-size: 11.5px; color: var(--dsw-alias-label-secondary, #5b6472); }
.mf-card-actions { display: flex; gap: 4px; flex-shrink: 0; }

.mf-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
/* The master switch: one control that hides (or restores) every unusable
   vendor's models. It reads as a switch, not a button, because it is a state
   the user leaves on \u2014 and that state has to be legible at a glance. */
.mf-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px 0 3px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 11.5px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}
.mf-switch:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-switch:disabled { opacity: 0.5; cursor: default; }
.mf-switch.is-on {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #067647) 45%, transparent);
  color: var(--dsw-alias-state-success-primary, #067647);
}
.mf-switch-knob {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8a93a2);
  transition: background 140ms ease, transform 140ms ease;
}
.mf-switch.is-on .mf-switch-knob {
  background: var(--dsw-alias-state-success-primary, #067647);
  transform: translateX(1px);
}
.mf-switch-text { font-weight: 550; }

.mf-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-icon-btn:disabled { opacity: 0.45; cursor: default; }

.mf-text-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-text, #2f6feb);
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
}
.mf-text-btn:hover { text-decoration: underline; }

.mf-error {
  margin: 0 12px 8px;
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 11.5px;
  color: var(--dsw-alias-state-error-primary, #b42318);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent);
}

/* \u2500\u2500 the vendor table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-vendor-list { padding: 0 6px 4px; }

.mf-vendor {
  display: grid;
  grid-template-columns: 3px 1fr auto auto;
  align-items: center;
  gap: 9px;
  padding: 7px 6px;
  border-radius: 9px;
}
.mf-vendor + .mf-vendor { border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07)); }
.mf-vendor-stripe { width: 3px; height: 26px; border-radius: 2px; opacity: 0.9; }
.mf-vendor-main { display: flex; flex-direction: column; min-width: 0; }
.mf-vendor-name {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-models { color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-vendor-error {
  font-size: 10px;
  color: var(--dsw-alias-state-error-primary, #b42318);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-org {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-models { color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-vendor.is-hidden-models .mf-vendor-name { opacity: 0.6; }

/* The hide/restore button: one click takes a vendor's models out of (or back
   into) the chat composer's model picker. */
.mf-hide-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.mf-hide-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  border-color: var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-hide-btn.is-restore { color: var(--dsw-alias-state-success-primary, #067647); }
.mf-hide-btn:disabled { opacity: 0.45; cursor: default; }
.mf-vendor-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.mf-vendor-state { font-size: 10.5px; padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
.mf-vendor-state.is-on { color: var(--dsw-alias-state-success-primary, #067647); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #067647) 14%, transparent); }
.mf-vendor-state.is-idle { color: var(--dsw-alias-state-warn-primary, #b54708); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #b54708) 14%, transparent); }
.mf-vendor-state.is-closed { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 16%, transparent); }
.mf-vendor-state.is-hidden { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 16%, transparent); }
.mf-vendor-state.is-empty { color: var(--dsw-alias-state-error-primary, #b42318); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent); }
.mf-vendor-state.is-error { color: var(--dsw-alias-state-error-primary, #b42318); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent); }
.mf-vendor-state.is-broken { color: var(--dsw-alias-state-error-primary, #b42318); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent); }
.mf-vendor-state.is-unknown { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 14%, transparent); }
.mf-vendor-balance {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
}
.mf-vendor.is-closed .mf-vendor-name,
.mf-vendor.is-idle .mf-vendor-name,
.mf-vendor.is-unknown .mf-vendor-name { opacity: 0.72; }

.mf-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07));
}
.mf-foot-time { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8a93a2); }

.mf-empty { margin: 0; padding: 10px 12px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-note {
  margin: 0 12px 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
}

/* \u2500\u2500 the per-model list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-model-list {
  border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07));
  padding: 6px 8px 10px;
  max-height: 200px;
  overflow: auto;
}
.mf-model {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 8px;
  padding: 3px 4px;
  border-radius: 6px;
}
.mf-model-name {
  font-size: 11.5px;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-model-state { font-size: 10.5px; white-space: nowrap; }
.mf-model-detail {
  grid-column: 1 / -1;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-model.is-available .mf-model-state { color: var(--dsw-alias-state-success-primary, #067647); }
.mf-model.is-region-blocked .mf-model-state { color: var(--dsw-alias-state-warn-primary, #b54708); }
.mf-model.is-unavailable .mf-model-state { color: var(--dsw-alias-state-error-primary, #b42318); }
.mf-model.is-throttled .mf-model-state { color: var(--dsw-alias-state-warn-primary, #b54708); }
.mf-model.is-no-credit .mf-model-state,
.mf-model.is-no-credential .mf-model-state { color: var(--dsw-alias-state-warn-primary, #b54708); }
.mf-model.is-unknown .mf-model-state { color: var(--dsw-alias-label-secondary, #667085); }
.mf-model.is-unavailable .mf-model-name,
.mf-model.is-unknown .mf-model-name { opacity: 0.7; }

/* The probe button sits left of refresh and the switch. Probing is the only
   control that spends real requests, so it carries the accent while there is
   something to ask, dims when every model has a verdict, and shows its
   progress as done/total while it runs. */
.mf-probe-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  width: auto;
  padding: 0 5px;
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}
.mf-probe-btn:not(:disabled) {
  color: var(--dsw-alias-brand-text, #2f6feb);
  border-color: color-mix(in srgb, var(--dsw-alias-brand-text, #2f6feb) 45%, transparent);
}
.mf-probe-btn:disabled { opacity: 0.45; }
.mf-probe-btn.is-running {
  color: var(--dsw-alias-state-success-primary, #067647);
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #067647) 55%, transparent);
}
.mf-probe-glyph { display: block; }

/* \u2500\u2500 the whale \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-whale-btn {
  pointer-events: auto;
  position: relative;
  width: 54px;
  height: 54px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  touch-action: none;
  /* Centre the wide mark in the square seat, the way the reference ball
     centres its icon. */
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.42));
  transition: transform 160ms ease;
}
.mf-whale-btn:active { cursor: grabbing; transform: scale(0.96); }
.mf-card-shell.is-open .mf-whale-btn { transform: scale(1.06); }
.mf-whale-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-text, #2f6feb);
  outline-offset: 3px;
}

/* The official mark: one path, so the whole whale animates as one piece. */
.mf-whale {
  display: block;
  overflow: visible;
  /* The mark spans the seat's full width; its own height follows the viewBox
     aspect, and the flex seat centres it vertically. */
  width: 54px;
  height: auto;
  /*
   * At rest the whale wears the shell's neutral ink, the way the sidebar's
   * brand mark does. When the card opens it takes DeepSeek's own brand blue
   * (the --ds-color-brand token on deepseek.com), so the float visibly
   * "wakes up" into its official colours the moment it is showing what it
   * knows.
   */
  color: var(--dsw-alias-label-primary, #f9fafb);
  transition: color 220ms ease;
  animation: mf-swim 3.8s ease-in-out infinite;
}
.mf-card-shell.is-open .mf-whale {
  color: var(--mf-brand-blue, #4d6bfe);
}

@keyframes mf-swim {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-4px) rotate(1.5deg); }
}

/* \u2500\u2500 the ring \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* The ring is centred on the *whale*, which is 54 px wide: the seat's own
   centre, not the shell's corner. */
.mf-ring {
  position: absolute;
  left: 27px;
  top: 27px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  overflow: visible;
  animation: mf-ring-in 160ms ease-out;
}

@keyframes mf-ring-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.82); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* The band behind the wedges: a soft, blurred disc that reads as glass
   rather than as a flat plate. The wedges are drawn on top of it, so the gaps
   between them still look like part of the ring. */
/* The pointer target. Transparent but painted, so it takes events where the
   drawing has holes; never visible. */
.mf-ring-hit {
  fill: transparent;
  stroke: none;
}

.mf-ring-band {
  /* The surface the dialog and the card are drawn on, held back to a
     translucent pane so whatever sits behind the float reads through the
     ring \u2014 the ring is a menu over the app, not a hole cut in it. */
  fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94)) 84%, transparent);
  /* No stroke: the band is a closed path, so stroking it would also draw its
     two radial edges \u2014 the straight seam that appeared above the whale. */
  stroke: none;
  filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.3));
}

/* The ring's edge, inner and outer, as open arcs: a border without the
   radial seams. A translucent pane with only its outer edge stroked reads
   as a puddle rather than as a ring, so both radii are drawn. */
.mf-ring-rim,
.mf-ring-inner {
  fill: none;
  stroke: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
  stroke-width: 1;
  pointer-events: none;
}

.mf-ring-wedge-group { cursor: pointer; }
.mf-ring-wedge {
  fill: transparent;
  stroke: transparent;
  stroke-width: 1;
  transition: fill 130ms ease;
}
.mf-ring-wedge:hover,
.mf-ring-wedge.is-active {
  /* A wash of the brand colour over the glass, not a second surface: the
     wedge is still part of the ring, it is just the part being pointed at. */
  fill: color-mix(in srgb, var(--mf-brand-blue, #4d6bfe) 22%, transparent);
}
.mf-ring-wedge.is-disabled { cursor: default; opacity: 0.35; }

/* The chip is the pointer's target: an SVG has no background, so the parts
   of it that are not painted do not receive pointer events at all. Letting
   the glyph take them is what makes a wedge clickable where its chip is. */
.mf-ring-glyph {
  pointer-events: auto;
  user-select: none;
  cursor: pointer;
  transition: filter 120ms ease;
}
/* The chip carries its own colour, so "active" is not a tint but a lift:
   the glass catching more light than its neighbours. */
.mf-ring-glyph.is-active {
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45))
    brightness(1.12) saturate(1.08);
}

/* \u2500\u2500 the lock screen \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-lock {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 40px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(28, 30, 46, 0.92), rgba(8, 9, 14, 0.97));
  backdrop-filter: blur(26px) saturate(120%);
  color: #f3f5fb;
  font-family: var(--dsw-alias-font-family, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif);
  animation: mf-lock-in 200ms ease-out;
}

@keyframes mf-lock-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mf-lock-close {
  position: absolute;
  top: 22px;
  right: 26px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.72);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.mf-lock-close:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }

.mf-lock-clock { text-align: center; }
.mf-lock-time {
  font-size: clamp(76px, 15vw, 176px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);
}
.mf-lock-date { margin-top: 14px; font-size: 17px; font-weight: 500; color: rgba(255, 255, 255, 0.72); }


.mf-lock-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px 30px;
  /* Wide enough for the network line at its worst: the read and write rates
     together, each with a unit, wrap onto two lines in a narrower grid. */
  width: min(900px, 92vw);
  padding: 20px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.mf-lock-metric { display: flex; flex-direction: column; gap: 5px; }
.mf-lock-metric-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.mf-lock-metric-value {
  font-size: 20px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  /* A rate that changes digits must not push the layout around. */
  white-space: nowrap;
}
.mf-lock-meter { display: block; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
.mf-lock-meter-fill { display: block; height: 100%; background: var(--mf-brand-blue, #4d6bfe); transition: width 400ms ease; }

.mf-lock-sessions { width: min(900px, 92vw); }
.mf-lock-sessions-title { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); margin-bottom: 8px; }
.mf-lock-sessions ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.mf-lock-sessions li { display: flex; align-items: center; gap: 9px; font-size: 14px; color: rgba(255, 255, 255, 0.86); }
.mf-lock-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.8); }
.mf-lock-session-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mf-lock-muted { color: rgba(255, 255, 255, 0.42); font-size: 13px; }

/* \u2500\u2500 the card wall \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-wall {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  width: min(1200px, 92vw);
  max-height: 60vh;
  overflow-y: auto;
  padding: 8px;
}

.mf-wall-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
}
.mf-wall-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}
.mf-wall-card.is-ok { border-left: 3px solid #34d399; }
.mf-wall-card.is-warn { border-left: 3px solid #fbbf24; }
.mf-wall-card.is-bad { border-left: 3px solid #f87171; }
.mf-wall-card.is-idle { border-left: 3px solid rgba(255, 255, 255, 0.3); }

.mf-wall-glyph {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0.4;
}
.mf-wall-card-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}
.mf-wall-card-headline {
  font-size: 28px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.mf-wall-card-caption {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
.mf-wall-card-figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 4px;
}
.mf-wall-card-figure {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mf-wall-card-figure-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}
.mf-wall-card-figure-value {
  font-size: 14px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.mf-wall-card-figure-bar {
  display: block;
  height: 2px;
  border-radius: 1px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-top: 2px;
}
.mf-wall-card-figure-fill {
  display: block;
  height: 100%;
  background: currentColor;
  transition: width 300ms ease;
}
.mf-wall-card-note {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

/* \u2500\u2500 the detail overlay \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.mf-wall-detail {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  animation: mf-lock-in 200ms ease-out;
}
.mf-wall-detail-inner {
  position: relative;
  width: min(700px, 90vw);
  max-height: 80vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(28, 30, 46, 0.95);
  color: #f3f5fb;
}
.mf-wall-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
}
.mf-wall-detail-close:hover {
  background: rgba(255, 255, 255, 0.15);
}
.mf-wall-detail-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
.mf-wall-detail-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
}
.mf-wall-detail-group {
  margin-bottom: 16px;
}
.mf-wall-detail-group-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}
.mf-wall-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.mf-wall-detail-row:last-child {
  border-bottom: none;
}
.mf-wall-detail-row.is-ok .mf-wall-detail-row-value { color: #34d399; }
.mf-wall-detail-row.is-warn .mf-wall-detail-row-value { color: #fbbf24; }
.mf-wall-detail-row.is-bad .mf-wall-detail-row-value { color: #f87171; }
.mf-wall-detail-row.is-idle .mf-wall-detail-row-value { color: rgba(255, 255, 255, 0.5); }
.mf-wall-detail-row-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
.mf-wall-detail-row-value {
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.mf-wall-detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.mf-wall-detail-action {
  flex: 1;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms;
}
.mf-wall-detail-action:hover {
  background: rgba(255, 255, 255, 0.12);
}
.mf-wall-detail-action.is-confirm {
  border-color: #f87171;
  color: #f87171;
}


/* \u2500\u2500 the action notice \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/* A screen-anchored toast, not a bubble on the float.
   Anchored to the float it landed exactly where the ring's wedges are, and
   being clickable it swallowed the ring's own clicks \u2014 an action's result
   message would then block the very menu that produced it.
   Anchoring it to the viewport keeps it clear of the ring wherever the float
   has been dragged, and pointer-events: none means it can never intercept a
   click wherever the two happen to overlap. */
.mf-notice {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  max-width: 340px;
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, rgba(44, 44, 46, 0.94));
  border: 1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.12));
  color: var(--dsw-alias-label-primary, #f9fafb);
  font-size: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.36);
  pointer-events: none;
  animation: mf-notice-in 180ms ease-out;
}

@keyframes mf-notice-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
/* \u2500\u2500 the composer model list \u2500\u2500 */
/*
 * The trigger keeps the composer's own proportions: 28 px tall, 13 px label,
 * no chrome until hover. The list is portalled onto the body, so its own
 * z-index puts it above the composer seat without inheriting that seat's
 * stacking context.
 */
.mf-picker-root {
  position: relative;
  min-width: 0;
  max-width: min(360px, 45cqw);
}
.mf-picker-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  height: 28px;
  padding: 0 4px 0 8px;
  border: none;
  border-radius: var(--dsw-radius-sm, 6px);
  background: 0 0;
  outline: none;
  color: var(--dsw-alias-label-secondary, #667085);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  cursor: pointer;
}
.mf-picker-trigger:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
}
.mf-picker-trigger:disabled {
  color: var(--dsw-alias-label-dimmed, #98a2b3);
  cursor: default;
}
.mf-picker-label {
  display: var(--dsh-composer-model-text-display, block);
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/*
 * A narrow composer gives the model seat no room for a name. The shell's
 * control row measures itself and marks that moment with data-model-compact,
 * published as a pair of inherited custom properties; the native seat answers
 * it by trading the model name for a glyph. Honoring the same two properties
 * is what makes this seat collapse on exactly the same frame as the native
 * one, instead of pushing the whole row onto a second line.
 */
.mf-picker-effort {
  display: var(--dsh-composer-model-text-display, block);
  overflow: hidden;
  min-width: 0;
  color: var(--dsw-alias-label-caption, #98a2b3);
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1000;
}
.mf-picker-trigger-icon {
  display: var(--dsh-composer-model-icon-display, none);
  flex: none;
  color: var(--dsw-alias-label-tertiary, #98a2b3);
}
.mf-picker-chevron {
  flex: none;
  color: var(--dsw-alias-label-caption, #98a2b3);
  transition: transform 120ms;
}
.mf-picker-chevron.is-open {
  transform: rotate(180deg);
}
/*
 * The verdict dot. Its colour is the whole message at 6 px, and the hit area
 * around it is inert: the row is the button, not the dot.
 */
.mf-picker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
  background: currentColor;
}
.mf-picker-dot.is-ok {
  color: var(--dsw-alias-state-success-primary, #12b76a);
  background: var(--dsw-alias-state-success-primary, #12b76a);
}
.mf-picker-dot.is-refused {
  color: var(--dsw-alias-state-error-primary, #f04438);
  background: var(--dsw-alias-state-error-primary, #f04438);
}
.mf-picker-dot.is-unknown {
  color: var(--dsw-alias-label-caption, #98a2b3);
  background: var(--dsw-alias-label-caption, #98a2b3);
  opacity: 0.5;
}
.mf-picker-menu {
  position: fixed;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: max-content;
  min-width: min(260px, 100vw - 32px);
  max-width: min(440px, 100vw - 32px);
  max-height: min(440px, 60vh);
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, rgba(15, 23, 42, 0.1));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  box-shadow: var(--dsw-elevation-menu, 0 12px 32px rgba(0, 0, 0, 0.24));
  color: var(--dsw-alias-label-primary, #101828);
  font-size: 13px;
}
.mf-picker-search {
  padding: 5px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(15, 23, 42, 0.16));
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: inherit;
  font: inherit;
  outline: none;
}
.mf-picker-list {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
}
.mf-picker-row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: 0 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.mf-picker-row:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05));
}
.mf-picker-row:disabled {
  opacity: 0.6;
  cursor: default;
}
.mf-picker-row.is-selected {
  background: var(--dsw-alias-interactive-bg-selected, rgba(77, 107, 254, 0.12));
}
.mf-picker-row-name {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mf-picker-row-check {
  display: flex;
  align-items: center;
  margin-left: auto;
  color: var(--dsw-alias-state-business-primary, #4d6bfe);
}
.mf-picker-note {
  padding: 6px 8px;
  color: var(--dsw-alias-label-caption, #98a2b3);
  font-size: 12px;
}
.mf-picker-note.is-error {
  display: flex;
  color: var(--dsw-alias-state-error-primary, #f04438);
  align-items: center;
  gap: 8px;
}
.mf-picker-note.is-warning {
  color: var(--dsw-alias-state-warning-primary, #f79009);
}
/*
 * Sticky group header: the vendor name stays pinned while its models scroll,
 * mirroring the native model list's section headers.
 */
.mf-picker-group {
  position: relative;
}
.mf-picker-group-name {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 2px;
  color: var(--dsw-alias-label-caption, #98a2b3);
  font-size: 11px;
  font-weight: 600;
  background: var(--dsw-alias-bg-layer-2, #ffffff);
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(15, 23, 42, 0.1));
}
.mf-picker-group-balance {
  margin-left: 10px;
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-secondary, #667085);
}
/*
 * Footer bar holding the master switch, refresh and probe buttons, so the
 * picker is the single place where both verdicts and controls live.
 */
.mf-picker-footer {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(15, 23, 42, 0.1));
  background: var(--dsw-alias-bg-layer-2, #ffffff);
}
.mf-picker-footer-btn {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(15, 23, 42, 0.16));
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  color: var(--dsw-alias-label-primary, #101828);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.mf-picker-footer-btn:hover:not(:disabled) {
  border-color: var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.28));
}
.mf-picker-footer-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.mf-picker-footer-btn.is-on {
  border-color: var(--dsw-alias-state-error-primary, #f04438);
  color: var(--dsw-alias-state-error-primary, #f04438);
}
.mf-picker-footer-btn.is-sweeping {
  border-color: var(--dsw-alias-state-warning-primary, #f79009);
  color: var(--dsw-alias-state-warning-primary, #f79009);
}
.mf-picker-retry {
  margin-left: auto;
  padding: 2px 8px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: 0 0;
  color: inherit;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.mf-picker-efforts {
  border-top: 1px solid var(--dsw-alias-border-l1, rgba(15, 23, 42, 0.1));
  padding-top: 2px;
}
.mf-picker-effort-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 8px 6px;
}
.mf-picker-effort-chip {
  padding: 3px 8px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(15, 23, 42, 0.16));
  border-radius: 999px;
  background: 0 0;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.mf-picker-effort-chip.is-selected {
  border-color: var(--dsw-alias-state-business-primary, #4d6bfe);
  color: var(--dsw-alias-state-business-primary, #4d6bfe);
}
.mf-picker-effort-chip:disabled {
  opacity: 0.6;
  cursor: default;
}
`;

// client/src/features/free-model/composer-model-picker.tsx
var import_react9 = __toESM(require("react"), 1);
var import_react_dom3 = require("react-dom");

// client/src/features/free-model/composer-keys.ts
var LANE_ROUTES = ["our-free-model", "our-free-model-region"];
function isLaneRoute(provider) {
  return LANE_ROUTES.includes(provider);
}
function pickerProbeKey(provider, model) {
  return isLaneRoute(provider) ? model : probeKey(provider, model);
}

// client/src/features/free-model/verdict-copy.ts
function verdictLabel(state, t) {
  switch (state) {
    case "available":
      return t("model.available");
    case "region-blocked":
      return t("model.regionBlocked");
    case "unavailable":
      return t("model.unavailable");
    case "throttled":
      return t("model.throttled");
    case "no-credit":
      return t("model.noCredit");
    case "no-credential":
      return t("model.noCredential");
    default:
      return t("model.untested");
  }
}
function verdictTone(state) {
  if (state === "available") return "ok";
  if (state === void 0 || state === "unknown") return "unknown";
  return "refused";
}

// client/src/features/free-model/composer-model-picker.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function shortUnit(unit) {
  switch (unit) {
    case "credits":
      return " cr";
    case "dollars":
      return "$";
    case "tokens":
      return " tk";
    case "quota":
      return "";
    default:
      return "";
  }
}
function groupTitle(id, name, t) {
  return id === "deepseek-account" ? t("picker.account") : name;
}
function VerdictDot({ tone }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: `mf-picker-dot is-${tone}`, "aria-hidden": "true" });
}
function verdictFor(verdicts, provider, model) {
  const key = pickerProbeKey(provider, model);
  const direct = verdicts[key];
  if (direct !== void 0) return direct;
  if (!isLaneRoute(provider)) return void 0;
  for (const candidate of laneCacheKeys(verdicts, model)) {
    const row = verdicts[candidate];
    if (row !== void 0) return row;
  }
  return void 0;
}
function Chevron({ open }) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "svg",
    {
      className: `mf-picker-chevron ${open ? "is-open" : ""}`,
      width: "12",
      height: "12",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M6 9l6 6 6-6" })
    }
  );
}
function Check() {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    "svg",
    {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.4",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M5 12.5l4.5 4.5L19 7.5" })
    }
  );
}
function ModelGlyph() {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
    "svg",
    {
      className: "mf-picker-trigger-icon",
      width: "16",
      height: "16",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      focusable: "false",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("rect", { x: "7.5", y: "7.5", width: "9", height: "9", rx: "2" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M10 3.8v2.2M14 3.8v2.2M10 18v2.2M14 18v2.2M3.8 10h2.2M3.8 14h2.2M18 10h2.2M18 14h2.2" })
      ]
    }
  );
}
function ComposerModelPicker(props) {
  const { locked, available, directory, load: load12, select, t } = props;
  const state = import_react9.default.useSyncExternalStore(
    (0, import_react9.useCallback)((fn) => directory.subscribe(fn), [directory]),
    (0, import_react9.useCallback)(() => directory.getSnapshot(), [directory])
  );
  const verdicts = useVerdicts();
  const [open, setOpen] = (0, import_react9.useState)(false);
  const [query, setQuery] = (0, import_react9.useState)("");
  const [menuPos, setMenuPos] = (0, import_react9.useState)(null);
  const [error, setError] = (0, import_react9.useState)("");
  const rootRef = (0, import_react9.useRef)(null);
  const triggerRef = (0, import_react9.useRef)(null);
  const menuRef = (0, import_react9.useRef)(null);
  const searchRef = (0, import_react9.useRef)(null);
  const id = import_react9.default.useId();
  const groups = state.groups;
  const busy = state.pending !== null || state.status === "selecting";
  const current = state.current;
  const currentOption = (0, import_react9.useMemo)(() => {
    if (current === null) return void 0;
    for (const group of groups) {
      if (group.id !== current.provider) continue;
      const hit = group.models.find((model) => model.id === current.model);
      if (hit !== void 0) return { group, model: hit };
    }
    return void 0;
  }, [groups, current]);
  const currentReasoning = currentOption?.model.reasoning;
  const currentEffort = current?.reasoningEffort ?? currentReasoning?.defaultEffort;
  const choices = (0, import_react9.useMemo)(() => {
    const needle = query.trim().toLowerCase();
    const rows = [];
    for (const group of groups) {
      for (const model of group.models) {
        if (needle !== "" && !model.name.toLowerCase().includes(needle)) continue;
        const verdict = verdictFor(verdicts, group.id, model.id);
        const state_ = verdict?.state;
        rows.push({
          groupId: group.id,
          groupName: groupTitle(group.id, group.name, t),
          model,
          tone: verdictTone(state_),
          title: state_ === void 0 || state_ === "unknown" ? t("picker.untested") : verdict?.detail !== void 0 && verdict.detail !== "" ? `${verdictLabel(state_, t)} \xB7 ${verdict.detail}` : verdictLabel(state_, t)
        });
      }
    }
    return rows;
  }, [groups, verdicts, query, t]);
  const grouped = (0, import_react9.useMemo)(() => {
    const order = [];
    const byGroup = /* @__PURE__ */ new Map();
    for (const row of choices) {
      const bucket = byGroup.get(row.groupId);
      if (bucket === void 0) {
        order.push(row.groupId);
        byGroup.set(row.groupId, [row]);
        continue;
      }
      bucket.push(row);
    }
    return order.map((groupId) => byGroup.get(groupId));
  }, [choices]);
  const showSearch = groups.reduce((sum, group) => sum + group.models.length, 0) > 4;
  const freeModel = useFreeModel();
  const vendorBalance = (0, import_react9.useMemo)(
    () => new Map(freeModel.vendors.map((v) => [v.vendor.id, { balance: v.balance, unit: v.vendor.unit }])),
    [freeModel.vendors]
  );
  (0, import_react9.useEffect)(() => {
    if (available && state.status === "idle") load12();
  }, [available, state.status, load12]);
  (0, import_react9.useEffect)(() => {
    void refreshReadings(true);
  }, []);
  (0, import_react9.useLayoutEffect)(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect === void 0) return;
      const width = menuRef.current?.offsetWidth ?? 0;
      const height = menuRef.current?.offsetHeight ?? 0;
      let left = rect.right - width;
      let top = rect.top - 8 - height;
      if (width > 0) left = Math.min(Math.max(left, 12), window.innerWidth - width - 12);
      if (height > 0) top = Math.min(Math.max(top, 12), window.innerHeight - height - 12);
      setMenuPos({ left, top });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, choices.length, state.status]);
  (0, import_react9.useEffect)(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (rootRef.current?.contains(event.target) === true) return;
      if (menuRef.current?.contains(event.target) === true) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, [open]);
  (0, import_react9.useEffect)(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);
  const close = (0, import_react9.useCallback)((restoreFocus) => {
    setOpen(false);
    setQuery("");
    if (!restoreFocus) return;
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);
  const submit = (0, import_react9.useCallback)((selection) => {
    setError("");
    void select(selection).then((result) => {
      if (result === void 0) return;
      if (result.ok) {
        close(true);
        return;
      }
      const failure = result.error;
      setError(failure === void 0 ? t("picker.failed") : failure.code === "session/writer-held" ? t("picker.sessionInUse") : `${failure.code}: ${failure.message}`);
    });
  }, [select, close, t]);
  const choose = (0, import_react9.useCallback)((groupId, model) => {
    if (current?.provider === groupId && current.model === model.id) {
      close(true);
      return;
    }
    const effort = model.reasoning?.defaultEffort;
    submit({
      provider: groupId,
      model: model.id,
      ...effort === void 0 ? {} : { reasoningEffort: effort }
    });
  }, [current, submit, close]);
  const chooseEffort = (0, import_react9.useCallback)((effort) => {
    if (current === null) return;
    if (currentEffort === effort) {
      close(true);
      return;
    }
    submit({
      provider: current.provider,
      model: current.model,
      ...effort === void 0 ? {} : { reasoningEffort: effort }
    });
  }, [current, currentEffort, submit, close]);
  const onKeyDown = (0, import_react9.useCallback)((event) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    close(true);
  }, [open, close]);
  if (!available) return null;
  const waiting = current === null && state.status === "loading";
  const label = waiting ? t("picker.loading") : currentOption?.model.name ?? (current === null ? t("picker.placeholder") : `${current.provider}/${current.model}`);
  const effortName = currentReasoning === void 0 ? void 0 : currentEffort === void 0 ? t("picker.providerDefault") : currentReasoning.efforts.find((level) => level.id === currentEffort)?.name ?? currentEffort;
  const triggerTone = current === null ? verdictTone(void 0) : verdictTone(verdicts[pickerProbeKey(current.provider, current.model)]?.state);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-root", ref: rootRef, onKeyDown, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: "mf-picker-trigger",
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        "aria-controls": open ? `${id}-menu` : void 0,
        title: current === null ? t("picker.open") : `${label}${effortName === void 0 ? "" : ` \xB7 ${effortName}`}`,
        disabled: locked,
        onClick: () => {
          if (open) {
            close(true);
            return;
          }
          setError("");
          setOpen(true);
          load12();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(VerdictDot, { tone: triggerTone }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ModelGlyph, {}),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "mf-picker-label", children: label }),
          effortName !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "mf-picker-effort", children: effortName }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Chevron, { open })
        ]
      }
    ),
    open && (0, import_react_dom3.createPortal)(
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
        "div",
        {
          ref: menuRef,
          id: `${id}-menu`,
          className: "mf-picker-menu",
          style: menuPos ?? { visibility: "hidden", left: 0, top: 0 },
          role: "dialog",
          "aria-label": t("picker.menu"),
          onKeyDown,
          children: [
            showSearch && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
              "input",
              {
                ref: searchRef,
                className: "mf-picker-search",
                type: "search",
                value: query,
                placeholder: t("picker.search"),
                "aria-label": t("picker.search"),
                onChange: (event) => setQuery(event.target.value)
              }
            ),
            state.status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "mf-picker-note", children: t("picker.loading") }),
            state.error !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-note is-error", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: t("picker.groupFailed", { name: t("picker.menu"), message: state.error }) }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "mf-picker-retry", onClick: load12, children: t("picker.retry") })
            ] }),
            error !== "" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "mf-picker-note is-error", children: error }),
            state.failures.map((failure) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "mf-picker-note is-warning", children: t("picker.groupFailed", { name: groupTitle(failure.id, failure.name, t), message: failure.message }) }, failure.id)),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-list", role: "listbox", "aria-label": t("picker.menu"), children: [
              grouped.map((rows) => {
                const groupId = rows[0].groupId;
                const balanceInfo = vendorBalance.get(groupId);
                const balanceText = balanceInfo === void 0 ? "" : balanceInfo.balance === null ? "" : `${balanceInfo.balance}${shortUnit(balanceInfo.unit)}`;
                return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-group", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-group-name", children: [
                    rows[0].groupName,
                    balanceText !== "" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "mf-picker-group-balance", children: balanceText })
                  ] }),
                  rows.map((row) => {
                    const selected = current?.provider === row.groupId && current?.model === row.model.id;
                    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(
                      "button",
                      {
                        type: "button",
                        role: "option",
                        "aria-selected": selected,
                        className: `mf-picker-row ${selected ? "is-selected" : ""}`,
                        title: row.title,
                        disabled: busy,
                        onClick: () => choose(row.groupId, row.model),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(VerdictDot, { tone: row.tone }),
                          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "mf-picker-row-name", children: row.model.name }),
                          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "mf-picker-row-check", children: selected ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Check, {}) : null })
                        ]
                      },
                      row.model.id
                    );
                  })
                ] }, groupId);
              }),
              state.status === "ready" && grouped.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "mf-picker-note", children: groups.length === 0 ? t("picker.emptyModels") : t("picker.emptySearch") })
            ] }),
            currentReasoning !== void 0 && current !== null && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-efforts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "mf-picker-group-name", children: t("picker.effort") }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-effort-row", children: [
                currentReasoning.defaultEffort === void 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `mf-picker-effort-chip ${currentEffort === void 0 ? "is-selected" : ""}`,
                    disabled: busy,
                    onClick: () => chooseEffort(void 0),
                    children: t("picker.providerDefault")
                  }
                ),
                currentReasoning.efforts.map((level) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
                  "button",
                  {
                    type: "button",
                    className: `mf-picker-effort-chip ${currentEffort === level.id ? "is-selected" : ""}`,
                    title: level.description ?? level.name,
                    disabled: busy,
                    onClick: () => chooseEffort(level.id),
                    children: level.name
                  },
                  level.id
                ))
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "mf-picker-footer", children: [
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: `mf-picker-footer-btn ${freeModel.switchOn ? "is-on" : ""}`, disabled: freeModel.switchPending, onClick: () => freeModel.setSwitch(!freeModel.switchOn), title: freeModel.switchOn ? t("switch.off") : t("switch.on"), children: freeModel.switchOn ? t("picker.restore") : t("picker.clean") }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: "mf-picker-footer-btn", disabled: freeModel.loading, onClick: () => {
                void freeModel.refresh();
                setOpen(false);
              }, title: t("card.refresh"), children: t("picker.refresh") }),
              /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", className: `mf-picker-footer-btn ${freeModel.sweeping ? "is-sweeping" : ""}`, disabled: freeModel.sweeping || freeModel.switchPending, onClick: freeModel.sweeping ? freeModel.stopSweep : freeModel.runSweep, title: freeModel.sweeping ? t("sweep.stop") : t("picker.probe"), children: freeModel.sweeping ? t("picker.stop") : t("picker.probe") })
            ] })
          ]
        }
      ),
      document.body
    )
  ] });
}

// client/src/index.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var NS = "modelFloat";
var DICT = {
  zh: {
    "float.label": "\u767D\u5AD6\u6A21\u578B\u989D\u5EA6 \xB7 \u60AC\u505C\u67E5\u770B\u5404\u5382\u5546\u4F59\u989D",
    "ring.label": "\u6D6E\u52A8\u9762\u677F\u529F\u80FD",
    "card.title": "\u767D\u5AD6\u6A21\u578B \xB7 \u5382\u5546\u989D\u5EA6",
    "card.loading": "\u8BFB\u53D6\u4E2D\u2026",
    "card.summary": "{usable}/{vendors} \u5BB6\u5382\u5546\u53EF\u7528 \xB7 {credit} \u5BB6\u6709\u4F59\u989D \xB7 \u6A21\u578B {models}/{total} \u53EF\u7528",
    "card.pickerModels": "\u6A21\u578B\u9009\u62E9\u5668\u91CC\u8FD8\u6709 {count} \u4E2A\u6761\u76EE",
    "card.refresh": "\u5237\u65B0",
    "card.move": "\u6362\u4E2A\u89D2\u843D",
    "card.showModels": "\u5C55\u5F00\u6A21\u578B\u53EF\u7528\u6027",
    "card.hideModels": "\u6536\u8D77\u6A21\u578B\u53EF\u7528\u6027",
    "card.updated": "\u66F4\u65B0\u4E8E {time}",
    "card.noModels": "\u6CA1\u6709\u8BFB\u5230\u6A21\u578B\u6E05\u5355\u3002",
    "vendor.on": "\u5DF2\u63A5\u5165",
    "vendor.modelsVisible": "\xB7 {visible}/{total} \u4E2A\u6A21\u578B",
    "vendor.modelsUsable": "\xB7 \u53EF\u7528 {usable} \xB7 \u9009\u62E9\u5668 {visible}/{total}",
    "vendor.modelsHidden": "\xB7 \u5DF2\u9690\u85CF {count} \u4E2A\u6A21\u578B",
    "vendor.hideModels": "\u4ECE\u6A21\u578B\u9009\u62E9\u5668\u9690\u85CF\u8FD9\u5BB6\u5382\u5546\u7684\u6A21\u578B",
    "vendor.restoreModels": "\u628A\u8FD9\u5BB6\u5382\u5546\u7684\u6A21\u578B\u653E\u56DE\u6A21\u578B\u9009\u62E9\u5668",
    "vendor.hideUnusableShort": "\u6E05\u7406",
    "vendor.hideUnusable": "\u9690\u85CF {count} \u4E2A\u4E0D\u53EF\u7528\u5382\u5546\u7684\u6A21\u578B\uFF0C\u8BA9\u6A21\u578B\u9009\u62E9\u5668\u6E05\u723D\u4E00\u70B9",
    "vendor.idle": "\u672A\u767B\u5F55",
    "vendor.closed": "\u5DF2\u5173\u95ED",
    "vendor.hidden": "\u5DF2\u9690\u85CF",
    "vendor.empty": "\u65E0\u989D\u5EA6",
    "vendor.broken": "\u6A21\u578B\u5168\u4E0D\u53EF\u7528",
    "vendor.error": "\u67E5\u8BE2\u5931\u8D25",
    "vendor.unknown": "\u672A\u77E5",
    "vendor.readFailed": "\u8BFB\u53D6\u5931\u8D25",
    "vendor.noBalance": "\u65E0\u4F59\u989D\u63A5\u53E3",
    "switch.onShort": "\u5DF2\u6E05\u7406",
    "switch.offShort": "\u672A\u6E05\u7406",
    "picker.menu": "\u6A21\u578B",
    "picker.open": "\u9009\u62E9\u6A21\u578B",
    "picker.account": "DeepSeek \u8D26\u53F7",
    "picker.loading": "\u8BFB\u53D6\u4E2D\u2026",
    "picker.placeholder": "\u9009\u62E9\u6A21\u578B",
    "picker.search": "\u641C\u7D22\u6A21\u578B",
    "picker.emptyModels": "\u6CA1\u6709\u8BFB\u5230\u6A21\u578B\u6E05\u5355\u3002",
    "picker.emptySearch": "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B\u3002",
    "picker.untested": "\u672A\u63A2\u6D4B\uFF1A\u53EF\u7528\u6027\u8FD8\u4E0D\u77E5\u9053",
    "picker.effort": "\u601D\u8003\u5F3A\u5EA6",
    "picker.providerDefault": "\u8DDF\u968F\u6A21\u578B\u9ED8\u8BA4",
    "picker.groupFailed": "{name} \u8BFB\u53D6\u5931\u8D25\uFF1A{message}",
    "picker.failed": "\u5207\u6362\u6A21\u578B\u5931\u8D25",
    "picker.sessionInUse": "\u8FD9\u4E2A\u4F1A\u8BDD\u6B63\u5728\u5199\u5165\uFF0C\u7A0D\u540E\u518D\u5207\u6362\u6A21\u578B",
    "picker.retry": "\u91CD\u8BD5",
    "picker.clean": "\u6E05\u7406\u4E0D\u53EF\u7528",
    "picker.restore": "\u6062\u590D\u9690\u85CF",
    "picker.refresh": "\u5237\u65B0",
    "picker.probe": "\u63A2\u6D4B\u672A\u9A8C\u8BC1",
    "picker.stop": "\u505C\u6B62\u63A2\u6D4B",
    "switch.on": "\u9690\u85CF {count} \u4E2A\u4E0D\u53EF\u7528\u5382\u5546\u7684\u6A21\u578B\uFF0C\u8BA9\u6A21\u578B\u9009\u62E9\u5668\u6E05\u723D\u4E00\u70B9",
    "switch.off": "\u628A\u4E4B\u524D\u9690\u85CF\u7684\u6A21\u578B\u653E\u56DE\u6A21\u578B\u9009\u62E9\u5668",
    "switch.hidden": "\u5DF2\u9690\u85CF {count} \u5BB6\u4E0D\u53EF\u7528\u5382\u5546\u7684 {models} \u4E2A\u6A21\u578B",
    "lock.title": "\u9501\u5C4F",
    "lock.close": "\u5173\u95ED\u9501\u5C4F",
    "memory.collected": "V8 \u5DF2\u56DE\u6536\uFF0C\u91CA\u653E {mb} MB",
    "memory.done": "\u5185\u5B58\u91CA\u653E\u5DF2\u5B8C\u6210",
    "memory.expose-gc-missing": "\u5BBF\u4E3B\u672A\u4EE5 --expose-gc \u542F\u52A8\uFF0C\u65E0\u6CD5\u6309\u9700\u56DE\u6536",
    "model.available": "\u53EF\u7528",
    "model.regionBlocked": "\u5730\u533A\u9650\u5236",
    "model.unavailable": "\u4E0D\u53EF\u7528",
    "model.throttled": "\u9650\u6D41",
    "model.noCredit": "\u65E0\u989D\u5EA6",
    "model.noCredential": "\u672A\u767B\u5F55",
    "model.untested": "\u672A\u63A2\u6D4B",
    "sweep.start": "\u63A2\u6D4B {count} \u4E2A\u672A\u9A8C\u8BC1\u6A21\u578B\uFF08\u542B\u5382\u5546\u6A21\u578B\uFF09",
    "sweep.progress": "\u63A2\u6D4B\u4E2D {done}/{total}\u2026\uFF08\u70B9\u51FB\u505C\u6B62\uFF09",
    "sweep.stop": "\u505C\u6B62\u63A2\u6D4B",
    "sweep.allTested": "\u6A21\u578B\u90FD\u5DF2\u63A2\u6D4B",
    "sweep.no-gateway": "\u672C\u673A\u6CA1\u6709\u53EF\u7528\u7684\u6E20\u9053\u7F51\u5173\uFF0C\u65E0\u6CD5\u63A2\u6D4B\u3002",
    "sweep.no-gateway-key": "\u8BFB\u4E0D\u5230\u6E20\u9053\u7F51\u5173\u5BC6\u94A5\uFF0C\u65E0\u6CD5\u63A2\u6D4B\u3002",
    "sweep.sweep-request-failed": "\u63A2\u6D4B\u8BF7\u6C42\u6CA1\u9001\u51FA\u53BB\uFF0C\u7A0D\u540E\u518D\u8BD5\u3002",
    // ── 锁屏卡片墙翻译 ──────────────────────────────────────────
    "wall.auditAll": "\u5386\u53F2\u5BA1\u8BA1",
    "wall.auditNone": "\u6682\u65E0\u5BA1\u8BA1\u8BB0\u5F55",
    "wall.auditState": "\u72B6\u6001",
    "wall.auditUpdated": "\u66F4\u65B0\u4E8E",
    "wall.card.audit": "\u63D2\u4EF6\u5BA1\u8BA1",
    "wall.card.core": "DSH \u6838\u5FC3",
    "wall.card.device": "\u8BBE\u5907",
    "wall.card.groups": "\u5DE5\u4F5C\u533A\u7EC4",
    "wall.card.network": "\u7F51\u7EDC",
    "wall.card.projects": "\u9879\u76EE",
    "wall.card.sessions": "\u4F1A\u8BDD",
    "wall.card.skills": "\u6280\u80FD",
    "wall.card.storage": "\u5B58\u50A8",
    "wall.card.token": "Token \u7528\u91CF",
    "wall.card.tools": "\u5DE5\u5177\u8C03\u7528",
    "wall.cardFailed": "\u8BFB\u53D6\u5931\u8D25",
    "wall.coreAuthor": "\u4F5C\u8005",
    "wall.coreBehind": "\u6709\u65B0\u7248\u672C\u53EF\u7528",
    "wall.coreBranch": "\u5206\u652F",
    "wall.coreCommit": "\u63D0\u4EA4",
    "wall.coreDate": "\u65E5\u671F",
    "wall.coreHead": "\u6700\u65B0\u63D0\u4EA4",
    "wall.coreLocal": "\u672C\u5730\u5B89\u88C5",
    "wall.coreMessage": "\u63D0\u4EA4\u4FE1\u606F",
    "wall.coreNetworkNote": "\u79BB\u7EBF\u8BFB\u53D6\uFF0C\u53EF\u80FD\u4E0D\u51C6\u786E",
    "wall.coreRelease": "\u53D1\u884C\u7248\u672C",
    "wall.coreReleaseDate": "\u53D1\u5E03\u65E5\u671F",
    "wall.coreReleaseTag": "\u6807\u7B7E",
    "wall.cores": "\u5404\u6838\u5FC3\u4F7F\u7528\u7387",
    "wall.coreUnknown": "\u672A\u77E5\u72B6\u6001",
    "wall.coreUpstream": "\u4E0A\u6E38\u4ED3\u5E93",
    "wall.coreUpToDate": "\u5DF2\u662F\u6700\u65B0",
    "wall.coreVersion": "\u7248\u672C",
    "wall.deviceLocalNote": "dsh-homepage \u672A\u5B89\u88C5\uFF0C\u663E\u793A\u672C\u5730\u91C7\u6837",
    "wall.disk": "\u78C1\u76D8\u4F7F\u7528\u7387",
    "wall.diskFree": "\u78C1\u76D8\u53EF\u7528",
    "wall.gpu": "GPU \u4F7F\u7528\u7387",
    "wall.groupsAll": "\u6240\u6709\u5DE5\u4F5C\u533A\u7EC4",
    "wall.groupsCaption": "{mode} \u6A21\u5F0F",
    "wall.groupsMembers": "\u6210\u5458\u6570",
    "wall.groupsMode": "\u6A21\u5F0F",
    "wall.hostname": "\u4E3B\u673A\u540D",
    "wall.machine": "\u673A\u5668\u4FE1\u606F",
    "wall.memory": "\u5185\u5B58",
    "wall.needHomepage": "\u9700\u8981\u5B89\u88C5 dsh-homepage",
    "wall.cpuOf": "CPU \u8D1F\u8F7D{cores}",
    "wall.cpuLocal": "CPU \u8D1F\u8F7D \xB7 \u672C\u673A\u91C7\u6837\u5668",
    "wall.net": "\u7F51\u7EDC\u901F\u7387",
    "wall.networkNode": "Node.js",
    "wall.networkProxies": "{count} \u4E2A\u4EE3\u7406",
    "wall.networkProxiesTitle": "\u4EE3\u7406",
    "wall.networkRedirectors": "\u91CD\u5B9A\u5411",
    "wall.networkRedirectorsTitle": "\u91CD\u5B9A\u5411",
    "wall.networkTls": "TLS",
    "wall.networkTlsTitle": "TLS \u8BC1\u4E66",
    "wall.platform": "\u5E73\u53F0",
    "wall.projectsAll": "\u6240\u6709\u9879\u76EE",
    "wall.projectsCaption": "{dirty} \u4E2A\u810F \xB7 {running} \u4E2A\u8FD0\u884C\u4E2D",
    "wall.projectsDirty": "\u810F\u6539\u52A8",
    "wall.projectsMissing": "\u7F3A\u5931\u76EE\u5F55",
    "wall.projectsRunning": "\u8FD0\u884C\u4E2D",
    "wall.projectsWorktrees": "\u5DE5\u4F5C\u6811",
    "wall.sessionsAgents": "\u6839\u4EE3\u7406",
    "wall.sessionsAll": "\u6240\u6709\u5BF9\u8BDD",
    "wall.sessionsIdle": "\u7A7A\u95F2",
    "wall.sessionsNone": "\u6682\u65E0\u5BF9\u8BDD",
    "wall.sessionsNotStopped": "\u672A\u505C\u6B62",
    "wall.sessionsOn": "\u8FD0\u884C\u4E2D",
    "wall.sessionsRoots": "\u6839\u4F1A\u8BDD",
    "wall.sessionsRunning": "{count} \u4E2A\u8FD0\u884C\u4E2D",
    "wall.sessionsStop": "\u505C\u6B62",
    "wall.sessionsStopped": "\u5DF2\u505C\u6B62",
    "wall.sessionsTotal": "\u5BF9\u8BDD\u603B\u6570",
    "wall.skillsAll": "\u6240\u6709\u6280\u80FD",
    "wall.skillsCaption": "{total} \u4E2A\u5DF2\u5B89\u88C5",
    "wall.skillsDisabled": "\u5DF2\u7981\u7528",
    "wall.skillsTotal": "\u5DF2\u5B89\u88C5",
    "wall.skillsWritable": "\u53EF\u5199\u5165",
    "wall.storageCategories": "\u5206\u7C7B",
    "wall.storageFiles": "{count} \u4E2A\u6587\u4EF6",
    "wall.storagePrune": "\u6E05\u7406 {count} \u4E2A\u65E5\u5FD7",
    "wall.storagePruned": "\u5DF2\u91CA\u653E {bytes}",
    "wall.storageReclaimable": "\u53EF\u56DE\u6536",
    "wall.temperature": "\u6E29\u5EA6",
    "wall.tokenBonus": "\u5956\u52B1",
    "wall.tokenCaption": "\u8D26\u6237\u72B6\u6001\uFF1A{status}",
    "wall.tokenHistory": "\u6700\u8FD1 14 \u5929",
    "wall.tokenRefresh": "\u5237\u65B0",
    "wall.tokenRefreshed": "\u5DF2\u5237\u65B0",
    "wall.tokenToday": "\u4ECA\u65E5\u652F\u51FA",
    "wall.tokenUpdated": "\u66F4\u65B0\u4E8E {time}",
    "wall.tokenYesterday": "\u6628\u65E5\u652F\u51FA",
    "wall.toolsAll": "\u6240\u6709\u5DE5\u5177",
    "wall.toolsArgTokens": "\u5165\u53C2 Tokens",
    "wall.toolsCalls": "\u8C03\u7528\u603B\u6570",
    "wall.toolsDuration": "\u603B\u8017\u65F6",
    "wall.toolsErrorRate": "\u9519\u8BEF\u7387",
    "wall.toolsOutTokens": "\u51FA\u53C2 Tokens",
    "wall.uptime": "\u8FD0\u884C\u65F6\u957F",
    "wall.storageCategory.sessions": "\u4F1A\u8BDD",
    "wall.storageCategory.storages": "\u5B58\u50A8",
    "wall.storageCategory.logs": "\u65E5\u5FD7",
    "wall.storageCategory.cache": "\u7F13\u5B58",
    "wall.storageCategory.attachments": "\u9644\u4EF6",
    "wall.storageCategory.profiles": "\u914D\u7F6E"
  },
  en: {
    "float.label": "Free-model credit \u2014 hover for each vendor\u2019s balance",
    "ring.label": "Float actions",
    "card.title": "Free models \xB7 vendor credit",
    "card.loading": "Reading\u2026",
    "card.summary": "{usable}/{vendors} vendors live \xB7 {credit} with credit \xB7 {models}/{total} models usable",
    "card.pickerModels": "{count} entries still in the model picker",
    "card.refresh": "Refresh",
    "card.move": "Move to another corner",
    "card.showModels": "Show model availability",
    "card.hideModels": "Hide model availability",
    "card.updated": "updated {time}",
    "card.noModels": "No model roster was read.",
    "vendor.on": "Connected",
    "vendor.modelsVisible": "\xB7 {visible}/{total} models",
    "vendor.modelsHidden": "\xB7 {count} models hidden",
    "vendor.modelsUsable": "\xB7 {usable} usable \xB7 {visible}/{total} in picker",
    "vendor.hideModels": "Hide this vendor's models from the model picker",
    "vendor.restoreModels": "Put this vendor's models back into the model picker",
    "vendor.hideUnusableShort": "Clean up",
    "vendor.hideUnusable": "Hide {count} unusable vendors' models, so the model picker gets shorter",
    "vendor.idle": "Not signed in",
    "vendor.closed": "Turned off",
    "vendor.hidden": "Hidden",
    "vendor.empty": "No credit",
    "vendor.broken": "Models unusable",
    "vendor.error": "Read failed",
    "vendor.unknown": "Unknown",
    "vendor.readFailed": "Read failed",
    "vendor.noBalance": "No balance endpoint",
    "switch.onShort": "Cleaned",
    "switch.offShort": "Not cleaned",
    "picker.menu": "Model",
    "picker.open": "Select a model",
    "picker.account": "DeepSeek account",
    "picker.loading": "Reading\u2026",
    "picker.placeholder": "Select a model",
    "picker.search": "Search models",
    "picker.emptyModels": "No model roster was read.",
    "picker.emptySearch": "No model matches.",
    "picker.untested": "Untested: availability is not known yet",
    "picker.effort": "Thinking effort",
    "picker.providerDefault": "Model default",
    "picker.groupFailed": "{name} failed to load: {message}",
    "picker.failed": "Could not switch models",
    "picker.sessionInUse": "This session is busy writing; try switching models in a moment",
    "picker.retry": "Retry",
    "picker.clean": "Clean up unusable models",
    "picker.restore": "Restore hidden models",
    "picker.refresh": "Refresh",
    "picker.probe": "Probe untested models",
    "picker.stop": "Stop probing",
    "switch.on": "Hide {count} unusable vendors' models, so the model picker gets shorter",
    "switch.off": "Put the hidden models back into the model picker",
    "switch.hidden": "{models} models of {count} unusable vendors are hidden",
    "lock.title": "Lock screen",
    "lock.close": "Close the lock screen",
    "memory.collected": "V8 collected, freeing {mb} MB",
    "memory.done": "Memory release finished",
    "memory.expose-gc-missing": "the Host was not started with --expose-gc, so it cannot collect on demand",
    "model.available": "Available",
    "model.regionBlocked": "Region blocked",
    "model.unavailable": "Unavailable",
    "model.throttled": "Throttled",
    "model.noCredit": "No credit",
    "model.noCredential": "Not signed in",
    "model.untested": "Untested",
    "sweep.start": "Probe {count} untested models (vendors included)",
    "sweep.progress": "Probing {done}/{total}\u2026 (click to stop)",
    "sweep.stop": "Stop probing",
    "sweep.allTested": "Every model has a verdict",
    "sweep.no-gateway": "No channel gateway on this host, so probing is unavailable.",
    "sweep.no-gateway-key": "The gateway key could not be read, so probing is unavailable.",
    "sweep.sweep-request-failed": "The probe request did not reach the Host; try again.",
    // ── lock-screen wall ─────────────────────────────────────
    "wall.auditAll": "Audit history",
    "wall.auditNone": "No audits recorded",
    "wall.auditState": "State",
    "wall.auditUpdated": "Updated",
    "wall.card.audit": "Plugin audit",
    "wall.card.core": "DSH core",
    "wall.card.device": "Device",
    "wall.card.groups": "Workspace groups",
    "wall.card.network": "Network",
    "wall.card.projects": "Projects",
    "wall.card.sessions": "Sessions",
    "wall.card.skills": "Skills",
    "wall.card.storage": "Storage",
    "wall.card.token": "Token usage",
    "wall.card.tools": "Tool usage",
    "wall.cardFailed": "Read failed",
    "wall.coreAuthor": "Author",
    "wall.coreBehind": "A newer core is available",
    "wall.coreBranch": "Branch",
    "wall.coreCommit": "Commit",
    "wall.coreDate": "Date",
    "wall.coreHead": "Latest commit",
    "wall.coreLocal": "Local install",
    "wall.coreMessage": "Message",
    "wall.coreNetworkNote": "Read offline, may be stale",
    "wall.coreRelease": "Release",
    "wall.coreReleaseDate": "Released",
    "wall.coreReleaseTag": "Tag",
    "wall.cores": "Per-core load",
    "wall.coreUnknown": "Status unknown",
    "wall.coreUpstream": "Upstream",
    "wall.coreUpToDate": "Up to date",
    "wall.coreVersion": "Version",
    "wall.cpuLocal": "CPU load \xB7 local sampler",
    "wall.cpuOf": "CPU load{cores}",
    "wall.deviceLocalNote": "dsh-homepage is not installed, so this is the local sampler",
    "wall.disk": "Disk used",
    "wall.diskFree": "Disk free",
    "wall.gpu": "GPU used",
    "wall.groupsAll": "All groups",
    "wall.groupsCaption": "{mode} mode",
    "wall.groupsMembers": "Members",
    "wall.groupsMode": "Mode",
    "wall.hostname": "Hostname",
    "wall.machine": "Machine",
    "wall.memory": "Memory",
    "wall.needHomepage": "Needs dsh-homepage",
    "wall.net": "Network rate",
    "wall.networkNode": "Node.js",
    "wall.networkProxies": "{count} proxies",
    "wall.networkProxiesTitle": "Proxies",
    "wall.networkRedirectors": "Redirectors",
    "wall.networkRedirectorsTitle": "Redirectors",
    "wall.networkTls": "TLS",
    "wall.networkTlsTitle": "TLS bundles",
    "wall.platform": "Platform",
    "wall.projectsAll": "All projects",
    "wall.projectsCaption": "{dirty} dirty \xB7 {running} running",
    "wall.projectsDirty": "Dirty",
    "wall.projectsMissing": "Missing dirs",
    "wall.projectsRunning": "Running",
    "wall.projectsWorktrees": "Worktrees",
    "wall.sessionsAgents": "Agents",
    "wall.sessionsAll": "All conversations",
    "wall.sessionsIdle": "Idle",
    "wall.sessionsNone": "No conversations",
    "wall.sessionsNotStopped": "Not stopped",
    "wall.sessionsOn": "Running",
    "wall.sessionsRoots": "Root sessions",
    "wall.sessionsRunning": "{count} running",
    "wall.sessionsStop": "Stop",
    "wall.sessionsStopped": "Stopped",
    "wall.sessionsTotal": "Sessions",
    "wall.skillsAll": "All skills",
    "wall.skillsCaption": "{total} installed",
    "wall.skillsDisabled": "Disabled",
    "wall.skillsTotal": "Installed",
    "wall.skillsWritable": "Writable",
    "wall.storageCategories": "Categories",
    "wall.storageFiles": "{count} files",
    "wall.storagePrune": "Prune {count} logs",
    "wall.storagePruned": "Freed {bytes}",
    "wall.storageReclaimable": "Reclaimable",
    "wall.temperature": "Temperature",
    "wall.tokenBonus": "Bonus",
    "wall.tokenCaption": "Account: {status}",
    "wall.tokenHistory": "Last 14 days",
    "wall.tokenRefresh": "Refresh",
    "wall.tokenRefreshed": "Refreshed",
    "wall.tokenToday": "Spent today",
    "wall.tokenUpdated": "updated {time}",
    "wall.tokenYesterday": "Spent yesterday",
    "wall.toolsAll": "All tools",
    "wall.toolsArgTokens": "Arg tokens",
    "wall.toolsCalls": "Calls",
    "wall.toolsDuration": "Time",
    "wall.toolsErrorRate": "Error rate",
    "wall.toolsOutTokens": "Out tokens",
    "wall.uptime": "Uptime",
    "wall.storageCategory.sessions": "Sessions",
    "wall.storageCategory.storages": "Storages",
    "wall.storageCategory.logs": "Logs",
    "wall.storageCategory.cache": "Cache",
    "wall.storageCategory.attachments": "Attachments",
    "wall.storageCategory.profiles": "Profiles"
  }
};
var inject = ["slots", "locale"];
function apply(ctx) {
  const t = ctx.locale.bind(NS);
  ctx.effect(() => ctx.locale.register(NS, { zh: DICT.zh, en: DICT.en }), "model-float: dictionaries");
  ctx.effect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-plugin", "dsh-model-float");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, "model-float: styles");
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: "dsh-model-float",
    order: 40
  }, (props) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ModelFloat, { t, useSessions: props.useSessions, ctx })));
  eE:
    ctx.inject(["slots", "modelDirectories", "sessions"], (scope) => {
      const models = scope.modelDirectories;
      const sessions = scope.sessions;
      scope.slots.inject("conversation.input.model", () => scope.slots.register({
        name: "conversation.input.model",
        priority: -100,
        locale: NS,
        inject: (sessionId) => {
          const directory = models.directoryFor(sessionId);
          const available = sessions.subagentAddress(sessionId) === void 0;
          return {
            available,
            directory: directory.store,
            load: () => {
              if (available) directory.load().catch(() => {
              });
            },
            select: (selection) => available ? directory.select(selection) : Promise.resolve(void 0)
          };
        }
      }, ComposerModelPicker));
    });
}

	return module.exports;
	}
});
