import type { RouteInfo } from '../types';
import { classNames, modeLabel } from '../utils';

interface RouteBadgeProps {
  route: Pick<RouteInfo, 'shortName' | 'color' | 'textColor' | 'mode' | 'type'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RouteBadge({ route, size = 'md', className }: RouteBadgeProps) {
  return (
    <span
      className={classNames('route-badge', `route-badge-${size}`, className)}
      style={{ backgroundColor: route.color, color: route.textColor }}
      title={`${modeLabel(route.mode, route.type)} ${route.shortName}`}
    >
      {route.shortName}
    </span>
  );
}
