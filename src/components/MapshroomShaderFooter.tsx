import { type ReactNode } from 'react';
import { useShaderVisibility } from '../hooks/useShaderVisibility';
import { MapshroomShaderBackdrop } from './OnboardingWelcomeShader';
import './MapshroomShaderFooter.css';

interface MapshroomShaderFooterProps {
  children: ReactNode;
  className: string;
}

export function MapshroomShaderFooter({
  children,
  className,
}: MapshroomShaderFooterProps) {
  const [footerRef, shaderActive] = useShaderVisibility<HTMLElement>();

  return (
    <footer ref={footerRef} className={`${className} mapshroom-shader-footer`}>
      {children}
      <MapshroomShaderBackdrop
        active={shaderActive}
        continuous
        className="mapshroom-shader-footer-backdrop"
      />
    </footer>
  );
}
