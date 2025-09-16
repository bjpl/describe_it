import React from "react";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  clickable?: boolean;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = "", 
  clickable = false,
  onClick,
  role,
  ...props 
}) => {
  const Component = clickable ? 'button' : 'div';
  
  return (
    <Component
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${
        clickable ? 'hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2' : ''
      } ${className}`}
      onClick={clickable ? onClick : undefined}
      role={role}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = "",
  as: Component = 'h3',
}) => {
  return (
    <Component
      className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
    >
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = "",
}) => {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
  );
};

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = "",
}) => {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`}>{children}</div>
  );
};
