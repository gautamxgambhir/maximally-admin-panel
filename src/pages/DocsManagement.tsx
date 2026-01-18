import React, { useState } from 'react';
import { Plus, Search, Book, FileText, Settings, Eye, Edit, Trash2, GripVertical } from 'lucide-react';
import { useDocSections, useDocPages, useUpdateDocSection } from '../hooks/useDocs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DocSectionManager } from '../components/DocSectionManager';
import { DocPageManager } from '../components/DocPageManager';
import { DocPageEditor } from '../components/DocPageEditor';
import { DocPreview } from '../components/DocPreview';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableSectionProps {
  section: any;
  onEdit: () => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({ section, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{section.display_name}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={section.is_active ? 'default' : 'secondary'}>
                {section.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

const DocsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionForEdit, setSelectedSectionForEdit] = useState<string | undefined>(undefined);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showPageManager, setShowPageManager] = useState(false);

  const { data: sections = [], isLoading: sectionsLoading } = useDocSections();
  const { data: pages = [], isLoading: pagesLoading } = useDocPages(selectedSection || undefined);
  const updateSection = useUpdateDocSection();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredSections = sections.filter(section =>
    section.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredSections.findIndex((s) => s.id === active.id);
      const newIndex = filteredSections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(filteredSections, oldIndex, newIndex);

      // Update order_index for all affected sections
      for (let i = 0; i < reorderedSections.length; i++) {
        if (reorderedSections[i].order_index !== i) {
          await updateSection.mutateAsync({
            id: reorderedSections[i].id,
            updates: { order_index: i },
          });
        }
      }
    }
  };

  if (editingPage) {
    return (
      <DocPageEditor
        pageId={editingPage}
        onClose={() => setEditingPage(null)}
        onSave={() => {
          setEditingPage(null);
          // Refresh data will happen automatically via react-query
        }}
      />
    );
  }

  if (selectedPage) {
    return (
      <DocPreview
        pageId={selectedPage}
        onClose={() => setSelectedPage(null)}
        onEdit={() => {
          setEditingPage(selectedPage);
          setSelectedPage(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documentation Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage documentation sections and pages for the public documentation site
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSectionManager(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Section
          </Button>
          <Button
            onClick={() => setShowPageManager(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search sections and pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sections</CardTitle>
                <Book className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sections.length}</div>
                <p className="text-xs text-muted-foreground">
                  {sections.filter(s => s.is_active).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pages.length}</div>
                <p className="text-xs text-muted-foreground">
                  {pages.filter(p => p.is_published).length} published
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {pages.filter(p => {
                    const updatedAt = new Date(p.updated_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return updatedAt > weekAgo;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  In the last 7 days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest changes to documentation sections and pages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pages
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .slice(0, 5)
                  .map((page) => (
                    <div key={page.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{page.title}</p>
                          <p className="text-sm text-gray-500">
                            in {page.section?.display_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={page.is_published ? 'default' : 'secondary'}>
                          {page.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-6">
          <div className="grid gap-4">
            {sectionsLoading ? (
              <div className="text-center py-8">Loading sections...</div>
            ) : filteredSections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No sections match your search' : 'No sections found'}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredSections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredSections.map((section) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      onEdit={() => {
                        setSelectedSectionForEdit(section.id);
                        setShowSectionManager(true);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <div className="grid gap-4">
            {pagesLoading ? (
              <div className="text-center py-8">Loading pages...</div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No pages match your search' : 'No pages found'}
              </div>
            ) : (
              filteredPages.map((page) => (
                <Card key={page.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <div>
                          <CardTitle className="text-lg">{page.title}</CardTitle>
                          <CardDescription>
                            {page.description} • in {page.section?.display_name}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={page.is_published ? 'default' : 'secondary'}>
                          {page.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPage(page.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingPage(page.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showSectionManager && (
        <DocSectionManager
          sectionId={selectedSectionForEdit}
          onClose={() => {
            setShowSectionManager(false);
            setSelectedSectionForEdit(undefined);
          }}
          onSave={() => {
            setShowSectionManager(false);
            setSelectedSectionForEdit(undefined);
          }}
        />
      )}

      {showPageManager && (
        <DocPageManager
          onClose={() => setShowPageManager(false)}
          onSave={() => setShowPageManager(false)}
        />
      )}
    </div>
  );
};

export default DocsManagement;