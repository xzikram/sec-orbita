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

    // Sanitize path segments to prevent directory traversal
    const safeSegments = pathSegments.map((segment) =>
      segment.replace(/(\.\.[\/\\])+/g, '').replace(/[^a-zA-Z0-9_\-\.]/g, '')
    );

    // Check multiple candidate locations
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'uploads', ...safeSegments),
      path.join(process.cwd(), 'uploads', ...safeSegments),
      path.join('/var/www/sec-orbita', 'public', 'uploads', ...safeSegments),
      path.join('/var/www/sec-orbita', 'uploads', ...safeSegments),
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath = '';

    for (const candidate of candidatePaths) {
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

    const ext = path.extname(foundPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[ext] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving upload:', error);
    return new NextResponse('Error loading photo', { status: 500 });
  }
}
