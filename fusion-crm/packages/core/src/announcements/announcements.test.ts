import { describe, it, expect } from 'vitest';
import {
  resolveAudienceUserIds,
  calculateNewReceiptUserIds,
  UserAudienceProfile,
} from './audience';
import {
  calculateReadingMetrics,
  canDismissAnnouncement,
  isColombianBusinessHours,
  ReceiptRecord,
} from './receipts';
import { validateAttachment, MAX_ATTACHMENT_SIZE_BYTES } from './mime-validation';
import { ANNOUNCEMENT_TEMPLATES } from './templates';

describe('Announcements Core - Etapa 15.4', () => {
  const sampleUsers: UserAudienceProfile[] = [
    { id: 'usr-1', role: 'admin', areaKey: 'direccion', isActive: true },
    { id: 'usr-2', role: 'comercial', areaKey: 'ventas', teamKey: 'ventas_bogota', isActive: true },
    { id: 'usr-3', role: 'comercial', areaKey: 'ventas', teamKey: 'ventas_bogota', isActive: true },
    { id: 'usr-4', role: 'produccion', areaKey: 'planta', isActive: true },
    { id: 'usr-5', role: 'planta', areaKey: 'planta', isActive: true },
    { id: 'usr-6', role: 'planta', areaKey: 'planta', isActive: false }, // Inactivo
  ];

  describe('Audience Resolution', () => {
    it('returns empty array when audiences list is empty', () => {
      const res = resolveAudienceUserIds([], sampleUsers);
      expect(res).toEqual([]);
    });

    it('returns all active users when EVERYONE target is specified', () => {
      const res = resolveAudienceUserIds([{ targetType: 'EVERYONE' }], sampleUsers);
      expect(res).toHaveLength(5);
      expect(res).not.toContain('usr-6');
      expect(res).toContain('usr-1');
      expect(res).toContain('usr-5');
    });

    it('resolves audience by role with deduplication', () => {
      const res = resolveAudienceUserIds([{ targetType: 'ROLE', roleId: 'comercial' }], sampleUsers);
      expect(res).toEqual(['usr-2', 'usr-3']);
    });

    it('resolves audience by area', () => {
      const res = resolveAudienceUserIds([{ targetType: 'AREA', areaKey: 'planta' }], sampleUsers);
      expect(res).toEqual(['usr-4', 'usr-5']); // usr-6 is inactive
    });

    it('resolves audience by specific user IDs', () => {
      const res = resolveAudienceUserIds(
        [
          { targetType: 'USER', userId: 'usr-2' },
          { targetType: 'USER', userId: 'usr-4' },
          { targetType: 'USER', userId: 'usr-6' }, // inactive, should not be included
        ],
        sampleUsers
      );
      expect(res).toEqual(['usr-2', 'usr-4']);
    });

    it('combines multiple targets without duplicates', () => {
      const res = resolveAudienceUserIds(
        [
          { targetType: 'ROLE', roleId: 'comercial' }, // usr-2, usr-3
          { targetType: 'USER', userId: 'usr-2' },     // usr-2 (duplicate)
          { targetType: 'USER', userId: 'usr-1' },     // usr-1
        ],
        sampleUsers
      );
      expect(res.sort()).toEqual(['usr-1', 'usr-2', 'usr-3'].sort());
    });

    it('calculates new receipt user IDs without deleting existing ones', () => {
      const existing = ['usr-1', 'usr-2'];
      const newAudience = ['usr-1', 'usr-2', 'usr-4', 'usr-5'];
      const toAdd = calculateNewReceiptUserIds(existing, newAudience);

      expect(toAdd).toEqual(['usr-4', 'usr-5']);
    });
  });

  describe('Receipts & Metrics', () => {
    it('calculates reading and acknowledgement metrics accurately', () => {
      const receipts: ReceiptRecord[] = [
        { userId: 'usr-1', deliveredAt: new Date(), seenAt: new Date(), readAt: new Date(), acknowledgedAt: new Date() },
        { userId: 'usr-2', deliveredAt: new Date(), seenAt: new Date(), readAt: new Date(), acknowledgedAt: null },
        { userId: 'usr-3', deliveredAt: new Date(), seenAt: new Date(), readAt: null, acknowledgedAt: null },
        { userId: 'usr-4', deliveredAt: new Date(), seenAt: null, readAt: null, acknowledgedAt: null },
      ];

      const metrics = calculateReadingMetrics(receipts);
      expect(metrics.totalTarget).toBe(4);
      expect(metrics.deliveredCount).toBe(4);
      expect(metrics.seenCount).toBe(3);
      expect(metrics.readCount).toBe(2);
      expect(metrics.acknowledgedCount).toBe(1);
      expect(metrics.pendingCount).toBe(3);
      expect(metrics.readPercent).toBe(50.0);
      expect(metrics.acknowledgedPercent).toBe(25.0);
    });

    it('handles empty receipts list gracefully', () => {
      const metrics = calculateReadingMetrics([]);
      expect(metrics.totalTarget).toBe(0);
      expect(metrics.readPercent).toBe(0);
      expect(metrics.acknowledgedPercent).toBe(0);
    });

    it('enforces dismissal rule: mandatory announcements cannot be dismissed until acknowledged', () => {
      // Non-mandatory announcement can always be dismissed
      expect(canDismissAnnouncement(false, null)).toBe(true);
      expect(canDismissAnnouncement(false, { userId: 'usr-1', acknowledgedAt: null })).toBe(true);

      // Mandatory announcement without acknowledgement CANNOT be dismissed
      expect(canDismissAnnouncement(true, null)).toBe(false);
      expect(canDismissAnnouncement(true, { userId: 'usr-1', acknowledgedAt: null })).toBe(false);

      // Mandatory announcement WITH acknowledgement CAN be dismissed
      expect(canDismissAnnouncement(true, { userId: 'usr-1', acknowledgedAt: new Date() })).toBe(true);
    });

    it('checks Colombian business hours (UTC-5)', () => {
      // Wednesday 10:00 AM Colombia (15:00 UTC) -> should be business hours
      const wednesdayWorkHour = new Date(Date.UTC(2026, 8, 16, 15, 0, 0));
      expect(isColombianBusinessHours(wednesdayWorkHour)).toBe(true);

      // Wednesday 11:00 PM Colombia (04:00 UTC next day) -> outside hours
      const wednesdayNight = new Date(Date.UTC(2026, 8, 17, 4, 0, 0));
      expect(isColombianBusinessHours(wednesdayNight)).toBe(false);

      // Sunday 11:00 AM Colombia -> weekend, not business day
      const sunday = new Date(Date.UTC(2026, 8, 20, 16, 0, 0));
      expect(isColombianBusinessHours(sunday)).toBe(false);
    });
  });

  describe('Attachment MIME Validation', () => {
    it('accepts valid PDF, image and Office document files', () => {
      expect(validateAttachment({ name: 'directiva.pdf', size: 1024 * 50, mimeType: 'application/pdf' }).isValid).toBe(true);
      expect(validateAttachment({ name: 'foto_planta.png', size: 1024 * 200, mimeType: 'image/png' }).isValid).toBe(true);
      expect(validateAttachment({ name: 'reporte.xlsx', size: 1024 * 80, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }).isValid).toBe(true);
    });

    it('rejects forbidden file types like executables or unknown extensions', () => {
      const res = validateAttachment({ name: 'script.exe', size: 1024, mimeType: 'application/x-msdownload' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Tipo de archivo no permitido');
    });

    it('rejects files exceeding maximum size limit', () => {
      const res = validateAttachment({
        name: 'video_gigante.pdf',
        size: MAX_ATTACHMENT_SIZE_BYTES + 1000,
        mimeType: 'application/pdf',
      });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('supera el tamaño máximo');
    });

    it('rejects files where extension does not match MIME type', () => {
      const res = validateAttachment({ name: 'archivo.pdf', size: 1024, mimeType: 'image/png' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('no coincide con su tipo MIME real');
    });

    it('rejects empty files', () => {
      const res = validateAttachment({ name: 'vacio.pdf', size: 0, mimeType: 'application/pdf' });
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('está vacío o dañado');
    });
  });

  describe('Announcement Templates', () => {
    it('provides all 5 predefined templates with required markdown and defaults', () => {
      expect(ANNOUNCEMENT_TEMPLATES.length).toBe(5);
      const directive = ANNOUNCEMENT_TEMPLATES.find((t) => t.id === 'directiva_direccion');
      expect(directive).toBeDefined();
      expect(directive?.requiresAcknowledgement).toBe(true);
      expect(directive?.defaultBody).toContain('## Propósito y Alcance');

      const alert = ANNOUNCEMENT_TEMPLATES.find((t) => t.id === 'alerta_seguridad_mantenimiento');
      expect(alert?.priority).toBe('URGENT');
    });
  });
});
