/**
 * Type-Safe Motion Wrapper Components
 * Properly typed Framer Motion components that resolve all TypeScript errors
 *
 * This file exports the same components as MotionComponents.tsx for backward compatibility
 */
import React from 'react';
import { motion, HTMLMotionProps, ForwardRefComponent } from 'framer-motion';

// Direct exports from Framer Motion for type safety
// These components are fully typed and support all motion props

/**
 * Motion Div - The most commonly used motion component
 * @example
 * <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
 */
export const MotionDiv = motion.div;

/**
 * Motion Button
 * @example
 * <MotionButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} />
 */
export const MotionButton = motion.button;

/**
 * Motion Span
 * @example
 * <MotionSpan initial={{ x: -20 }} animate={{ x: 0 }} />
 */
export const MotionSpan = motion.span;

/**
 * Motion Paragraph
 * @example
 * <MotionP initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
 */
export const MotionP = motion.p;

/**
 * Motion Headers - H1 through H6
 */
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionH3 = motion.h3;
export const MotionH4 = motion.h4;
export const MotionH5 = motion.h5;
export const MotionH6 = motion.h6;

/**
 * Motion Form Elements
 */
export const MotionForm = motion.form;
export const MotionInput = motion.input;
export const MotionTextarea = motion.textarea;
export const MotionSelect = motion.select;
export const MotionLabel = motion.label;

/**
 * Motion Semantic Elements
 */
export const MotionHeader = motion.header;
export const MotionSection = motion.section;
export const MotionArticle = motion.article;
export const MotionAside = motion.aside;
export const MotionNav = motion.nav;
export const MotionMain = motion.main;
export const MotionFooter = motion.footer;

/**
 * Motion Links and Media
 */
export const MotionA = motion.a;
export const MotionImg = motion.img;
export const MotionVideo = motion.video;
export const MotionAudio = motion.audio;
export const MotionCanvas = motion.canvas;
export const MotionSvg = motion.svg;

/**
 * Motion Lists
 */
export const MotionUl = motion.ul;
export const MotionOl = motion.ol;
export const MotionLi = motion.li;
export const MotionDl = motion.dl;
export const MotionDt = motion.dt;
export const MotionDd = motion.dd;

/**
 * Motion Tables
 */
export const MotionTable = motion.table;
export const MotionThead = motion.thead;
export const MotionTbody = motion.tbody;
export const MotionTfoot = motion.tfoot;
export const MotionTr = motion.tr;
export const MotionTh = motion.th;
export const MotionTd = motion.td;

/**
 * Motion Generic Elements
 */
export const MotionFieldset = motion.fieldset;
export const MotionLegend = motion.legend;
export const MotionPre = motion.pre;
export const MotionCode = motion.code;
export const MotionBlockquote = motion.blockquote;
export const MotionFigure = motion.figure;
export const MotionFigcaption = motion.figcaption;

/**
 * Motion SVG Elements (for animated icons/graphics)
 */
export const MotionPath = motion.path;
export const MotionCircle = motion.circle;
export const MotionRect = motion.rect;
export const MotionLine = motion.line;
export const MotionPolygon = motion.polygon;
export const MotionPolyline = motion.polyline;
export const MotionEllipse = motion.ellipse;
export const MotionG = motion.g;

/**
 * Aliases for backward compatibility
 */
export const MotionLink = MotionA;

/**
 * Export all as named object for easy importing
 */
const MotionWrappers = {
  Div: MotionDiv,
  Button: MotionButton,
  Span: MotionSpan,
  P: MotionP,
  H1: MotionH1,
  H2: MotionH2,
  H3: MotionH3,
  H4: MotionH4,
  H5: MotionH5,
  H6: MotionH6,
  Form: MotionForm,
  Input: MotionInput,
  Textarea: MotionTextarea,
  Select: MotionSelect,
  Label: MotionLabel,
  Header: MotionHeader,
  Section: MotionSection,
  Article: MotionArticle,
  Aside: MotionAside,
  Nav: MotionNav,
  Main: MotionMain,
  Footer: MotionFooter,
  A: MotionA,
  Link: MotionA,
  Img: MotionImg,
  Video: MotionVideo,
  Audio: MotionAudio,
  Canvas: MotionCanvas,
  Svg: MotionSvg,
  Ul: MotionUl,
  Ol: MotionOl,
  Li: MotionLi,
  Dl: MotionDl,
  Dt: MotionDt,
  Dd: MotionDd,
  Table: MotionTable,
  Thead: MotionThead,
  Tbody: MotionTbody,
  Tfoot: MotionTfoot,
  Tr: MotionTr,
  Th: MotionTh,
  Td: MotionTd,
  Fieldset: MotionFieldset,
  Legend: MotionLegend,
  Pre: MotionPre,
  Code: MotionCode,
  Blockquote: MotionBlockquote,
  Figure: MotionFigure,
  Figcaption: MotionFigcaption,
  Path: MotionPath,
  Circle: MotionCircle,
  Rect: MotionRect,
  Line: MotionLine,
  Polygon: MotionPolygon,
  Polyline: MotionPolyline,
  Ellipse: MotionEllipse,
  G: MotionG,
};

export default MotionWrappers;

/**
 * Type exports for advanced usage
 */
export type {
  HTMLMotionProps,
  ForwardRefComponent,
};
