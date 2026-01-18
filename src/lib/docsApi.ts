import { supabase } from './supabase';
import { auditService } from './auditService';

// Helper to get current user info
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export interface DocSection {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface DocPage {
  id: string;
  section_id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  order_index: number;
  is_published: boolean;
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  section?: DocSection;
}

export interface CreateDocSectionData {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  order_index: number;
}

export interface UpdateDocSectionData extends Partial<CreateDocSectionData> {
  is_active?: boolean;
}

export interface CreateDocPageData {
  section_id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  order_index: number;
  meta_title?: string;
  meta_description?: string;
}

export interface UpdateDocPageData extends Partial<CreateDocPageData> {
  is_published?: boolean;
}

// Doc Sections API
export const docsApi = {
  // Sections
  async getSections(): Promise<DocSection[]> {
    const { data, error } = await supabase
      .from('doc_sections')
      .select('*')
      .order('order_index');

    if (error) throw error;
    return data || [];
  },

  async getSection(id: string): Promise<DocSection | null> {
    const { data, error } = await supabase
      .from('doc_sections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createSection(sectionData: CreateDocSectionData): Promise<DocSection> {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase
      .from('doc_sections')
      .insert({
        ...sectionData,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    // Audit log
    if (user) {
      await auditService.createLog({
        action_type: 'doc_section_created',
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_section',
        target_id: data.id,
        reason: `Created documentation section: ${sectionData.display_name}`,
        after_state: data as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
    
    return data;
  },

  async updateSection(id: string, updates: UpdateDocSectionData): Promise<DocSection> {
    const user = await getCurrentUser();
    
    // Get before state
    const beforeState = await this.getSection(id);
    
    const { data, error } = await supabase
      .from('doc_sections')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Audit log
    if (user && beforeState) {
      const changes = Object.keys(updates).map(key => key).join(', ');
      await auditService.createLog({
        action_type: updates.order_index !== undefined && Object.keys(updates).length === 1 
          ? 'doc_section_reordered' 
          : 'doc_section_updated',
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_section',
        target_id: id,
        reason: updates.order_index !== undefined && Object.keys(updates).length === 1
          ? `Reordered documentation section: ${beforeState.display_name}`
          : `Updated documentation section: ${beforeState.display_name} (${changes})`,
        before_state: beforeState as unknown as Record<string, unknown>,
        after_state: data as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
    
    return data;
  },

  async deleteSection(id: string): Promise<void> {
    const user = await getCurrentUser();
    
    // Get before state
    const beforeState = await this.getSection(id);
    
    const { error } = await supabase
      .from('doc_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Audit log
    if (user && beforeState) {
      await auditService.createLog({
        action_type: 'doc_section_deleted',
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_section',
        target_id: id,
        reason: `Deleted documentation section: ${beforeState.display_name}`,
        before_state: beforeState as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
  },

  async reorderSections(sectionIds: string[]): Promise<void> {
    const updates = sectionIds.map((id, index) => ({
      id,
      order_index: index,
      updated_by: null, // Will be set by trigger
    }));

    const { error } = await supabase
      .from('doc_sections')
      .upsert(updates);

    if (error) throw error;
  },

  // Pages
  async getPages(sectionId?: string): Promise<DocPage[]> {
    let query = supabase
      .from('doc_pages')
      .select(`
        *,
        section:doc_sections(*)
      `)
      .order('order_index');

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  async getPage(id: string): Promise<DocPage | null> {
    const { data, error } = await supabase
      .from('doc_pages')
      .select(`
        *,
        section:doc_sections(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async getPageBySlug(sectionName: string, slug: string): Promise<DocPage | null> {
    const { data, error } = await supabase
      .from('doc_pages')
      .select(`
        *,
        section:doc_sections(*)
      `)
      .eq('slug', slug)
      .eq('section.name', sectionName)
      .single();

    if (error) throw error;
    return data;
  },

  async createPage(pageData: CreateDocPageData): Promise<DocPage> {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase
      .from('doc_pages')
      .insert({
        ...pageData,
        created_by: user?.id,
        updated_by: user?.id,
      })
      .select(`
        *,
        section:doc_sections(*)
      `)
      .single();

    if (error) throw error;
    
    // Audit log
    if (user) {
      await auditService.createLog({
        action_type: 'doc_page_created',
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_page',
        target_id: data.id,
        reason: `Created documentation page: ${pageData.title}`,
        after_state: data as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
    
    return data;
  },

  async updatePage(id: string, updates: UpdateDocPageData): Promise<DocPage> {
    const user = await getCurrentUser();
    
    // Get before state
    const beforeState = await this.getPage(id);
    
    const { data, error } = await supabase
      .from('doc_pages')
      .update({
        ...updates,
        updated_by: user?.id,
      })
      .eq('id', id)
      .select(`
        *,
        section:doc_sections(*)
      `)
      .single();

    if (error) throw error;
    
    // Audit log
    if (user && beforeState) {
      let actionType: 'doc_page_updated' | 'doc_page_published' | 'doc_page_unpublished' | 'doc_page_reordered' = 'doc_page_updated';
      let reason = '';
      
      if (updates.is_published !== undefined && updates.is_published !== beforeState.is_published) {
        actionType = updates.is_published ? 'doc_page_published' : 'doc_page_unpublished';
        reason = `${updates.is_published ? 'Published' : 'Unpublished'} documentation page: ${beforeState.title}`;
      } else if (updates.order_index !== undefined && Object.keys(updates).length === 1) {
        actionType = 'doc_page_reordered';
        reason = `Reordered documentation page: ${beforeState.title}`;
      } else {
        const changes = Object.keys(updates).map(key => key).join(', ');
        reason = `Updated documentation page: ${beforeState.title} (${changes})`;
      }
      
      await auditService.createLog({
        action_type: actionType,
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_page',
        target_id: id,
        reason,
        before_state: beforeState as unknown as Record<string, unknown>,
        after_state: data as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
    
    return data;
  },

  async deletePage(id: string): Promise<void> {
    const user = await getCurrentUser();
    
    // Get before state
    const beforeState = await this.getPage(id);
    
    const { error } = await supabase
      .from('doc_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Audit log
    if (user && beforeState) {
      await auditService.createLog({
        action_type: 'doc_page_deleted',
        admin_id: user.id,
        admin_email: user.email || '',
        target_type: 'doc_page',
        target_id: id,
        reason: `Deleted documentation page: ${beforeState.title}`,
        before_state: beforeState as unknown as Record<string, unknown>,
      }).catch(err => console.error('Failed to create audit log:', err));
    }
  },

  async reorderPages(sectionId: string, pageIds: string[]): Promise<void> {
    const updates = pageIds.map((id, index) => ({
      id,
      order_index: index,
      updated_by: null, // Will be set by trigger
    }));

    const { error } = await supabase
      .from('doc_pages')
      .upsert(updates);

    if (error) throw error;
  },

  // Public API functions
  async getPublicDocsStructure(): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_docs_structure');

    if (error) throw error;
    return data;
  },

  async getPublicDocPage(sectionName: string, pageSlug: string): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_doc_page', {
        section_name_param: sectionName,
        page_slug_param: pageSlug
      });

    if (error) throw error;
    return data;
  },

  // Search functionality
  async searchDocs(query: string): Promise<DocPage[]> {
    const { data, error } = await supabase
      .from('doc_pages')
      .select(`
        *,
        section:doc_sections(*)
      `)
      .textSearch('title,description,content', query)
      .eq('is_published', true)
      .limit(20);

    if (error) throw error;
    return data || [];
  }
};