import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/api/supabase';
import { createProgressSchema, progressFiltersSchema, type CreateProgressRequest, type ProgressFiltersRequest } from '@/lib/validations/progress';
import { withAuthAndRateLimit, withCacheAndAuth, withValidation, type AuthenticatedRequest } from '@/lib/api/middleware';

// GET - Get user progress
async function getProgressHandler(req: AuthenticatedRequest, validData: ProgressFiltersRequest) {
  try {
    const progress = await supabaseService.getUserProgress(
      req.user.id,
      validData.progress_type,
      validData.date_from,
      validData.date_to,
      validData.skill_category
    );

    // Get total count for pagination
    let countQuery = supabaseService.getClient()
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (validData.progress_type) {
      countQuery = countQuery.eq('progress_type', validData.progress_type);
    }
    if (validData.skill_category) {
      countQuery = countQuery.eq('skill_category', validData.skill_category);
    }
    if (validData.date_from) {
      countQuery = countQuery.gte('progress_date', validData.date_from);
    }
    if (validData.date_to) {
      countQuery = countQuery.lte('progress_date', validData.date_to);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / validData.limit);

    return NextResponse.json({
      data: progress,
      meta: {
        total: totalCount,
        page: Math.floor(validData.offset / validData.limit) + 1,
        limit: validData.limit,
        pages: totalPages,
        has_more: validData.offset + validData.limit < totalCount,
      },
      message: 'Progress retrieved successfully'
    });

  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create progress entry
async function createProgressHandler(req: AuthenticatedRequest, validData: CreateProgressRequest) {
  try {
    const progressData = {
      ...validData,
      user_id: req.user.id,
      progress_date: validData.progress_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const progress = await supabaseService.upsertUserProgress(progressData);

    // Store progress creation in memory for coordination
    if (typeof globalThis !== 'undefined' && globalThis.process?.env?.NODE_ENV !== 'test') {
      try {
        await fetch('http://localhost:3000/hooks/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: req.user.id,
            action: 'progress_created',
            metadata: { 
              progress_type: progress.progress_type,
              points_earned: progress.points_earned,
              timestamp: new Date().toISOString() 
            }
          }),
        });
      } catch (hookError) {
        // console.log('Hook coordination unavailable:', hookError);
      }
    }

    return NextResponse.json({
      data: progress,
      message: 'Progress recorded successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create progress error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withCacheAndAuth(
  'progress',
  (req) => {
    const url = new URL(req.url);
    const params = Array.from(url.searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `progress:${(req as AuthenticatedRequest).user.id}:${params}`;
  }
)(withValidation(progressFiltersSchema, getProgressHandler));

export const POST = withAuthAndRateLimit('api')(
  withValidation(createProgressSchema, createProgressHandler)
);