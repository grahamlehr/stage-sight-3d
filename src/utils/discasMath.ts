import { DiscasTelemetry } from '../store/useStageStore';

export interface ComputeDiscasParams {
  cameraPos: [number, number, number];
  screenPos: [number, number, number];
  screenRotation: [number, number, number];
  screenHeight: number;
}

export function computeDiscasTelemetry({
  cameraPos,
  screenPos,
  screenRotation,
  screenHeight,
}: ComputeDiscasParams): DiscasTelemetry {
  const [cx, cy, cz] = cameraPos;
  const [sx, sy, sz] = screenPos;
  const [, ry] = screenRotation;

  // 3D Euclidean distance
  const dx = cx - sx;
  const dy = cy - sy;
  const dz = cz - sz;
  const viewingDistance = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));

  // Distance-to-Height Ratio
  const h = Math.max(0.1, screenHeight);
  const dhRatio = viewingDistance / h;

  let dhStatus: DiscasTelemetry['dhStatus'] = 'detail';
  let dhLabel = 'High Acuity / Analytical Detail';

  if (dhRatio < 4.0) {
    dhStatus = 'detail';
    dhLabel = 'High Acuity / Analytical Detail (<4.0x)';
  } else if (dhRatio <= 6.0) {
    dhStatus = 'reading';
    dhLabel = 'Optimal Basic Reading (4x–6x)';
  } else if (dhRatio <= 8.0) {
    dhStatus = 'marginal';
    dhLabel = 'Marginal — Small Text Risk (6x–8x)';
  } else {
    dhStatus = 'fail';
    dhLabel = 'Exceeds DISCAS Max Distance (>8.0x)';
  }

  // Horizontal Off-Axis Angle (in degrees)
  // Screen faces +Z initially (toward audience). With Y-rotation ry:
  const normalX = Math.sin(ry);
  const normalZ = Math.cos(ry);

  // Vector from screen center to camera on XZ plane
  const horizDist = Math.sqrt(dx * dx + dz * dz);
  let offAxisAngle = 0;

  if (horizDist > 0.001) {
    const dirX = dx / horizDist;
    const dirZ = dz / horizDist;

    // Dot product between screen normal and direction to camera
    const dot = dirX * normalX + dirZ * normalZ;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const rad = Math.acos(clampedDot);
    offAxisAngle = (rad * 180) / Math.PI;
  }

  let angleStatus: DiscasTelemetry['angleStatus'] = 'optimal';
  let angleLabel = 'On-Axis';

  if (offAxisAngle < 30) {
    angleStatus = 'optimal';
    angleLabel = 'On-Axis (<30°)';
  } else if (offAxisAngle <= 45) {
    angleStatus = 'steep';
    angleLabel = 'Steep Angle (30°–45°)';
  } else {
    angleStatus = 'extreme';
    angleLabel = 'Extreme Off-Axis (>45°)';
  }

  return {
    viewingDistance: Math.round(viewingDistance * 10) / 10,
    dhRatio: Math.round(dhRatio * 100) / 100,
    offAxisAngle: Math.round(offAxisAngle * 10) / 10,
    dhStatus,
    dhLabel,
    angleStatus,
    angleLabel,
  };
}
