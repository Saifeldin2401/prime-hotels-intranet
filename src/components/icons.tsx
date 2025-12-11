import * as LucideIcons from 'lucide-react';
import { SVGProps } from 'react';

// Export all Lucide icons directly with proper case
export const Icons = {
  ...LucideIcons,
  
  // Custom icons can be added here
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
};

// Type for icon names
export type IconName = keyof typeof Icons;

// Icon component that renders the appropriate icon by name
export function Icon({ 
  name, 
  ...props 
}: { 
  name: IconName 
} & SVGProps<SVGSVGElement>) {
  const IconComponent = Icons[name] as React.ComponentType<SVGProps<SVGSVGElement>>;
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent {...props} />;
}

export default Icons;
