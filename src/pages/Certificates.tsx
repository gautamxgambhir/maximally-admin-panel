import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CertificateGenerator } from '@/components/CertificateGenerator'
import { EnhancedCertificateList } from '@/components/EnhancedCertificateList'
import { Plus, List } from 'lucide-react'

export function Certificates() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'list')

  // Update active tab when URL params change
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && (tabParam === 'list' || tabParam === 'generate')) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setSearchParams({ tab: value })
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Certificate List
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate Certificates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <EnhancedCertificateList />
        </TabsContent>

        <TabsContent value="generate" className="mt-6">
          <CertificateGenerator />
        </TabsContent>
      </Tabs>
    </div>
  )
}