/**
 * WGS-84 ECEF (Earth-Centered Earth-Fixed) ↔ geodetic conversion.
 *
 * The backend ships adjusted station positions as ECEF XYZ metres. For the
 * map we need geodetic latitude / longitude. Using the standard Bowring
 * closed-form approximation — accurate to < 1 mm horizontally and < 0.1 mm
 * vertically for any altitude up to 2 × Earth radii, which covers every
 * terrestrial surveying scenario.
 */

// WGS-84 defining constants
const A = 6_378_137.0            // semi-major axis (m)
const F = 1 / 298.257_223_563    // flattening
const B = A * (1 - F)            // semi-minor axis
const E2 = F * (2 - F)           // first eccentricity squared
const EP2 = (A * A - B * B) / (B * B)   // second eccentricity squared

export type LLH = { lat: number; lon: number; h: number }   // degrees + metres

/** ECEF (x, y, z) in metres → geodetic (lat, lon, h). */
export function ecefToLLH(x: number, y: number, z: number): LLH {
  const p = Math.sqrt(x * x + y * y)
  const theta = Math.atan2(z * A, p * B)
  const sinT = Math.sin(theta)
  const cosT = Math.cos(theta)
  const lat = Math.atan2(
    z + EP2 * B * sinT * sinT * sinT,
    p - E2  * A * cosT * cosT * cosT,
  )
  const lon = Math.atan2(y, x)
  const N = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2)
  const h = p / Math.cos(lat) - N
  return {
    lat: (lat * 180) / Math.PI,
    lon: (lon * 180) / Math.PI,
    h,
  }
}

/** Robust conversion: handles the (0,0,0) sentinel + NaN → returns null. */
export function maybeEcefToLLH(
  x: number | null | undefined,
  y: number | null | undefined,
  z: number | null | undefined,
): LLH | null {
  if (x == null || y == null || z == null) return null
  if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return null
  if (x === 0 && y === 0 && z === 0) return null   // unknown / placeholder
  return ecefToLLH(x, y, z)
}
