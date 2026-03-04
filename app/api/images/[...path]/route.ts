import { readFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params
        const imagePath = pathSegments.join('/')
        const baseDir = path.resolve(process.cwd(), 'frontend', 'images')
        const filePath = path.resolve(baseDir, imagePath)

        // Prevent path traversal attacks
        if (!filePath.startsWith(baseDir)) {
            return new NextResponse('Forbidden', { status: 403 })
        }

        const fileBuffer = await readFile(filePath)

        // Determine content type based on file extension
        const ext = path.extname(imagePath).toLowerCase()
        let contentType = 'image/jpeg' // default

        switch (ext) {
            case '.png':
                contentType = 'image/png'
                break
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg'
                break
            case '.gif':
                contentType = 'image/gif'
                break
            case '.svg':
                contentType = 'image/svg+xml'
                break
        }

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (error) {
        return new NextResponse('Image not found', { status: 404 })
    }
}
