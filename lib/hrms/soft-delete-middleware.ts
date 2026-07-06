import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Soft delete middleware
 * Wraps DELETE operations to use soft deletes (set archived_at timestamp)
 * instead of hard deletes for audit trail and recovery
 */
export type SoftDeleteOptions = {
  table: string;
  idField?: string;
  archivedByField?: string;
};

export function softDeleteMiddleware(options: SoftDeleteOptions) {
  const { table, idField = 'id', archivedByField = 'archived_by' } = options;

  return (handler: (req: Request, context: any) => Promise<Response>) => {
    return async (req: Request, context: any) => {
      if (req.method !== 'DELETE') {
        return handler(req, context);
      }

      try {
        const url = new URL(req.url);
        const id = context.params?.[idField] || url.pathname.split('/').pop();

        if (!id) {
          return NextResponse.json({ error: `${idField} required` }, { status: 400 });
        }

        // Get current user ID from auth (you'll need to pass this through context)
        const userId = context.auth?.userId || 'system';

        // Perform soft delete instead of hard delete
        const { data, error } = await supabaseAdmin
          .from(table)
          .update({
            archived_at: new Date().toISOString(),
            [archivedByField]: userId,
          })
          .eq(idField, id)
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
      } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    };
  };
}

/**
 * Filter active records (exclude soft-deleted)
 * Add to all SELECT queries
 */
export function filterActiveSoftDelete(query: any) {
  return query.eq('archived_at', null);
}

/**
 * Restore soft-deleted record
 */
export async function restoreSoftDeletedRecord(table: string, id: string, idField: string = 'id') {
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update({
        archived_at: null,
        archived_by: null,
      })
      .eq(idField, id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Permanently delete soft-deleted records older than retention period
 * Run this as scheduled cleanup job
 */
export async function permanentlyDeleteArchivedRecords(
  table: string,
  retentionDaysUnitTest: number = 90
) {
  try {
    const cutoffDate = new Date(new Date().getTime() - retentionDaysUnitTest * 24 * 60 * 60 * 1000);

    const { data, error: deleteError } = await supabaseAdmin
      .from(table)
      .delete()
      .lt('archived_at', cutoffDate.toISOString())
      .select();

    if (deleteError) throw deleteError;

    return {
      success: true,
      deleted_count: data?.length || 0,
      older_than: cutoffDate.toISOString(),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
