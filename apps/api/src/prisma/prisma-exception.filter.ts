import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Prisma hatalarını HTTP cevabına çevirir; şema/DB uyumsuzluğunda anlaşılır mesaj verir
 * (aksi halde Nest varsayılanı "Internal server error" olur).
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientInitializationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { code, message, meta } = exception;
      this.log.warn(`Prisma ${code}: ${message} meta=${JSON.stringify(meta)}`);

      if (code === 'P2022' || code === 'P2021') {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'Veritabanı şeması API ile uyumlu değil. Geliştirmede `npm run db:migrate` veya üretimde `npm run db:migrate:deploy` çalıştırın.',
          code,
        });
      }
      if (code === 'P2025') {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Kayıt bulunamadı.',
          code,
        });
      }
      if (code === 'P2002') {
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message: 'Bu kayıt zaten var (benzersiz alan çakışması).',
          code,
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Veritabanı isteği reddedildi (${code}).`,
        code,
      });
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.log.warn(exception.message);
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Geçersiz veritabanı sorgusu.',
      });
    }

    const msg =
      exception instanceof Error
        ? exception.message
        : typeof exception === 'string'
          ? exception
          : 'Bilinmeyen Prisma hatası';
    this.log.error(msg, exception instanceof Error ? exception.stack : undefined);

    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Veritabanına bağlanılamadı veya yapılandırma hatası. Ortam değişkenlerini ve migrasyonları kontrol edin.',
    });
  }
}
