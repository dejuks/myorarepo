/**
 * @openapi
 * components:
 *   schemas:
 *     PlatformSettingsResponseDto:
 *       type: object
 *       properties:
 *         requireEmailVerification: { type: boolean }
 *         updatedAt: { type: string, format: date-time }
 *         updatedBy: { type: string, format: uuid, nullable: true }
 */
export interface PlatformSettingsResponseDto {
  requireEmailVerification: boolean;
  updatedAt: string;
  updatedBy: string | null;
}
