import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CourierDocumentReviewStatus,
  CourierOnboardingStatus,
  CourierType,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { latestCourierConsentsByType } from '../auth/courier-consent.util';
import { formatTurkishPlateDisplay } from '../../common/turkish-plate';
import { PrismaService } from '../../prisma/prisma.service';
import {
  activeRequiredRequirements,
  submissionHasContent,
  summarizeDocumentReview,
} from './courier-document-review.util';
import { buildCourierAccountState } from './courier-account.util';
import type { ListCourierApplicationsDto } from './dto/list-courier-applications.dto';
import type { PatchCourierDocumentRequirementDto } from './dto/upsert-courier-document-requirement.dto';
import type { UpsertCourierDocumentRequirementDto } from './dto/upsert-courier-document-requirement.dto';

function personName(first?: string | null, last?: string | null) {
  return [first, last]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .join(' ')
    .trim();
}

@Injectable()
export class StaffCourierOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  listRequirements(courierType: CourierType) {
    return this.prisma.courierDocumentRequirement.findMany({
      where: { courierType },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createRequirement(dto: UpsertCourierDocumentRequirementDto) {
    return this.prisma.courierDocumentRequirement.create({
      data: {
        courierType: dto.courierType,
        kind: dto.kind,
        label: dto.label,
        hint: dto.hint?.trim() || null,
        required: dto.required ?? true,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async patchRequirement(id: string, dto: PatchCourierDocumentRequirementDto) {
    const existing = await this.prisma.courierDocumentRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Belge alanı bulunamadı');

    return this.prisma.courierDocumentRequirement.update({
      where: { id },
      data: {
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.hint !== undefined ? { hint: dto.hint?.trim() || null } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteRequirement(id: string) {
    const existing = await this.prisma.courierDocumentRequirement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Belge alanı bulunamadı');
    await this.prisma.courierDocumentRequirement.delete({ where: { id } });
    return { ok: true as const };
  }

  async listApplications(query: ListCourierApplicationsDto) {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;
    const q = query.q?.trim();

    const where: Prisma.CourierProfileWhereInput = {
      ...(query.status ? { onboardingStatus: query.status } : {}),
      ...(q
        ? {
            OR: [
              { publicId: { contains: q, mode: 'insensitive' } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { user: { phone: { contains: q } } },
              { user: { firstName: { contains: q, mode: 'insensitive' } } },
              { user: { lastName: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.courierProfile.findMany({
        where,
        skip,
        take,
        orderBy: [{ submittedForReviewAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              status: true,
              tcKimlikNo: true,
            },
          },
        },
      }),
      this.prisma.courierProfile.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        publicId: c.publicId,
        type: c.type,
        vehicleType: c.vehicleType,
        plate: c.plate ? formatTurkishPlateDisplay(c.plate) : null,
        displayName: personName(c.user.firstName, c.user.lastName) || c.publicId,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        email: c.user.email,
        phone: c.user.phone,
        tcKimlikNo: c.user.tcKimlikNo,
        userStatus: c.user.status,
        onboardingStatus: c.onboardingStatus,
        submittedForReviewAt: c.submittedForReviewAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      skip,
      take,
    };
  }

  async getApplication(publicId: string, publicOrigin: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { publicId: publicId.trim() },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            status: true,
            tcKimlikNo: true,
            birthDate: true,
            phoneVerifiedAt: true,
            createdAt: true,
          },
        },
        documentSubmissions: {
          include: { requirement: true },
        },
        consents: {
          orderBy: { recordedAt: 'desc' },
          select: { type: true, granted: true, recordedAt: true, source: true },
        },
        reviewedBy: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!courier) throw new NotFoundException('Kurye bulunamadı');

    const consents = latestCourierConsentsByType(courier.consents);

    const requirements = await this.prisma.courierDocumentRequirement.findMany({
      where: { courierType: courier.type },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const subByReq = new Map(courier.documentSubmissions.map((s) => [s.requirementId, s]));
    const origin = publicOrigin.replace(/\/$/, '');

    return {
      publicId: courier.publicId,
      displayName: personName(courier.user.firstName, courier.user.lastName) || courier.publicId,
      user: {
        firstName: courier.user.firstName,
        lastName: courier.user.lastName,
        email: courier.user.email,
        phone: courier.user.phone,
        status: courier.user.status,
        tcKimlikNo: courier.user.tcKimlikNo,
        birthDate: courier.user.birthDate?.toISOString().slice(0, 10) ?? null,
        phoneVerifiedAt: courier.user.phoneVerifiedAt?.toISOString() ?? null,
        createdAt: courier.user.createdAt.toISOString(),
      },
      profile: {
        type: courier.type,
        vehicleType: courier.vehicleType,
        plate: courier.plate ? formatTurkishPlateDisplay(courier.plate) : null,
        merchantCompanyType: courier.merchantCompanyType,
        taxNumber: courier.taxNumber,
        iban: courier.iban,
        createdAt: courier.createdAt.toISOString(),
        updatedAt: courier.updatedAt.toISOString(),
      },
      consents: {
        registrationTerms: consents.registrationTerms,
        marketingNotifications: consents.marketingNotifications,
      },
      account: buildCourierAccountState(courier.user, courier),
      submittedForReviewAt: courier.submittedForReviewAt?.toISOString() ?? null,
      reviewedAt: courier.reviewedAt?.toISOString() ?? null,
      reviewedBy: courier.reviewedBy
        ? {
            email: courier.reviewedBy.email,
            name: personName(courier.reviewedBy.firstName, courier.reviewedBy.lastName),
          }
        : null,
      documentsReview: summarizeDocumentReview(
        requirements,
        courier.documentSubmissions,
      ),
      requirements: requirements.map((r) => {
        const sub = subByReq.get(r.id);
        const fileUrl = sub?.fileUrl
          ? sub.fileUrl.startsWith('http')
            ? sub.fileUrl
            : `${origin}${sub.fileUrl}`
          : null;
        return {
          id: r.id,
          submissionId: sub?.id ?? null,
          kind: r.kind,
          label: r.label,
          hint: r.hint,
          required: r.required,
          active: r.active,
          reviewStatus: sub?.reviewStatus ?? CourierDocumentReviewStatus.PENDING,
          rejectionReason: sub?.rejectionReason ?? null,
          reviewedAt: sub?.reviewedAt?.toISOString() ?? null,
          textValue: sub?.textValue ?? null,
          fileUrl,
          uploadedAt: sub?.uploadedAt.toISOString() ?? null,
          hasContent: submissionHasContent(r, sub),
        };
      }),
    };
  }

  private async loadApplicationCourier(publicId: string) {
    const courier = await this.prisma.courierProfile.findUnique({
      where: { publicId: publicId.trim() },
      include: {
        user: { select: { id: true, status: true } },
        documentSubmissions: true,
      },
    });
    if (!courier) throw new NotFoundException('Kurye bulunamadı');
    return courier;
  }

  async approveDocument(staffUserId: string, publicId: string, requirementId: string) {
    const courier = await this.loadApplicationCourier(publicId);
    if (courier.onboardingStatus !== CourierOnboardingStatus.PENDING_REVIEW) {
      throw new BadRequestException('Evrak onayı yalnızca incelemedeki başvurularda yapılabilir');
    }

    const req = await this.prisma.courierDocumentRequirement.findFirst({
      where: { id: requirementId.trim(), courierType: courier.type, active: true },
    });
    if (!req) throw new NotFoundException('Belge alanı bulunamadı');

    const sub = courier.documentSubmissions.find((s) => s.requirementId === req.id);
    if (!submissionHasContent(req, sub)) {
      throw new BadRequestException('Onaylanacak bir yükleme veya metin bulunmuyor');
    }
    if (sub!.reviewStatus === CourierDocumentReviewStatus.APPROVED) {
      throw new BadRequestException('Bu alan zaten onaylanmış');
    }

    await this.prisma.courierDocumentSubmission.update({
      where: { id: sub!.id },
      data: {
        reviewStatus: CourierDocumentReviewStatus.APPROVED,
        rejectionReason: null,
        reviewedAt: new Date(),
        reviewedByUserId: staffUserId,
      },
    });

    return { ok: true as const };
  }

  async rejectDocument(
    staffUserId: string,
    publicId: string,
    requirementId: string,
    reason: string,
  ) {
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      throw new BadRequestException('Red nedeni en az 3 karakter olmalıdır');
    }

    const courier = await this.loadApplicationCourier(publicId);
    if (courier.onboardingStatus !== CourierOnboardingStatus.PENDING_REVIEW) {
      throw new BadRequestException('Evrak reddi yalnızca incelemedeki başvurularda yapılabilir');
    }

    const req = await this.prisma.courierDocumentRequirement.findFirst({
      where: { id: requirementId.trim(), courierType: courier.type, active: true },
    });
    if (!req) throw new NotFoundException('Belge alanı bulunamadı');

    const sub = courier.documentSubmissions.find((s) => s.requirementId === req.id);
    if (!submissionHasContent(req, sub)) {
      throw new BadRequestException('Reddedilecek bir yükleme veya metin bulunmuyor');
    }

    await this.prisma.courierDocumentSubmission.update({
      where: { id: sub!.id },
      data: {
        reviewStatus: CourierDocumentReviewStatus.REJECTED,
        rejectionReason: trimmed,
        reviewedAt: new Date(),
        reviewedByUserId: staffUserId,
      },
    });

    return { ok: true as const };
  }

  /** Reddedilen alanlar varsa kuryenin düzeltmesi için başvuruyu geri gönderir. */
  async requestRevisions(publicId: string) {
    const courier = await this.loadApplicationCourier(publicId);
    if (courier.onboardingStatus !== CourierOnboardingStatus.PENDING_REVIEW) {
      throw new BadRequestException('Yalnızca incelemedeki başvurular kuryeye geri gönderilebilir');
    }

    const requirements = await this.prisma.courierDocumentRequirement.findMany({
      where: { courierType: courier.type, active: true },
    });
    const summary = summarizeDocumentReview(requirements, courier.documentSubmissions);
    if (!summary.hasRejected) {
      throw new BadRequestException('Geri göndermek için en az bir reddedilmiş alan olmalıdır');
    }

    await this.prisma.$transaction([
      this.prisma.courierProfile.update({
        where: { id: courier.id },
        data: {
          onboardingStatus: CourierOnboardingStatus.DOCUMENTS_REQUIRED,
          rejectionReason: null,
        },
      }),
      this.prisma.user.update({
        where: { id: courier.user.id },
        data: { status: UserStatus.PENDING_APPROVAL },
      }),
    ]);

    return { ok: true as const };
  }

  async approve(staffUserId: string, publicId: string) {
    const courier = await this.loadApplicationCourier(publicId);
    if (courier.onboardingStatus !== CourierOnboardingStatus.PENDING_REVIEW) {
      throw new BadRequestException('Yalnızca incelemedeki başvurular onaylanabilir');
    }

    const requirements = await this.prisma.courierDocumentRequirement.findMany({
      where: { courierType: courier.type, active: true },
    });
    const summary = summarizeDocumentReview(requirements, courier.documentSubmissions);
    if (summary.hasRejected) {
      throw new BadRequestException(
        'Reddedilmiş alanlar varken hesap onaylanamaz; önce kuryeye düzeltme için gönderin',
      );
    }
    if (!summary.allRequiredApproved) {
      throw new BadRequestException(
        'Hesabı onaylamadan önce zorunlu tüm evrak ve metin alanlarını tek tek onaylamalısınız',
      );
    }

    await this.prisma.$transaction([
      this.prisma.courierProfile.update({
        where: { id: courier.id },
        data: {
          onboardingStatus: CourierOnboardingStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: new Date(),
          reviewedByUserId: staffUserId,
        },
      }),
      this.prisma.user.update({
        where: { id: courier.user.id },
        data: { status: UserStatus.ACTIVE },
      }),
    ]);

    return { ok: true as const };
  }
}
