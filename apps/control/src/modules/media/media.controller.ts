import { Controller, Get, Param, Res, UseGuards, NotFoundException, Req, HttpStatus } from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { JwtGuard } from '../auth/guards/jwt.guard';
import type { Request, Response } from 'express';

@Controller('media')
export class MediaController {
    // GET /media/attendance-photos/:workerId/:fileName
    @UseGuards(JwtGuard)
    @Get('attendance-photos/:workerId/:fileName')
    async getAttendancePhoto(
        @Param('workerId') workerId: string,
        @Param('fileName') fileName: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        const uploadsRoot = process.env.PHOTO_UPLOAD_PATH || './uploads';
        const filePath = join(process.cwd(), uploadsRoot, 'attendance-photos', workerId, fileName);

        if (!existsSync(filePath)) {
            throw new NotFoundException('Image not found');
        }

        const stats = statSync(filePath);
        const fileSize = stats.size;
        const ext = extname(fileName).toLowerCase();

        // Detectar content-type automáticamente
        const mimeTypes: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // Headers optimizados para cache y streaming
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', fileSize.toString());
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 horas
        res.setHeader('ETag', `"${stats.mtime.getTime()}-${fileSize}"`);
        res.setHeader('Last-Modified', stats.mtime.toUTCString());
        res.setHeader('Accept-Ranges', 'bytes');

        // Verificar ETag para cache 304
        const clientETag = req.headers['if-none-match'];
        const serverETag = `"${stats.mtime.getTime()}-${fileSize}"`;
        if (clientETag === serverETag) {
            res.status(HttpStatus.NOT_MODIFIED).end();
            return;
        }

        // Soporte para rangos HTTP (streaming parcial)
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            if (start >= fileSize || end >= fileSize) {
                res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    .setHeader('Content-Range', `bytes */${fileSize}`)
                    .end();
                return;
            }

            res.status(HttpStatus.PARTIAL_CONTENT);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize.toString());

            const stream = createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            // Stream completo
            const stream = createReadStream(filePath);
            stream.pipe(res);
        }
    }
}
