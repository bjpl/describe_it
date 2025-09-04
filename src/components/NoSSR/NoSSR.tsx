"use client";

import { useEffect, useState, ReactNode } from "react";

interface NoSSRProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * NoSSR component to prevent hydration mismatches
 * Only renders children on the client side after hydration
 */
export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for wrapping components
 */
export function withNoSSR<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const WrappedComponent = (props: P) => (
    <NoSSR fallback={fallback}>
      <Component {...props} />
    </NoSSR>
  );

  WrappedComponent.displayName = `withNoSSR(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
