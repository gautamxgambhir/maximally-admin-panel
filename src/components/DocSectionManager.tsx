import React, { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { useCreateDocSection, useUpdateDocSection, useDeleteDocSection, useDocSection } from '../hooks/useDocs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ConfirmModal } from './ConfirmModal';

interface DocSectionManagerProps {
  sectionId?: string;
  onClose: () => void;
  onSave: () => void;
}

const ICON_OPTIONS = [
  { value: 'Zap', label: 'Zap (Getting Started)' },
  { value: 'Users', label: 'Users (Participants)' },
  { value: 'Code', label: 'Code (Organizers)' },
  { value: 'Book', label: 'Book (Community)' },
  { value: 'HelpCircle', label: 'Help Circle (Support)' },
  { value: 'FileText', label: 'File Text (Documentation)' },
  { value: 'Settings', label: 'Settings (Configuration)' },
  { value: 'Shield', label: 'Shield (Security)' },
  { value: 'Rocket', label: 'Rocket (Launch)' },
  { value: 'Target', label: 'Target (Goals)' },
];

export const DocSectionManager: React.FC<DocSectionManagerProps> = ({
  sectionId,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    icon: 'FileText',
    order_index: 0,
    is_active: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: section } = useDocSection(sectionId || '');
  const createSection = useCreateDocSection();
  const updateSection = useUpdateDocSection();
  const deleteSection = useDeleteDocSection();

  const isEditing = !!sectionId;

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        display_name: section.display_name,
        description: section.description || '',
        icon: section.icon || 'FileText',
        order_index: section.order_index,
        is_active: section.is_active,
      });
    }
  }, [section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && sectionId) {
        await updateSection.mutateAsync({
          id: sectionId,
          updates: formData,
        });
      } else {
        await createSection.mutateAsync(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save section:', error);
    }
  };

  const handleDelete = async () => {
    if (!sectionId) return;

    try {
      await deleteSection.mutateAsync(sectionId);
      setShowDeleteConfirm(false);
      onSave();
    } catch (error) {
      console.error('Failed to delete section:', error);
    }
  };

  const generateSlug = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      display_name: value,
      name: !isEditing ? generateSlug(value) : prev.name, // Only auto-generate for new sections
    }));
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isEditing ? 'Edit Section' : 'Create New Section'}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleteSection.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="e.g., Getting Started"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">URL Slug *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., getting-started"
                  pattern="[a-z0-9-]+"
                  title="Only lowercase letters, numbers, and hyphens allowed"
                  required
                />
                <p className="text-xs text-gray-500">
                  Used in URLs: /docs/{formData.name}/page-name
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this section"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                <p className="text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
              <p className="text-sm text-gray-500">
                Inactive sections are hidden from public view
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSection.isPending || updateSection.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isEditing ? 'Update Section' : 'Create Section'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Section"
          message="Are you sure you want to delete this section? This will also delete all pages in this section. This action cannot be undone."
          confirmText="Delete Section"
          onConfirm={handleDelete}
          onClose={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </>
  );
};