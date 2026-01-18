import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useCreateDocPage, useUpdateDocPage, useDeleteDocPage, useDocPage, useDocSections } from '../hooks/useDocs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ConfirmModal } from './ConfirmModal';

interface DocPageManagerProps {
  pageId?: string;
  sectionId?: string;
  onClose: () => void;
  onSave: () => void;
}

export const DocPageManager: React.FC<DocPageManagerProps> = ({
  pageId,
  sectionId: initialSectionId,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    section_id: initialSectionId || '',
    slug: '',
    title: '',
    description: '',
    content: '',
    order_index: 0,
    is_published: true,
    meta_title: '',
    meta_description: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: page } = useDocPage(pageId || '');
  const { data: sections = [] } = useDocSections();
  const createPage = useCreateDocPage();
  const updatePage = useUpdateDocPage();
  const deletePage = useDeleteDocPage();

  const isEditing = !!pageId;

  useEffect(() => {
    if (page) {
      setFormData({
        section_id: page.section_id,
        slug: page.slug,
        title: page.title,
        description: page.description || '',
        content: page.content,
        order_index: page.order_index,
        is_published: page.is_published,
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
      });
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && pageId) {
        await updatePage.mutateAsync({
          id: pageId,
          updates: formData,
        });
      } else {
        await createPage.mutateAsync(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleDelete = async () => {
    if (!pageId) return;

    try {
      await deletePage.mutateAsync(pageId);
      setShowDeleteConfirm(false);
      onSave();
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      slug: !isEditing ? generateSlug(value) : prev.slug, // Only auto-generate for new pages
      meta_title: !prev.meta_title ? value : prev.meta_title, // Auto-fill if empty
    }));
  };

  const activeSections = sections.filter(section => section.is_active);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isEditing ? 'Edit Page' : 'Create New Page'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deletePage.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="section_id">Section *</Label>
                  <Select
                    value={formData.section_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, section_id: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_index">Order</Label>
                  <Input
                    id="order_index"
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Getting Started Guide"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., getting-started-guide"
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens allowed"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this page"
                  rows={2}
                />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Content</h3>
              
              <div className="space-y-2">
                <Label htmlFor="content">Markdown Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="# Page Title

Write your content in Markdown format...

## Section Heading

- List item 1
- List item 2

**Bold text** and *italic text*

[Link text](https://example.com)"
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500">
                  Use Markdown syntax. Preview will be available after saving.
                </p>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">SEO Settings</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                    placeholder="SEO title (defaults to page title)"
                    maxLength={60}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.meta_title.length}/60 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="SEO description for search engines"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500">
                    {formData.meta_description.length}/160 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Publishing Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Publishing</h3>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="is_published">Published</Label>
                <p className="text-sm text-gray-500">
                  Unpublished pages are hidden from public view
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPage.isPending || updatePage.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isEditing ? 'Update Page' : 'Create Page'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Page"
          message="Are you sure you want to delete this page? This action cannot be undone."
          confirmText="Delete Page"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </>
  );
};