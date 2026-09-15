/**
 * @openapi
 * components:
 *   schemas:
 *     AuthResponseDto:
 *       type: object
 *       properties:
 *         accessToken: { type: string }
 *         refreshToken: { type: string }
 *         tokenType: { type: string, example: Bearer }
 *         expiresIn: { type: number, description: "Access token TTL in seconds" }
 */
export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
