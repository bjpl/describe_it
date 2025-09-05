/**
 * Motion Wrapper Components
 * Comprehensive set of properly typed motion components that resolve TS2322 errors
 */
import React from 'react';
import { motion, MotionProps, HTMLMotionProps } from 'framer-motion';

// Utility type to properly merge motion props with HTML attributes
type MotionComponentProps<T extends keyof JSX.IntrinsicElements> = HTMLMotionProps<T> & {
  children?: React.ReactNode;
  onClick?: 
    | (() => void) 
    | (() => Promise<void>) 
    | ((event: React.MouseEvent) => void) 
    | ((event: React.MouseEvent) => Promise<void>);
  "data-phrase-id"?: string;
  title?: string;
  disabled?: boolean;
};

// Motion Div
export const MotionDiv = React.forwardRef<HTMLDivElement, MotionComponentProps<'div'>>(
  (props, ref) => <motion.div ref={ref} {...(props as any)} />
);
MotionDiv.displayName = 'MotionDiv';

// Motion Button
export const MotionButton = React.forwardRef<HTMLButtonElement, MotionComponentProps<'button'>>(
  (props, ref) => <motion.button ref={ref} {...(props as any)} />
);
MotionButton.displayName = 'MotionButton';

// Motion Span
export const MotionSpan = React.forwardRef<HTMLSpanElement, MotionComponentProps<'span'>>(
  (props, ref) => <motion.span ref={ref} {...(props as any)} />
);
MotionSpan.displayName = 'MotionSpan';

// Motion Paragraph
export const MotionP = React.forwardRef<HTMLParagraphElement, MotionComponentProps<'p'>>(
  (props, ref) => <motion.p ref={ref} {...(props as any)} />
);
MotionP.displayName = 'MotionP';

// Motion Headers
export const MotionH1 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h1'>>(
  (props, ref) => <motion.h1 ref={ref} {...(props as any)} />
);
MotionH1.displayName = 'MotionH1';

export const MotionH2 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h2'>>(
  (props, ref) => <motion.h2 ref={ref} {...(props as any)} />
);
MotionH2.displayName = 'MotionH2';

export const MotionH3 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h3'>>(
  (props, ref) => <motion.h3 ref={ref} {...(props as any)} />
);
MotionH3.displayName = 'MotionH3';

export const MotionH4 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h4'>>(
  (props, ref) => <motion.h4 ref={ref} {...(props as any)} />
);
MotionH4.displayName = 'MotionH4';

export const MotionH5 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h5'>>(
  (props, ref) => <motion.h5 ref={ref} {...(props as any)} />
);
MotionH5.displayName = 'MotionH5';

export const MotionH6 = React.forwardRef<HTMLHeadingElement, MotionComponentProps<'h6'>>(
  (props, ref) => <motion.h6 ref={ref} {...(props as any)} />
);
MotionH6.displayName = 'MotionH6';

// Motion Form Elements
export const MotionForm = React.forwardRef<HTMLFormElement, MotionComponentProps<'form'>>(
  (props, ref) => <motion.form ref={ref} {...(props as any)} />
);
MotionForm.displayName = 'MotionForm';

export const MotionInput = React.forwardRef<HTMLInputElement, MotionComponentProps<'input'>>(
  (props, ref) => <motion.input ref={ref} {...(props as any)} />
);
MotionInput.displayName = 'MotionInput';

export const MotionTextarea = React.forwardRef<HTMLTextAreaElement, MotionComponentProps<'textarea'>>(
  (props, ref) => <motion.textarea ref={ref} {...(props as any)} />
);
MotionTextarea.displayName = 'MotionTextarea';

export const MotionSelect = React.forwardRef<HTMLSelectElement, MotionComponentProps<'select'>>(
  (props, ref) => <motion.select ref={ref} {...(props as any)} />
);
MotionSelect.displayName = 'MotionSelect';

// Motion Semantic Elements
export const MotionHeader = React.forwardRef<HTMLElement, MotionComponentProps<'header'>>(
  (props, ref) => <motion.header ref={ref} {...(props as any)} />
);
MotionHeader.displayName = 'MotionHeader';

export const MotionSection = React.forwardRef<HTMLElement, MotionComponentProps<'section'>>(
  (props, ref) => <motion.section ref={ref} {...(props as any)} />
);
MotionSection.displayName = 'MotionSection';

export const MotionArticle = React.forwardRef<HTMLElement, MotionComponentProps<'article'>>(
  (props, ref) => <motion.article ref={ref} {...(props as any)} />
);
MotionArticle.displayName = 'MotionArticle';

export const MotionAside = React.forwardRef<HTMLElement, MotionComponentProps<'aside'>>(
  (props, ref) => <motion.aside ref={ref} {...(props as any)} />
);
MotionAside.displayName = 'MotionAside';

export const MotionNav = React.forwardRef<HTMLElement, MotionComponentProps<'nav'>>(
  (props, ref) => <motion.nav ref={ref} {...(props as any)} />
);
MotionNav.displayName = 'MotionNav';

export const MotionMain = React.forwardRef<HTMLElement, MotionComponentProps<'main'>>(
  (props, ref) => <motion.main ref={ref} {...(props as any)} />
);
MotionMain.displayName = 'MotionMain';

export const MotionFooter = React.forwardRef<HTMLElement, MotionComponentProps<'footer'>>(
  (props, ref) => <motion.footer ref={ref} {...(props as any)} />
);
MotionFooter.displayName = 'MotionFooter';

// Motion Links and Media
export const MotionA = React.forwardRef<HTMLAnchorElement, MotionComponentProps<'a'>>(
  (props, ref) => <motion.a ref={ref} {...(props as any)} />
);
MotionA.displayName = 'MotionA';

export const MotionImg = React.forwardRef<HTMLImageElement, MotionComponentProps<'img'>>(
  (props, ref) => <motion.img ref={ref} {...(props as any)} />
);
MotionImg.displayName = 'MotionImg';

// Motion Lists
export const MotionUl = React.forwardRef<HTMLUListElement, MotionComponentProps<'ul'>>(
  (props, ref) => <motion.ul ref={ref} {...(props as any)} />
);
MotionUl.displayName = 'MotionUl';

export const MotionOl = React.forwardRef<HTMLOListElement, MotionComponentProps<'ol'>>(
  (props, ref) => <motion.ol ref={ref} {...(props as any)} />
);
MotionOl.displayName = 'MotionOl';

export const MotionLi = React.forwardRef<HTMLLIElement, MotionComponentProps<'li'>>(
  (props, ref) => <motion.li ref={ref} {...(props as any)} />
);
MotionLi.displayName = 'MotionLi';

// Aliases for backward compatibility
export const MotionLink = MotionA;

// Export all as default for easy importing
export default {
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
  Ul: MotionUl,
  Ol: MotionOl,
  Li: MotionLi,
};