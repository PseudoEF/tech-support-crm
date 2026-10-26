export interface ChartCoordinate {
  x: number;
  y: number;
}

export function buildSmoothPath(points: readonly ChartCoordinate[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const secants: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const dx = points[index + 1].x - points[index].x;
    secants.push(dx === 0 ? 0 : (points[index + 1].y - points[index].y) / dx);
  }

  const tangents = new Array<number>(points.length).fill(0);
  tangents[0] = secants[0];
  tangents[points.length - 1] = secants[secants.length - 1];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = secants[index - 1];
    const next = secants[index];
    if (previous === 0 || next === 0 || Math.sign(previous) !== Math.sign(next)) {
      tangents[index] = 0;
    } else {
      const average = (previous + next) / 2;
      const limit = 3 * Math.min(Math.abs(previous), Math.abs(next));
      tangents[index] = Math.sign(average) * Math.min(Math.abs(average), limit);
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const dx = (next.x - current.x) / 3;
    path += ` C ${current.x + dx} ${current.y + tangents[index] * dx}, ${
      next.x - dx
    } ${next.y - tangents[index + 1] * dx}, ${next.x} ${next.y}`;
  }

  return path;
}
