import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { docsApi, DocSection, DocPage, CreateDocSectionData, UpdateDocSectionData, CreateDocPageData, UpdateDocPageData } from '../lib/docsApi';
import { toast } from 'react-hot-toast';

// Sections hooks
export function useDocSections() {
  return useQuery({
    queryKey: ['doc-sections'],
    queryFn: docsApi.getSections,
  });
}

export function useDocSection(id: string) {
  return useQuery({
    queryKey: ['doc-section', id],
    queryFn: () => docsApi.getSection(id),
    enabled: !!id,
  });
}

export function useCreateDocSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocSectionData) => docsApi.createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-sections'] });
      toast.success('Section created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create section');
    },
  });
}

export function useUpdateDocSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocSectionData }) =>
      docsApi.updateSection(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doc-sections'] });
      queryClient.invalidateQueries({ queryKey: ['doc-section', data.id] });
      toast.success('Section updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update section');
    },
  });
}

export function useDeleteDocSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => docsApi.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-sections'] });
      toast.success('Section deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete section');
    },
  });
}

export function useReorderDocSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sectionIds: string[]) => docsApi.reorderSections(sectionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-sections'] });
      toast.success('Sections reordered successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reorder sections');
    },
  });
}

// Pages hooks
export function useDocPages(sectionId?: string) {
  return useQuery({
    queryKey: ['doc-pages', sectionId],
    queryFn: () => docsApi.getPages(sectionId),
  });
}

export function useDocPage(id: string) {
  return useQuery({
    queryKey: ['doc-page', id],
    queryFn: () => docsApi.getPage(id),
    enabled: !!id,
  });
}

export function useCreateDocPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocPageData) => docsApi.createPage(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doc-pages'] });
      queryClient.invalidateQueries({ queryKey: ['doc-pages', data.section_id] });
      toast.success('Page created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create page');
    },
  });
}

export function useUpdateDocPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateDocPageData }) =>
      docsApi.updatePage(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doc-pages'] });
      queryClient.invalidateQueries({ queryKey: ['doc-pages', data.section_id] });
      queryClient.invalidateQueries({ queryKey: ['doc-page', data.id] });
      toast.success('Page updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update page');
    },
  });
}

export function useDeleteDocPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => docsApi.deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-pages'] });
      toast.success('Page deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete page');
    },
  });
}

export function useReorderDocPages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sectionId, pageIds }: { sectionId: string; pageIds: string[] }) =>
      docsApi.reorderPages(sectionId, pageIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doc-pages'] });
      toast.success('Pages reordered successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reorder pages');
    },
  });
}

// Search hook
export function useSearchDocs(query: string) {
  return useQuery({
    queryKey: ['search-docs', query],
    queryFn: () => docsApi.searchDocs(query),
    enabled: query.length > 2,
  });
}

// Public docs hooks
export function usePublicDocsStructure() {
  return useQuery({
    queryKey: ['public-docs-structure'],
    queryFn: docsApi.getPublicDocsStructure,
  });
}

export function usePublicDocPage(sectionName: string, pageSlug: string) {
  return useQuery({
    queryKey: ['public-doc-page', sectionName, pageSlug],
    queryFn: () => docsApi.getPublicDocPage(sectionName, pageSlug),
    enabled: !!(sectionName && pageSlug),
  });
}