import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierDocumentFieldKind,
  CourierDocumentReviewStatus,
  CourierOnboardingStatus,
  CourierType,
  UserStatus,
} from '@prisma/client';
import { LocalStorageAdapter } from '../../providers/storage/local-storage.adapter';
import { PrismaService } from '../../prisma/prisma.service';
import type { CourierJwtUser } from '../auth/strategies/courier-jwt.strategy';
import { buildCourierAccountState } from './courier-account.util';
import {
  canCourierEditSubmission,
  submissionHasContent,
  summarizeDocumentReview,
} from './courier-document-review.util';

const DOC_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const MAX_DOC_BYTES = 8 * 1024 * 1024;

type MultipartFile = { buffer: Buffer; mimetype: string; size: number };

@Injectable()
export class CourierOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageAdapter,
  ) {}

  private async loadCourier(userId: string) {
    const row = await this.prisma.courierProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { status: true } },
      },
    });
    if (!row) throw new NotFoundException('Kurye profili bulunamadı');
    return row;
  }

  private async activeRequirements(courierType: CourierType) {
    return this.prisma.courierDocumentRequirement.findMany({
      where: { courierType, active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async assertCanDeliver(userId: string) {
    const courier = await this.loadCourier(userId);
    const state = buildCourierAccountState(courier.user, courier);
    if (state.canAccessDeliveries) return;
    if (state.pendingReview) {
      throw new ForbiddenException('Hesabınız onay bekliyor; evraklar incelenene kadar teslimat alamazsınız');
    }
    if (state.needsDocuments) {
      throw new ForbiddenException(
        'Evraklarınızda düzeltme gerekiyor. Uygulamadan ilgili alanları güncelleyip tekrar gönderin',
      );
    }
    throw new ForbiddenException('Teslimat alabilmek için önce evraklarınızı yükleyip onaya gönderin');
  }

  private assertCanEditProfile(onboardingStatus: CourierOnboardingStatus) {
    if (onboardingStatus === CourierOnboardingStatus.PENDING_REVIEW) {
      throw new ConflictException('Başvurunuz inceleniyor; bu aşamada değişiklik yapılamaz');
    }
    if (onboardingStatus === CourierOnboardingStatus.APPROVED) {
      throw new ConflictException('Onaylı hesapta evrak güncellemesi gerekmez');
    }
  }

  private async assertCanEditRequirement(
    courierId: string,
    onboardingStatus: CourierOnboardingStatus,
    requirementId: string,
  ) {
    this.assertCanEditProfile(onboardingStatus);
    const sub = await this.prisma.courierDocumentSubmission.findUnique({
      where: {
        courierProfileId_requirementId: { courierProfileId: courierId, requirementId },
      },
    });
    if (!canCourierEditSubmission(onboardingStatus, sub ?? undefined)) {
      throw new ConflictException('Bu alan onaylandığı için değiştirilemez; yalnızca reddedilen alanları güncelleyin');
    }
  }

  private async resetSubmissionReview(submissionId: string) {
    await this.prisma.courierDocumentSubmission.update({
      where: { id: submissionId },
      data: {
        reviewStatus: CourierDocumentReviewStatus.PENDING,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });
  }

  async getState(userId: string, publicOrigin: string) {
    const courier = await this.loadCourier(userId);
    const requirements = await this.activeRequirements(courier.type);
    const submissions = await this.prisma.courierDocumentSubmission.findMany({
      where: { courierProfileId: courier.id },
    });
    const subByReq = new Map(submissions.map((s) => [s.requirementId, s]));
    const origin = publicOrigin.replace(/\/$/, '');
    const documentsReview = summarizeDocumentReview(requirements, submissions);

    return {
      account: buildCourierAccountState(courier.user, courier),
      courierType: courier.type,
      documentsReview,
      requirements: requirements.map((r) => {
        const sub = subByReq.get(r.id);
        const fileUrl = sub?.fileUrl
          ? sub.fileUrl.startsWith('http')
            ? sub.fileUrl
            : `${origin}${sub.fileUrl}`
          : null;
        return {
          id: r.id,
          kind: r.kind,
          label: r.label,
          hint: r.hint,
          required: r.required,
          reviewStatus: sub?.reviewStatus ?? CourierDocumentReviewStatus.PENDING,
          rejectionReason: sub?.rejectionReason ?? null,
          canEdit: canCourierEditSubmission(courier.onboardingStatus, sub),
          textValue: sub?.textValue ?? null,
          fileUrl,
          uploadedAt: sub?.uploadedAt.toISOString() ?? null,
        };
      }),
    };
  }

  async saveText(userId: string, requirementId: string, textValue: string) {
    const courier = await this.loadCourier(userId);
    await this.assertCanEditRequirement(courier.id, courier.onboardingStatus, requirementId);

    const req = await this.prisma.courierDocumentRequirement.findFirst({
      where: { id: requirementId, courierType: courier.type, active: true },
    });
    if (!req) throw new NotFoundException('Belge alanı bulunamadı');
    if (req.kind !== CourierDocumentFieldKind.TEXT) {
      throw new BadRequestException('Bu alan metin değil, dosya yükleyin');
    }
    const value = textValue.trim();
    if (req.required && !value) {
      throw new BadRequestException(`${req.label} zorunludur`);
    }

    const existing = await this.prisma.courierDocumentSubmission.findUnique({
      where: {
        courierProfileId_requirementId: {
          courierProfileId: courier.id,
          requirementId: req.id,
        },
      },
    });

    if (existing) {
      await this.prisma.courierDocumentSubmission.update({
        where: { id: existing.id },
        data: { textValue: value || null },
      });
      if (existing.reviewStatus === CourierDocumentReviewStatus.REJECTED) {
        await this.resetSubmissionReview(existing.id);
      }
    } else {
      await this.prisma.courierDocumentSubmission.create({
        data: {
          courierProfileId: courier.id,
          requirementId: req.id,
          textValue: value || null,
          reviewStatus: CourierDocumentReviewStatus.PENDING,
        },
      });
    }

    if (courier.onboardingStatus === CourierOnboardingStatus.REJECTED) {
      await this.prisma.courierProfile.update({
        where: { id: courier.id },
        data: {
          onboardingStatus: CourierOnboardingStatus.DOCUMENTS_REQUIRED,
          rejectionReason: null,
        },
      });
    }

    return { ok: true as const };
  }

  async uploadFile(
    userId: string,
    requirementId: string,
    file: MultipartFile,
    publicOrigin: string,
  ) {
    const courier = await this.loadCourier(userId);
    await this.assertCanEditRequirement(courier.id, courier.onboardingStatus, requirementId);

    if (!file?.buffer?.length) throw new BadRequestException('Dosya gerekli');
    if (file.size > MAX_DOC_BYTES) {
      throw new BadRequestException('Dosya en fazla 8 MB olabilir');
    }

    const req = await this.prisma.courierDocumentRequirement.findFirst({
      where: { id: requirementId, courierType: courier.type, active: true },
    });
    if (!req) throw new NotFoundException('Belge alanı bulunamadı');
    if (req.kind !== CourierDocumentFieldKind.FILE) {
      throw new BadRequestException('Bu alan dosya değil, metin girin');
    }

    const ext = DOC_MIMES[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Yalnızca PDF veya görsel (PNG, JPEG, WebP) yükleyebilirsiniz');
    }

    const key = `courier-onboarding/${courier.id}/${requirementId}-${randomUUID()}${ext}`;
    const stored = await this.storage.putObject(key, file.buffer, {
      mime: file.mimetype,
      acl: 'public-read',
    });
    const origin = publicOrigin.replace(/\/$/, '');
    const publicUrl = `${origin}${stored.url}`;

    const existing = await this.prisma.courierDocumentSubmission.findUnique({
      where: {
        courierProfileId_requirementId: {
          courierProfileId: courier.id,
          requirementId: req.id,
        },
      },
    });
    if (existing?.fileStorageKey) {
      await this.storage.deleteObject(existing.fileStorageKey).catch(() => undefined);
    }

    if (existing) {
      await this.prisma.courierDocumentSubmission.update({
        where: { id: existing.id },
        data: {
          fileUrl: publicUrl,
          fileStorageKey: key,
        },
      });
      if (existing.reviewStatus === CourierDocumentReviewStatus.REJECTED) {
        await this.resetSubmissionReview(existing.id);
      }
    } else {
      await this.prisma.courierDocumentSubmission.create({
        data: {
          courierProfileId: courier.id,
          requirementId: req.id,
          fileUrl: publicUrl,
          fileStorageKey: key,
          reviewStatus: CourierDocumentReviewStatus.PENDING,
        },
      });
    }

    if (courier.onboardingStatus === CourierOnboardingStatus.REJECTED) {
      await this.prisma.courierProfile.update({
        where: { id: courier.id },
        data: {
          onboardingStatus: CourierOnboardingStatus.DOCUMENTS_REQUIRED,
          rejectionReason: null,
        },
      });
    }

    return { ok: true as const, fileUrl: publicUrl };
  }

  async submitForReview(userId: string) {
    const courier = await this.loadCourier(userId);
    this.assertCanEditProfile(courier.onboardingStatus);

    const requirements = await this.activeRequirements(courier.type);
    const required = requirements.filter((r) => r.required);
    const submissions = await this.prisma.courierDocumentSubmission.findMany({
      where: { courierProfileId: courier.id },
    });
    const subByReq = new Map(submissions.map((s) => [s.requirementId, s]));

    for (const req of required) {
      const sub = subByReq.get(req.id);
      if (!submissionHasContent(req, sub)) {
        throw new BadRequestException(`Eksik: ${req.label}`);
      }
      if (sub?.reviewStatus === CourierDocumentReviewStatus.REJECTED) {
        throw new BadRequestException(`Düzeltilmesi gereken alan: ${req.label}`);
      }
    }

    const summary = summarizeDocumentReview(requirements, submissions);
    if (summary.hasRejected) {
      throw new BadRequestException('Reddedilen alanları güncelleyip tekrar deneyin');
    }

    await this.prisma.$transaction([
      this.prisma.courierProfile.update({
        where: { id: courier.id },
        data: {
          onboardingStatus: CourierOnboardingStatus.PENDING_REVIEW,
          submittedForReviewAt: new Date(),
          rejectionReason: null,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.PENDING_APPROVAL },
      }),
      this.prisma.courierDocumentSubmission.updateMany({
        where: {
          courierProfileId: courier.id,
          reviewStatus: CourierDocumentReviewStatus.PENDING,
        },
        data: {
          reviewedAt: null,
          reviewedByUserId: null,
          rejectionReason: null,
        },
      }),
    ]);

    return { ok: true as const };
  }
}
