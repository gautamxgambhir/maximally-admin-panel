import type { CertificateTemplate, CertificateType } from '@/types/certificate'

// Maximally brand colors
const BRAND_COLORS = {
  primary: '#3B82F6', // Blue
  secondary: '#1E40AF', // Dark Blue
  accent: '#F59E0B', // Amber
  success: '#10B981', // Green
  purple: '#8B5CF6', // Purple
  pink: '#EC4899', // Pink
  red: '#EF4444', // Red
  orange: '#F97316', // Orange
  teal: '#14B8A6', // Teal
  indigo: '#6366F1', // Indigo
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  black: '#1F2937'
}

export interface ExtendedCertificateTemplate extends CertificateTemplate {
  id: string
  name: string
  preview: string // HTML for preview thumbnail
  category: 'classic' | 'modern' | 'elegant' | 'creative'
}

// Winner Certificate Templates
const WINNER_TEMPLATES: ExtendedCertificateTemplate[] = [
  {
    id: 'winner-classic-gold',
    name: 'Classic Gold',
    category: 'classic',
    type: 'winner',
    title: 'Certificate of Excellence',
    subtitle: 'Winner Recognition',
    description: 'This certificate is awarded in recognition of outstanding achievement and excellence',
    backgroundColor: '#FEF3C7', // Light gold
    primaryColor: BRAND_COLORS.accent,
    secondaryColor: '#B45309', // Dark amber
    preview: generatePreviewHTML('winner-classic-gold', 'Classic Gold', '#FEF3C7', BRAND_COLORS.accent)
  },
  {
    id: 'winner-modern-blue',
    name: 'Modern Blue',
    category: 'modern',
    type: 'winner',
    title: 'Achievement Certificate',
    subtitle: 'Excellence Award',
    description: 'Awarded for demonstrating exceptional skill and outstanding performance',
    backgroundColor: '#EBF8FF', // Light blue
    primaryColor: BRAND_COLORS.primary,
    secondaryColor: BRAND_COLORS.secondary,
    preview: generatePreviewHTML('winner-modern-blue', 'Modern Blue', '#EBF8FF', BRAND_COLORS.primary)
  },
  {
    id: 'winner-elegant-purple',
    name: 'Elegant Purple',
    category: 'elegant',
    type: 'winner',
    title: 'Certificate of Distinction',
    subtitle: 'Distinguished Winner',
    description: 'This certificate recognizes exceptional talent and remarkable achievement',
    backgroundColor: '#F3E8FF', // Light purple
    primaryColor: BRAND_COLORS.purple,
    secondaryColor: '#6B21A8', // Dark purple
    preview: generatePreviewHTML('winner-elegant-purple', 'Elegant Purple', '#F3E8FF', BRAND_COLORS.purple)
  },
  {
    id: 'winner-creative-gradient',
    name: 'Creative Gradient',
    category: 'creative',
    type: 'winner',
    title: 'Victory Certificate',
    subtitle: 'Champion Recognition',
    description: 'Celebrating innovative thinking and exceptional achievement in competition',
    backgroundColor: '#F0F9FF', // Very light blue
    primaryColor: BRAND_COLORS.indigo,
    secondaryColor: BRAND_COLORS.purple,
    preview: generatePreviewHTML('winner-creative-gradient', 'Creative Gradient', '#F0F9FF', BRAND_COLORS.indigo)
  }
]

// Participant Certificate Templates
const PARTICIPANT_TEMPLATES: ExtendedCertificateTemplate[] = [
  {
    id: 'participant-classic-blue',
    name: 'Classic Blue',
    category: 'classic',
    type: 'participant',
    title: 'Certificate of Participation',
    subtitle: 'Participant Recognition',
    description: 'This certificate is awarded in recognition of active participation and contribution',
    backgroundColor: BRAND_COLORS.lightGray,
    primaryColor: BRAND_COLORS.primary,
    secondaryColor: BRAND_COLORS.secondary,
    preview: generatePreviewHTML('participant-classic-blue', 'Classic Blue', BRAND_COLORS.lightGray, BRAND_COLORS.primary)
  },
  {
    id: 'participant-modern-teal',
    name: 'Modern Teal',
    category: 'modern',
    type: 'participant',
    title: 'Participation Certificate',
    subtitle: 'Active Contributor',
    description: 'Recognizing dedicated participation and valuable contribution to the event',
    backgroundColor: '#F0FDFA', // Light teal
    primaryColor: BRAND_COLORS.teal,
    secondaryColor: '#0D9488', // Dark teal
    preview: generatePreviewHTML('participant-modern-teal', 'Modern Teal', '#F0FDFA', BRAND_COLORS.teal)
  },
  {
    id: 'participant-elegant-green',
    name: 'Elegant Green',
    category: 'elegant',
    type: 'participant',
    title: 'Certificate of Engagement',
    subtitle: 'Valued Participant',
    description: 'This certificate acknowledges your meaningful participation and engagement',
    backgroundColor: '#F0FDF4', // Light green
    primaryColor: BRAND_COLORS.success,
    secondaryColor: '#047857', // Dark green
    preview: generatePreviewHTML('participant-elegant-green', 'Elegant Green', '#F0FDF4', BRAND_COLORS.success)
  },
  {
    id: 'participant-creative-orange',
    name: 'Creative Orange',
    category: 'creative',
    type: 'participant',
    title: 'Participation Award',
    subtitle: 'Creative Contributor',
    description: 'Celebrating your creative participation and innovative contributions',
    backgroundColor: '#FFF7ED', // Light orange
    primaryColor: BRAND_COLORS.orange,
    secondaryColor: '#C2410C', // Dark orange
    preview: generatePreviewHTML('participant-creative-orange', 'Creative Orange', '#FFF7ED', BRAND_COLORS.orange)
  }
]

// Judge Certificate Templates
const JUDGE_TEMPLATES: ExtendedCertificateTemplate[] = [
  {
    id: 'judge-classic-green',
    name: 'Classic Green',
    category: 'classic',
    type: 'judge',
    title: 'Certificate of Appreciation',
    subtitle: 'Judge Recognition',
    description: 'This certificate is awarded in appreciation of valuable service as a judge',
    backgroundColor: BRAND_COLORS.lightGray,
    primaryColor: BRAND_COLORS.success,
    secondaryColor: BRAND_COLORS.primary,
    preview: generatePreviewHTML('judge-classic-green', 'Classic Green', BRAND_COLORS.lightGray, BRAND_COLORS.success)
  },
  {
    id: 'judge-modern-indigo',
    name: 'Modern Indigo',
    category: 'modern',
    type: 'judge',
    title: 'Appreciation Certificate',
    subtitle: 'Expert Judge',
    description: 'Recognizing your expertise and fair judgment in evaluating participants',
    backgroundColor: '#EEF2FF', // Light indigo
    primaryColor: BRAND_COLORS.indigo,
    secondaryColor: '#4338CA', // Dark indigo
    preview: generatePreviewHTML('judge-modern-indigo', 'Modern Indigo', '#EEF2FF', BRAND_COLORS.indigo)
  },
  {
    id: 'judge-elegant-red',
    name: 'Elegant Red',
    category: 'elegant',
    type: 'judge',
    title: 'Certificate of Honor',
    subtitle: 'Distinguished Judge',
    description: 'This certificate honors your distinguished service and expert evaluation',
    backgroundColor: '#FEF2F2', // Light red
    primaryColor: BRAND_COLORS.red,
    secondaryColor: '#B91C1C', // Dark red
    preview: generatePreviewHTML('judge-elegant-red', 'Elegant Red', '#FEF2F2', BRAND_COLORS.red)
  },
  {
    id: 'judge-creative-pink',
    name: 'Creative Pink',
    category: 'creative',
    type: 'judge',
    title: 'Recognition Certificate',
    subtitle: 'Valued Judge',
    description: 'Appreciating your valuable insights and fair assessment of all participants',
    backgroundColor: '#FDF2F8', // Light pink
    primaryColor: BRAND_COLORS.pink,
    secondaryColor: '#BE185D', // Dark pink
    preview: generatePreviewHTML('judge-creative-pink', 'Creative Pink', '#FDF2F8', BRAND_COLORS.pink)
  }
]

// Helper function to generate preview HTML
function generatePreviewHTML(id: string, name: string, bgColor: string, primaryColor: string): string {
  return `
    <div style="
      width: 200px;
      height: 130px;
      background: ${bgColor};
      border: 2px solid ${primaryColor};
      border-radius: 8px;
      padding: 12px;
      font-family: Arial, sans-serif;
      position: relative;
      overflow: hidden;
    ">
      <div style="
        text-align: center;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      ">
        <div style="
          font-size: 14px;
          font-weight: bold;
          color: ${primaryColor};
          margin-bottom: 4px;
        ">MAXIMALLY</div>
        <div style="
          width: 30px;
          height: 2px;
          background: ${primaryColor};
          margin: 0 auto 6px auto;
        "></div>
        <div style="
          font-size: 10px;
          color: #666;
          margin-bottom: 8px;
        ">${name}</div>
        <div style="
          font-size: 8px;
          color: #888;
          line-height: 1.2;
        ">Sample Certificate Layout</div>
      </div>
      <div style="
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        background: ${primaryColor};
        opacity: 0.1;
        border-radius: 50%;
      "></div>
    </div>
  `
}

// Export all templates organized by type
export const CERTIFICATE_TEMPLATE_GALLERY = {
  winner: WINNER_TEMPLATES,
  participant: PARTICIPANT_TEMPLATES,
  judge: JUDGE_TEMPLATES
}

// Export templates as a flat array for easy searching
export const ALL_TEMPLATES = [
  ...WINNER_TEMPLATES,
  ...PARTICIPANT_TEMPLATES,
  ...JUDGE_TEMPLATES
]

// Helper function to get template by ID
export const getTemplateById = (id: string): ExtendedCertificateTemplate | undefined => {
  return ALL_TEMPLATES.find(template => template.id === id)
}

// Helper function to get templates by category
export const getTemplatesByCategory = (category: ExtendedCertificateTemplate['category']): ExtendedCertificateTemplate[] => {
  return ALL_TEMPLATES.filter(template => template.category === category)
}

// Helper function to get templates by type
export const getTemplatesByType = (type: CertificateType): ExtendedCertificateTemplate[] => {
  return CERTIFICATE_TEMPLATE_GALLERY[type]
}

// Category display names and descriptions
export const TEMPLATE_CATEGORIES = {
  classic: {
    name: 'Classic',
    description: 'Traditional and timeless certificate designs',
    icon: '📜'
  },
  modern: {
    name: 'Modern',
    description: 'Clean and contemporary certificate styles',
    icon: '🎨'
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated and refined certificate layouts',
    icon: '✨'
  },
  creative: {
    name: 'Creative',
    description: 'Unique and innovative certificate designs',
    icon: '🌟'
  }
}