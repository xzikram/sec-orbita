import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Strictly sanitize and validate path segments
    const safeSegments: string[] = [];
    for (const segment of pathSegments) {
      // Decode URI components if encoded
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        return new NextResponse('Invalid path encoding', { status: 400 });
      }

      if (decoded === '..' || decoded === '.' || decoded.includes('/') || decoded.includes('\\')) {
        return new NextResponse('Access denied: directory traversal detected', { status: 403 });
      }

      // Allow only alphanumeric, dash, underscore, and dot
      const cleaned = decoded.replace(/[^a-zA-Z0-9_\-\.]/g, '');
      if (!cleaned || cleaned === '.' || cleaned === '..') {
        return new NextResponse('Invalid file path', { status: 400 });
      }
      safeSegments.push(cleaned);
    }

    const ext = path.extname(safeSegments[safeSegments.length - 1] || '').toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    if (!mimeTypes[ext]) {
      return new NextResponse('Forbidden: invalid file type', { status: 403 });
    }

    // Check multiple candidate locations without triggering Turbopack NFT whole-project tracing
    const baseDir = process.env.APP_DIR || (process as any)['cwd']();
    const allowedRoots = [
      path.resolve(baseDir, 'public', 'uploads'),
      path.resolve(baseDir, 'uploads'),
      path.resolve('/var/www/sec-orbita', 'public', 'uploads'),
      path.resolve('/var/www/sec-orbita', 'uploads'),
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath = '';

    for (const root of allowedRoots) {
      const candidate = path.resolve(root, ...safeSegments);
      // Double check that the candidate path strictly stays within the allowed root directory
      if (!candidate.startsWith(root + path.sep) && candidate !== root) {
        continue;
      }

      try {
        fileBuffer = await fs.readFile(candidate);
        foundPath = candidate;
        break;
      } catch {
        // Continue to next candidate
      }
    }

    if (!fileBuffer) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[ext] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error serving upload:', error);
    return new NextResponse('Error loading photo', { status: 500 });
  }
}
