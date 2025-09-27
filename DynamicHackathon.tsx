import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import {
  Zap,
  Clock,
  Globe,
  Users,
  Code,
  Skull,
  AlertTriangle,
  Target,
  Trophy,
  Star,
  ExternalLink,
  FileText,
  Video,
  Flame,
  Shield,
} from 'lucide-react';

interface HackathonData {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  tagline: string;
  badge_text?: string;
  description: string;
  registration_url?: string;
  start_date: string;
  end_date: string;
  duration: string;
  format: string;
  team_size: string;
  judging_type: string;
  results_date: string;
  what_it_is: string;
  the_idea: string;
  who_joins: string[];
  tech_rules: string[];
  fun_awards: string[];
  perks: string[];
  cash_pool?: string;
  judging_description: string;
  judging_criteria: string;
  required_submissions: string[];
  optional_submissions?: string[];
  // New text content fields
  announcements?: string;
  event_highlights?: string;
  sponsor_message?: string;
  faq_content?: string;
  timeline_details?: string;
  special_instructions?: string;
  theme_color_primary: string;
  theme_color_secondary: string;
  theme_color_accent: string;
  theme_config?: {
    fonts?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      body?: string;
    };
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      surface?: string;
      text?: string;
      textSecondary?: string;
      border?: string;
      success?: string;
      warning?: string;
      error?: string;
    };
    spacing?: {
      section?: string;
      container?: string;
      element?: string;
    };
    animations?: {
      enabled?: boolean;
      speed?: string;
      effects?: string[];
    };
    layout?: {
      heroStyle?: string;
      gridCols?: number;
      borderRadius?: string;
      shadows?: boolean;
    };
    svgElements?: {
      heroIcon?: string;
      decorativePattern?: string;
      sectionDivider?: string;
    };
    customCSS?: {
      heroBackgroundPattern?: string;
      glowEffect?: string;
      textGradient?: string;
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function DynamicHackathon() {
  const { slug } = useParams<{ slug: string }>();
  const [hackathon, setHackathon] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Helper function to safely render SVG elements from theme config
  const renderSVG = (svgString: string, className?: string) => {
    if (!svgString) return null;
    
    // Basic SVG validation - only allow safe SVG content
    const isSafeSVG = svgString.trim().startsWith('<svg') && 
                      svgString.trim().endsWith('</svg>') &&
                      !svgString.includes('javascript:') &&
                      !svgString.includes('on') && // Prevent event handlers
                      !svgString.includes('<script');
    
    if (!isSafeSVG) {
      console.warn('Invalid or potentially unsafe SVG content detected');
      return null;
    }
    
    return (
      <div 
        className={className}
        dangerouslySetInnerHTML={{ __html: svgString }} 
      />
    );
  };

  // Helper function to apply font styling
  const getFontStyle = (fontType: 'primary' | 'secondary' | 'accent' | 'body') => {
    const theme = hackathon?.theme_config || {};
    const fonts = theme.fonts || {};
    const fallbacks = {
      primary: 'VT323, monospace',
      secondary: 'Press Start 2P, monospace',
      accent: 'JetBrains Mono, monospace',
      body: 'Inter, sans-serif'
    };
    return { fontFamily: fonts[fontType] || fallbacks[fontType] };
  };

  useEffect(() => {
    const fetchHackathon = async () => {
      if (!slug) return;
      
      try {
        const response = await fetch(`/api/hackathons/${slug}`);
        if (!response.ok) {
          throw new Error('Hackathon not found');
        }
        const data = await response.json();
        setHackathon(data);
        setIsVisible(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hackathon');
      } finally {
        setLoading(false);
      }
    };

    fetchHackathon();
  }, [slug]);

  // Apply theme CSS variables to document root when hackathon data loads
  useEffect(() => {
    if (!hackathon) return;

    const theme = hackathon.theme_config || {};
    const colors = theme.colors || {};
    const fonts = theme.fonts || {};
    const spacing = theme.spacing || {};
    const customCSS = theme.customCSS || {};

    // Apply CSS variables to document root
    const root = document.documentElement;
    
    // Enhanced theme colors
    root.style.setProperty('--color-primary', colors.primary || hackathon.theme_color_primary);
    root.style.setProperty('--color-secondary', colors.secondary || hackathon.theme_color_secondary);
    root.style.setProperty('--color-accent', colors.accent || hackathon.theme_color_accent);
    root.style.setProperty('--color-background', colors.background || '#0f0f23');
    root.style.setProperty('--color-surface', colors.surface || '#1a1a2e');
    root.style.setProperty('--color-text', colors.text || '#ffffff');
    root.style.setProperty('--color-text-secondary', colors.textSecondary || '#cccccc');
    root.style.setProperty('--color-border', colors.border || '#333333');
    
    // Fonts
    root.style.setProperty('--font-primary', fonts.primary || 'VT323, monospace');
    root.style.setProperty('--font-secondary', fonts.secondary || 'Press Start 2P, monospace');
    root.style.setProperty('--font-accent', fonts.accent || 'JetBrains Mono, monospace');
    root.style.setProperty('--font-body', fonts.body || 'Inter, sans-serif');
    
    // Spacing
    root.style.setProperty('--spacing-section', spacing.section || '4rem');
    root.style.setProperty('--spacing-container', spacing.container || '2rem');
    root.style.setProperty('--spacing-element', spacing.element || '1rem');
    
    // Custom CSS effects
    root.style.setProperty('--glow-effect', customCSS.glowEffect || '0 0 20px rgba(220, 38, 38, 0.5)');
    root.style.setProperty('--text-gradient', customCSS.textGradient || 'linear-gradient(45deg, #dc2626, #fbbf24)');
    root.style.setProperty('--hero-background-pattern', customCSS.heroBackgroundPattern || 'none');
    
    // Cleanup function to remove CSS variables when component unmounts
    return () => {
      const variables = [
        '--color-primary', '--color-secondary', '--color-accent', '--color-background',
        '--color-surface', '--color-text', '--color-text-secondary', '--color-border',
        '--font-primary', '--font-secondary', '--font-accent', '--font-body',
        '--spacing-section', '--spacing-container', '--spacing-element',
        '--glow-effect', '--text-gradient', '--hero-background-pattern'
      ];
      variables.forEach(variable => root.style.removeProperty(variable));
    };
  }, [hackathon]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white font-press-start">Loading...</div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-press-start text-2xl text-red-500 mb-4">404</h1>
          <p className="text-white">Hackathon not found</p>
        </div>
      </div>
    );
  }

  const fastFacts = [
    {
      icon: <Clock className="h-5 w-5" />,
      label: 'Date',
      value: `${hackathon.start_date} – ${hackathon.end_date}`,
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: 'Duration',
      value: hackathon.duration,
    },
    { icon: <Globe className="h-5 w-5" />, label: 'Format', value: hackathon.format },
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Team size',
      value: hackathon.team_size,
    },
    {
      icon: <Target className="h-5 w-5" />,
      label: 'Judging',
      value: hackathon.judging_type,
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      label: 'Results',
      value: hackathon.results_date,
    },
  ];

  // Convert theme config to CSS custom properties for dynamic theming
  const theme = hackathon.theme_config || {};
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  const spacing = theme.spacing || {};
  const customCSS = theme.customCSS || {};

  const themeStyle = {
    // Backward compatibility colors
    '--theme-primary': hackathon.theme_color_primary,
    '--theme-secondary': hackathon.theme_color_secondary,
    '--theme-accent': hackathon.theme_color_accent,
    // Enhanced theme colors
    '--color-primary': colors.primary || hackathon.theme_color_primary,
    '--color-secondary': colors.secondary || hackathon.theme_color_secondary,
    '--color-accent': colors.accent || hackathon.theme_color_accent,
    '--color-background': colors.background || '#0f0f23',
    '--color-surface': colors.surface || '#1a1a2e',
    '--color-text': colors.text || '#ffffff',
    '--color-text-secondary': colors.textSecondary || '#cccccc',
    '--color-border': colors.border || '#333333',
    '--color-success': colors.success || '#10b981',
    '--color-warning': colors.warning || '#fbbf24',
    '--color-error': colors.error || '#dc2626',
    // Fonts
    '--font-primary': fonts.primary || 'VT323, monospace',
    '--font-secondary': fonts.secondary || 'Press Start 2P, monospace',
    '--font-accent': fonts.accent || 'JetBrains Mono, monospace',
    '--font-body': fonts.body || 'Inter, sans-serif',
    // Spacing
    '--spacing-section': spacing.section || '4rem',
    '--spacing-container': spacing.container || '2rem',
    '--spacing-element': spacing.element || '1rem',
    // Custom CSS effects
    '--hero-background-pattern': customCSS.heroBackgroundPattern || 'none',
    '--glow-effect': customCSS.glowEffect || '0 0 20px rgba(220, 38, 38, 0.5)',
    '--text-gradient': customCSS.textGradient || 'linear-gradient(45deg, #dc2626, #fbbf24)',
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen bg-gray-900 relative overflow-hidden" 
      style={{
        ...themeStyle,
        backgroundImage: 'var(--hero-background-pattern)',
        fontFamily: 'var(--font-body)'
      }}
    >
      <SEO
        title={`${hackathon.title} - ${hackathon.tagline}`}
        description={hackathon.description}
        keywords={`hackathon, ${hackathon.slug}, coding competition, ${hackathon.format.toLowerCase()}`}
      />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        {/* Glitch sparks */}
        {[...Array(12)].map((_, i) => (
          <div
            key={`spark-${i}`}
            className={`absolute opacity-30 animate-float`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          >
            <Zap className="h-4 w-4" style={{ color: hackathon.theme_color_primary }} />
          </div>
        ))}

        {/* Scattered arrows */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`arrow-${i}`}
            className="absolute opacity-20 animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${5 + Math.random() * 4}s`,
            }}
          >
            <div 
              className="w-8 h-1 relative"
              style={{ backgroundColor: hackathon.theme_color_accent }}
            >
              <div 
                className="absolute right-0 top-0 w-0 h-0 border-l-4 border-t-2 border-b-2 border-t-transparent border-b-transparent"
                style={{ borderLeftColor: hackathon.theme_color_accent }}
              ></div>
            </div>
          </div>
        ))}

        {/* Distressed texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 opacity-90"></div>

        {/* Warning symbols */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`warning-${i}`}
            className="absolute opacity-10 animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${6 + Math.random() * 3}s`,
            }}
          >
            <AlertTriangle className="h-12 w-12" style={{ color: hackathon.theme_color_primary }} />
          </div>
        ))}
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center relative px-4 pt-32">
          {/* Badge */}
          {hackathon.badge_text && (
            <div
              className={`mb-6 transform transition-all duration-1000 ${
                isVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              }`}
            >
              <div 
                className="px-6 py-2 border-4 shadow-2xl relative"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  color: hackathon.theme_color_accent,
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <span className="font-press-start text-xs">
                  {hackathon.badge_text}
                </span>
                <div 
                  className="absolute -top-1 -right-1 w-4 h-4"
                  style={{ backgroundColor: hackathon.theme_color_accent }}
                ></div>
                <div 
                  className="absolute -bottom-1 -left-1 w-4 h-4"
                  style={{ backgroundColor: hackathon.theme_color_primary }}
                ></div>
              </div>
            </div>
          )}

          {/* Title */}
          <div
            className={`text-center mb-8 transform transition-all duration-1000 delay-200 ${
              isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            <h1 
              className="text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight font-press-start"
              style={{
                imageRendering: 'pixelated',
                textRendering: 'geometricPrecision',
                letterSpacing: '0.08em'
              }}
            >
              <span 
                className="inline-block"
                style={{ 
                  color: hackathon.theme_color_primary,
                  textShadow: `2px 2px 0px black, 4px 4px 0px ${hackathon.theme_color_accent}`,
                  imageRendering: 'pixelated'
                }}
              >
                {hackathon.title.split(' ')[0]}
              </span>
              <br />
              <span 
                className="relative inline-block"
                style={{ 
                  color: hackathon.theme_color_accent,
                  textShadow: `2px 2px 0px black, 4px 4px 0px ${hackathon.theme_color_primary}`,
                  imageRendering: 'pixelated',
                  marginTop: '8px',
                  display: 'inline-block'
                }}
              >
                {hackathon.title.split(' ').slice(1).join(' ')}
              </span>
            </h1>
            <h2 
              className="text-xl md:text-2xl mb-4 font-press-start"
              style={{
                fontFamily: 'var(--font-secondary)',
                color: 'var(--color-text-secondary)',
                imageRendering: 'pixelated',
                textRendering: 'geometricPrecision',
                letterSpacing: '0.05em'
              }}
            >
              {hackathon.tagline}
            </h2>
            <div 
              className="bg-black border-4 p-6 inline-block max-w-2xl relative"
              style={{
                borderColor: hackathon.theme_color_primary,
                imageRendering: 'pixelated',
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))'
              }}
            >
              {/* Pixelated corner decorations */}
              <div 
                className="absolute -top-2 -left-2 w-6 h-6 border-2"
                style={{ 
                  backgroundColor: hackathon.theme_color_accent,
                  borderColor: hackathon.theme_color_primary,
                  clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)'
                }}
              ></div>
              <div 
                className="absolute -top-2 -right-2 w-6 h-6 border-2"
                style={{ 
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent,
                  clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 50%)'
                }}
              ></div>
              <div 
                className="absolute -bottom-2 -left-2 w-6 h-6 border-2"
                style={{ 
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent,
                  clipPath: 'polygon(0 0, 50% 0, 50% 50%, 100% 50%, 100% 100%, 0 100%)'
                }}
              ></div>
              <div 
                className="absolute -bottom-2 -right-2 w-6 h-6 border-2"
                style={{ 
                  backgroundColor: hackathon.theme_color_accent,
                  borderColor: hackathon.theme_color_primary,
                  clipPath: 'polygon(0 50%, 50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%)'
                }}
              ></div>
              
              {theme.svgElements?.heroIcon && (
                <div className="absolute -top-4 -right-4 w-8 h-8 text-2xl">
                  {renderSVG(theme.svgElements.heroIcon, 'w-full h-full text-accent')}
                </div>
              )}
              <p 
                className="font-press-start text-base md:text-lg leading-relaxed relative z-10"
                style={{
                  color: hackathon.theme_color_accent,
                  textShadow: `2px 2px 0px ${hackathon.theme_color_primary}`,
                  imageRendering: 'pixelated'
                }}
              >
                "{hackathon.description}"
              </p>
            </div>
          </div>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-1000 delay-400 ${
              isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            {hackathon.registration_url && (
              <Button
                onClick={() => window.open(hackathon.registration_url, '_self')}
                className="font-press-start py-4 px-8 text-lg hover:scale-105 transition-all duration-300 border-4 shadow-2xl relative overflow-hidden"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  color: 'white',
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <span className="relative z-10 flex items-center">
                  <Flame className="h-5 w-5 mr-2" />
                  REGISTER NOW
                </span>
              </Button>
            )}
            <Button
              onClick={() =>
                document
                  .getElementById('prizes')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="font-press-start py-4 px-8 text-lg hover:scale-105 transition-all duration-300 border-4 shadow-2xl relative overflow-hidden"
              style={{
                backgroundColor: 'black',
                color: hackathon.theme_color_accent,
                borderColor: hackathon.theme_color_primary
              }}
            >
              <span className="relative z-10 flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                VIEW PRIZES
              </span>
            </Button>
          </div>
        </section>

        {/* Fast Facts Bar */}
        <section 
          className="py-8 border-y-4 relative mt-20"
          style={{
            backgroundColor: hackathon.theme_color_primary,
            borderColor: hackathon.theme_color_accent
          }}
        >
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {fastFacts.map((fact, index) => (
                <div key={index} className="text-center group">
                  <div 
                    className="flex items-center justify-center mb-2 group-hover:text-white transition-colors"
                    style={{ color: hackathon.theme_color_accent }}
                  >
                    {fact.icon}
                  </div>
                  <div className="font-press-start text-xs text-white mb-1">
                    {fact.label}
                  </div>
                  <div 
                    className="font-jetbrains text-sm font-bold"
                    style={{ color: hackathon.theme_color_accent }}
                  >
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What It Is */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_primary }}
            >
              <AlertTriangle className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              WHAT IT IS
              <AlertTriangle className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
            </h2>
            <div 
              className="border-4 p-8 relative"
              style={{
                backgroundColor: 'black',
                borderColor: hackathon.theme_color_primary
              }}
            >
              <div 
                className="absolute -top-2 -left-2 w-6 h-6"
                style={{ backgroundColor: hackathon.theme_color_accent }}
              ></div>
              <div 
                className="absolute -bottom-2 -right-2 w-6 h-6"
                style={{ backgroundColor: hackathon.theme_color_primary }}
              ></div>
              <p className="font-jetbrains text-lg md:text-xl text-gray-300 leading-relaxed">
                {hackathon.what_it_is}
              </p>
            </div>
          </div>
        </section>

        {/* The Idea */}
        <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-black to-gray-900">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_accent }}
            >
              <Skull className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              THE IDEA
              <Skull className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
            </h2>
            <div 
              className="border-4 p-8 relative"
              style={{
                backgroundColor: hackathon.theme_color_primary,
                borderColor: hackathon.theme_color_accent
              }}
            >
              <div 
                className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r"
                style={{
                  background: `linear-gradient(to right, ${hackathon.theme_color_accent}, ${hackathon.theme_color_primary}, ${hackathon.theme_color_accent})`
                }}
              ></div>
              <p className="font-jetbrains text-lg md:text-xl text-gray-200 leading-relaxed">
                {hackathon.the_idea}
              </p>
            </div>
          </div>
        </section>

        {/* Who Joins */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-12 text-center flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_primary }}
            >
              <Users className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              WHO JOINS
              <Users className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hackathon.who_joins.map((person, index) => (
                <div
                  key={index}
                  className="border-2 p-4 hover:scale-105 transition-all duration-300 relative"
                  style={{
                    backgroundColor: 'black',
                    borderColor: hackathon.theme_color_primary
                  }}
                >
                  <div 
                    className="absolute top-0 right-0 w-3 h-3"
                    style={{ backgroundColor: hackathon.theme_color_accent }}
                  ></div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2"
                      style={{ backgroundColor: hackathon.theme_color_primary }}
                    ></div>
                    <span className="font-jetbrains text-gray-300 font-medium">
                      {person}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Rules */}
        <section 
          className="py-20 px-4 bg-gradient-to-b via-black"
          style={{
            background: `linear-gradient(to bottom, black, ${hackathon.theme_color_primary}30, black)`
          }}
        >
          <div className="container mx-auto max-w-4xl">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-12 text-center flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_accent }}
            >
              <Code className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              TECH RULES
              <Code className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hackathon.tech_rules.map((rule, index) => (
                <div
                  key={index}
                  className="border-l-4 p-4 hover:bg-gray-900 transition-colors duration-300"
                  style={{
                    backgroundColor: 'black',
                    borderLeftColor: hackathon.theme_color_accent
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rotate-45"
                      style={{ backgroundColor: hackathon.theme_color_primary }}
                    ></div>
                    <span className="font-jetbrains text-gray-300">{rule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Prizes */}
        <section id="prizes" className="py-20 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-8 text-center flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_primary }}
            >
              <Trophy className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              PRIZES & PERKS
              <Trophy className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
            </h2>

            {/* Cash Pool */}
            {hackathon.cash_pool && (
              <div className="text-center mb-8">
                <div 
                  className="px-8 py-4 border-4 inline-block relative"
                  style={{
                    backgroundColor: hackathon.theme_color_accent,
                    color: 'black',
                    borderColor: hackathon.theme_color_primary
                  }}
                >
                  <div 
                    className="absolute -top-2 -left-2 w-6 h-6"
                    style={{ backgroundColor: hackathon.theme_color_primary }}
                  ></div>
                  <div 
                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-black"
                  ></div>
                  <span className="font-press-start text-xl">
                    CASH POOL: {hackathon.cash_pool}
                  </span>
                </div>
              </div>
            )}

            {/* Perks */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card 
                className="border-4"
                style={{
                  backgroundColor: 'black',
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <CardContent className="p-6">
                  <h3 
                    className="font-press-start text-xl mb-4"
                    style={{ color: hackathon.theme_color_accent }}
                  >
                    PERKS
                  </h3>
                  <ul className="space-y-2">
                    {hackathon.perks.map((perk, index) => (
                      <li key={index} className="font-jetbrains text-gray-300 flex items-center gap-2">
                        <Star className="h-4 w-4" style={{ color: hackathon.theme_color_primary }} />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card 
                className="border-4"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <CardContent className="p-6">
                  <h3 
                    className="font-press-start text-xl mb-4"
                    style={{ color: hackathon.theme_color_accent }}
                  >
                    FUN AWARDS
                  </h3>
                  <ul className="space-y-2">
                    {hackathon.fun_awards.map((award, index) => (
                      <li
                        key={index}
                        className="font-jetbrains text-gray-200 flex items-center gap-2"
                      >
                        <Skull className="h-4 w-4" style={{ color: hackathon.theme_color_accent }} />
                        {award}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Judging */}
        <section className="py-20 px-4 bg-gradient-to-b from-black via-gray-900 to-black">
          <div className="container mx-auto max-w-4xl">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-8 text-center flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_accent }}
            >
              <Shield className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              JUDGING
              <Shield className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
            </h2>
            <div 
              className="border-4 p-8 relative"
              style={{
                backgroundColor: 'black',
                borderColor: hackathon.theme_color_primary
              }}
            >
              <div 
                className="absolute -top-1 left-4 right-4 h-2"
                style={{ backgroundColor: hackathon.theme_color_accent }}
              ></div>
              <div className="mb-6">
                <h3 
                  className="font-press-start text-lg mb-4"
                  style={{ color: hackathon.theme_color_accent }}
                >
                  REVIEWERS
                </h3>
                <p className="font-jetbrains text-gray-300">
                  {hackathon.judging_description}
                </p>
              </div>
              <div>
                <h3 
                  className="font-press-start text-lg mb-4"
                  style={{ color: hackathon.theme_color_accent }}
                >
                  CRITERIA
                </h3>
                <p className="font-jetbrains text-gray-300">
                  {hackathon.judging_criteria}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Submission */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 
              className="font-press-start text-3xl md:text-4xl mb-12 text-center flex items-center justify-center gap-3"
              style={{ color: hackathon.theme_color_primary }}
            >
              <FileText className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              SUBMISSION
              <FileText className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div 
                className="border-4 p-6 relative"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <div 
                  className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center"
                  style={{ backgroundColor: hackathon.theme_color_accent }}
                >
                  <span className="font-press-start text-xs text-black">!</span>
                </div>
                <h3 
                  className="font-press-start text-xl mb-6 flex items-center gap-2"
                  style={{ color: hackathon.theme_color_accent }}
                >
                  <FileText className="h-5 w-5" />
                  REQUIRED
                </h3>
                <ul className="space-y-3">
                  {hackathon.required_submissions.map((requirement, index) => (
                    <li key={index} className="font-jetbrains text-gray-200 flex items-start gap-2">
                      <span style={{ color: hackathon.theme_color_accent }}>▸</span>
                      {requirement}
                    </li>
                  ))}
                </ul>
              </div>

              {hackathon.optional_submissions && hackathon.optional_submissions.length > 0 && (
                <div 
                  className="border-4 p-6 relative"
                  style={{
                    backgroundColor: 'black',
                    borderColor: hackathon.theme_color_primary
                  }}
                >
                  <div 
                    className="absolute -top-2 -left-2 w-8 h-8 flex items-center justify-center"
                    style={{ backgroundColor: hackathon.theme_color_primary }}
                  >
                    <span className="font-press-start text-xs text-white">?</span>
                  </div>
                  <h3 
                    className="font-press-start text-xl mb-6 flex items-center gap-2"
                    style={{ color: hackathon.theme_color_primary }}
                  >
                    <Video className="h-5 w-5" />
                    OPTIONAL
                  </h3>
                  <ul className="space-y-3">
                    {hackathon.optional_submissions.map((optional, index) => (
                      <li key={index} className="font-jetbrains text-gray-300 flex items-start gap-2">
                        <span style={{ color: hackathon.theme_color_primary }}>▸</span>
                        {optional}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Announcements */}
        {hackathon.announcements && (
          <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-black to-gray-900">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_primary }}
              >
                <AlertTriangle className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
                ANNOUNCEMENTS
                <AlertTriangle className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: hackathon.theme_color_accent,
                  borderColor: hackathon.theme_color_primary
                }}
              >
                <div 
                  className="absolute -top-2 -left-2 w-6 h-6"
                  style={{ backgroundColor: hackathon.theme_color_primary }}
                ></div>
                <div 
                  className="absolute -bottom-2 -right-2 w-6 h-6"
                  style={{ backgroundColor: hackathon.theme_color_primary }}
                ></div>
                <p className="font-jetbrains text-lg md:text-xl text-black leading-relaxed">
                  {hackathon.announcements}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Event Highlights */}
        {hackathon.event_highlights && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_accent }}
              >
                <Star className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
                EVENT HIGHLIGHTS
                <Star className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: 'black',
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <div 
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r"
                  style={{
                    background: `linear-gradient(to right, ${hackathon.theme_color_primary}, ${hackathon.theme_color_accent}, ${hackathon.theme_color_primary})`
                  }}
                ></div>
                <p className="font-jetbrains text-lg md:text-xl text-gray-200 leading-relaxed">
                  {hackathon.event_highlights}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Sponsor Message */}
        {hackathon.sponsor_message && (
          <section className="py-20 px-4 bg-gradient-to-b from-black via-gray-900 to-black">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_primary }}
              >
                <Shield className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
                FROM OUR SPONSORS
                <Shield className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <div 
                  className="absolute -top-1 left-4 right-4 h-2"
                  style={{ backgroundColor: hackathon.theme_color_accent }}
                ></div>
                <p className="font-jetbrains text-lg md:text-xl text-gray-200 leading-relaxed">
                  {hackathon.sponsor_message}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* FAQ Content */}
        {hackathon.faq_content && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_accent }}
              >
                <FileText className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
                FAQ
                <FileText className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: 'black',
                  borderColor: hackathon.theme_color_primary
                }}
              >
                <div 
                  className="absolute -top-2 -right-2 w-6 h-6"
                  style={{ backgroundColor: hackathon.theme_color_accent }}
                ></div>
                <div 
                  className="absolute -bottom-2 -left-2 w-6 h-6"
                  style={{ backgroundColor: hackathon.theme_color_primary }}
                ></div>
                <div className="font-jetbrains text-lg md:text-xl text-gray-300 leading-relaxed text-left">
                  {hackathon.faq_content.split('\n').map((line, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Timeline Details */}
        {hackathon.timeline_details && (
          <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-black to-gray-900">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_primary }}
              >
                <Clock className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
                TIMELINE
                <Clock className="h-8 w-8" style={{ color: hackathon.theme_color_accent }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: 'black',
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <div className="font-jetbrains text-lg md:text-xl text-gray-300 leading-relaxed text-left">
                  {hackathon.timeline_details.split('\n').map((line, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Special Instructions */}
        {hackathon.special_instructions && (
          <section className="py-20 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <h2 
                className="font-press-start text-3xl md:text-4xl mb-8 flex items-center justify-center gap-3"
                style={{ color: hackathon.theme_color_accent }}
              >
                <Target className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
                SPECIAL INSTRUCTIONS
                <Target className="h-8 w-8" style={{ color: hackathon.theme_color_primary }} />
              </h2>
              <div 
                className="border-4 p-8 relative"
                style={{
                  backgroundColor: hackathon.theme_color_primary,
                  borderColor: hackathon.theme_color_accent
                }}
              >
                <div 
                  className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r"
                  style={{
                    background: `linear-gradient(to right, ${hackathon.theme_color_accent}, ${hackathon.theme_color_primary}, ${hackathon.theme_color_accent})`
                  }}
                ></div>
                <div className="font-jetbrains text-lg md:text-xl text-gray-200 leading-relaxed text-left">
                  {hackathon.special_instructions.split('\n').map((line, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div 
              className="p-12 border-4 relative"
              style={{
                background: `linear-gradient(to right, ${hackathon.theme_color_primary}80, black, ${hackathon.theme_color_primary}80)`,
                borderColor: hackathon.theme_color_accent
              }}
            >
              <div className="absolute inset-0 bg-black opacity-40"></div>
              <div className="relative z-10">
                <h2 className="font-press-start text-2xl md:text-3xl mb-6 text-white">
                  READY FOR {hackathon.title.toUpperCase()}?
                </h2>
                <p className="font-jetbrains text-gray-300 mb-8">
                  {hackathon.tagline}
                </p>
                {hackathon.registration_url && (
                  <button
                    onClick={() => window.open(hackathon.registration_url, '_self')}
                    className="font-bold py-3 px-4 sm:py-6 sm:px-12 text-xs sm:text-base md:text-lg lg:text-xl hover:scale-105 transition-all duration-300 border-2 sm:border-4 shadow-2xl relative overflow-hidden w-full sm:w-auto max-w-sm sm:max-w-none"
                    style={{
                      backgroundColor: hackathon.theme_color_accent,
                      color: 'black',
                      borderColor: hackathon.theme_color_primary
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center text-black">
                      <Flame className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mr-2 flex-shrink-0" />
                      REGISTER NOW
                      <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ml-2 flex-shrink-0" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}