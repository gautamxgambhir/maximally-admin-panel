import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createHackathonV2, generateSlug, getNextSortOrder } from '@/lib/hackathonApi'
import { CreateHackathonV2Data } from '@/types/hackathon'

interface ParsedHackathon {
  title: string
  subtitle: string
  start_date: string
  end_date: string
  duration: string
  location: string
  focus_areas: string
  devpost_url: string
  devpost_register_url: string
}

interface ImportResult {
  title: string
  success: boolean
  error?: string
}

export function BulkHackathonImport() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedHackathon[]>([])
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const CSV_TEMPLATE = `title,subtitle,start_date,end_date,duration,location,focus_areas,devpost_url,devpost_register_url
"AI Innovation Hackathon","Build the future with AI","Jan 15, 2026","Jan 17, 2026","48 hours","Online","AI/ML, Deep Learning, NLP","https://ai-innovation.devpost.com","https://ai-innovation.devpost.com/register"
"Web3 Builder Challenge","Decentralize everything","Feb 1, 2026","Feb 3, 2026","72 hours","San Francisco, USA","Blockchain, Web3, DeFi","https://web3-builder.devpost.com","https://web3-builder.devpost.com/register"`

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hackathon_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCSV = (text: string): ParsedHackathon[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = parseCSVLine(lines[0])
    const hackathons: ParsedHackathon[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length < 9) continue

      hackathons.push({
        title: values[0]?.trim() || '',
        subtitle: values[1]?.trim() || '',
        start_date: values[2]?.trim() || '',
        end_date: values[3]?.trim() || '',
        duration: values[4]?.trim() || '',
        location: values[5]?.trim() || '',
        focus_areas: values[6]?.trim() || '',
        devpost_url: values[7]?.trim() || '',
        devpost_register_url: values[8]?.trim() || '',
      })
    }

    return hackathons
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setParsedData([])
    setImportResults([])
    setShowResults(false)

    try {
      const text = await file.text()
      let hackathons: ParsedHackathon[] = []

      if (file.name.endsWith('.csv')) {
        hackathons = parseCSV(text)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        toast.error('Excel files require xlsx library. Please use CSV format.')
        setIsProcessing(false)
        return
      } else {
        toast.error('Please upload a CSV file')
        setIsProcessing(false)
        return
      }

      if (hackathons.length === 0) {
        toast.error('No valid hackathons found in file')
        setIsProcessing(false)
        return
      }

      setParsedData(hackathons)
      toast.success(`Found ${hackathons.length} hackathons to import`)
    } catch (error) {
      console.error('Error parsing file:', error)
      toast.error('Failed to parse file')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const importHackathons = async () => {
    if (parsedData.length === 0) return

    setIsProcessing(true)
    const results: ImportResult[] = []
    let baseSortOrder = await getNextSortOrder()

    for (let i = 0; i < parsedData.length; i++) {
      const hackathon = parsedData[i]
      try {
        const focusAreas = hackathon.focus_areas
          .split(',')
          .map(area => area.trim())
          .filter(area => area)

        const formattedData: CreateHackathonV2Data = {
          title: hackathon.title,
          subtitle: hackathon.subtitle,
          start_date: hackathon.start_date,
          end_date: hackathon.end_date,
          duration: hackathon.duration,
          location: hackathon.location,
          status: 'draft', // Always draft for bulk import
          focus_areas: focusAreas,
          devpost_url: hackathon.devpost_url,
          devpost_register_url: hackathon.devpost_register_url,
          slug: generateSlug(hackathon.title),
          tagline: `${hackathon.title} - Join us for this amazing event!`,
          description: `${hackathon.title} is an exciting hackathon happening from ${hackathon.start_date} to ${hackathon.end_date}. Duration: ${hackathon.duration}.${hackathon.location ? ` Location: ${hackathon.location}.` : ''} Come build amazing projects!`,
          format: 'Online',
          team_size: '1-4 members',
          judging_type: 'Panel review',
          results_date: hackathon.end_date,
          what_it_is: `${hackathon.title} is a hackathon where developers, designers, and innovators come together to build amazing projects.`,
          the_idea: 'Build innovative solutions, learn new technologies, and network with fellow creators in this exciting competition.',
          who_joins: ['Developers', 'Designers', 'Students', 'Innovators'],
          tech_rules: ['Any technology stack allowed', 'Open source encouraged', 'AI tools permitted'],
          fun_awards: ['Best Overall Project', 'Most Creative', 'Best Technical Implementation'],
          perks: ['Networking opportunities', 'Learning experience', 'Recognition and prizes'],
          judging_description: 'Projects will be evaluated by industry experts based on creativity, technical implementation, and overall impact.',
          judging_criteria: 'Innovation (25%), Technical Excellence (25%), Design & UX (25%), Impact & Feasibility (25%)',
          required_submissions: ['Project demo', 'Source code', 'Project description'],
          theme_color_primary: '#dc2626',
          theme_color_secondary: '#fbbf24',
          theme_color_accent: '#10b981',
          is_active: false, // Draft hackathons are not active
          sort_order: baseSortOrder - i,
        }

        await createHackathonV2(formattedData)
        results.push({ title: hackathon.title, success: true })
      } catch (error: any) {
        results.push({ title: hackathon.title, success: false, error: error.message })
      }
    }

    setImportResults(results)
    setShowResults(true)
    setParsedData([])

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    if (failCount === 0) {
      toast.success(`Successfully imported ${successCount} hackathons as drafts!`)
    } else {
      toast.warning(`Imported ${successCount} hackathons, ${failCount} failed`)
    }

    setIsProcessing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Import Hackathons
        </CardTitle>
        <CardDescription>
          Import multiple hackathons at once from a CSV file. All imported hackathons will be saved as drafts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">CSV Format Required</p>
              <p className="text-sm text-muted-foreground mt-1">Your file must have these columns in order:</p>
              <code className="block mt-2 p-2 bg-background rounded text-xs overflow-x-auto border">
                title, subtitle, start_date, end_date, duration, location, focus_areas, devpost_url, devpost_register_url
              </code>
              <ul className="mt-3 text-sm space-y-1 text-muted-foreground">
                <li>• <span className="font-medium text-foreground">title:</span> Hackathon name (e.g., "AI Innovation Hackathon")</li>
                <li>• <span className="font-medium text-foreground">subtitle:</span> Short tagline (e.g., "Build the future with AI")</li>
                <li>• <span className="font-medium text-foreground">start_date:</span> Start date (e.g., "Jan 15, 2026")</li>
                <li>• <span className="font-medium text-foreground">end_date:</span> End date (e.g., "Jan 17, 2026")</li>
                <li>• <span className="font-medium text-foreground">duration:</span> Duration text (e.g., "48 hours")</li>
                <li>• <span className="font-medium text-foreground">location:</span> Location (e.g., "Online" or "San Francisco, USA")</li>
                <li>• <span className="font-medium text-foreground">focus_areas:</span> Comma-separated areas (e.g., "AI/ML, Web Dev")</li>
                <li>• <span className="font-medium text-foreground">devpost_url:</span> Devpost page URL</li>
                <li>• <span className="font-medium text-foreground">devpost_register_url:</span> Devpost registration URL</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Upload CSV'}
          </Button>
        </div>

        {parsedData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Preview ({parsedData.length} hackathons)</h4>
              <Button onClick={importHackathons} disabled={isProcessing}>
                {isProcessing ? 'Importing...' : `Import All as Draft`}
              </Button>
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Title</th>
                    <th className="p-2 text-left">Dates</th>
                    <th className="p-2 text-left">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{h.title}</td>
                      <td className="p-2">{h.start_date} - {h.end_date}</td>
                      <td className="p-2">{h.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showResults && importResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Import Results</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {importResults.map((result, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border rounded">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="flex-1">{result.title}</span>
                  {result.success ? (
                    <Badge variant="secondary">Draft</Badge>
                  ) : (
                    <span className="text-xs text-red-500">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
