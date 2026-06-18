import { useTheme } from '../../contexts/ThemeContext';

/** Official LOCOL wordmark — white on dark, primary (dark) on light. */
export function BrandLogo({ height = 24 }: { height?: number }) {
  const { theme } = useTheme();
  const src = theme === 'dark' ? '/brand/LOCOL_Logo_White.svg' : '/brand/LOCOL_Logo_Primary.svg';
  return <img src={src} alt="LOCOL" style={{ height, width: 'auto', display: 'block' }} />;
}
