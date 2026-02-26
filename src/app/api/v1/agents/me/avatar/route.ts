import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  handleOptions,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/api-utils';

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function OPTIONS() {
  return handleOptions();
}

// POST /api/v1/agents/me/avatar - Upload avatar
export async function POST(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const rl = checkRateLimit(`agent:${auth.agent.id}`, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return errorResponse('No file provided', 400, 'Include a file in the form data');
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return errorResponse('Invalid file type', 400, 'Allowed types: JPEG, PNG, GIF, WebP');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('File too large', 400, `Maximum size: ${MAX_FILE_SIZE / 1024}KB`);
      }

      const supabase = getSupabaseAdmin();

      // Delete old avatar if exists
      if (auth.agent.avatar_url) {
        const oldPath = auth.agent.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`agents/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${auth.agent.id}.${fileExt}`;
      const filePath = `agents/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return errorResponse('Failed to upload avatar', 500);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update agent
      const { error: updateError } = await supabase
        .from('user_claim_tokens')
        .update({ avatar_url: avatarUrl })
        .eq('id', auth.agent.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return errorResponse('Failed to update avatar URL', 500);
      }

      // Log the upload
      await supabase.from('audit_logs').insert({
        agent_id: auth.agent.id,
        action: 'agent.upload_avatar',
        details: { file_size: file.size, file_type: file.type },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: request.headers.get('user-agent'),
      });

      return successResponse({
        avatar_url: avatarUrl,
        message: 'Avatar uploaded successfully',
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      return errorResponse('Internal server error', 500);
    }
  });
}

// DELETE /api/v1/agents/me/avatar - Remove avatar
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (auth) => {
    const rl = checkRateLimit(`agent:${auth.agent.id}`, 100, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt, rl.remaining);

    try {
      if (!auth.agent.avatar_url) {
        return errorResponse('No avatar to delete', 404);
      }

      const supabase = getSupabaseAdmin();

      // Extract file path from URL
      const urlParts = auth.agent.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `agents/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage.from('avatars').remove([filePath]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        // Continue anyway - file might not exist
      }

      // Update agent
      const { error: updateError } = await supabase
        .from('user_claim_tokens')
        .update({ avatar_url: null })
        .eq('id', auth.agent.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return errorResponse('Failed to remove avatar', 500);
      }

      // Log the deletion
      await supabase.from('audit_logs').insert({
        agent_id: auth.agent.id,
        action: 'agent.delete_avatar',
        details: {},
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
        user_agent: request.headers.get('user-agent'),
      });

      return successResponse({
        message: 'Avatar removed successfully',
      });
    } catch (error) {
      console.error('Avatar delete error:', error);
      return errorResponse('Internal server error', 500);
    }
  });
}
