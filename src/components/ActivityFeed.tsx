import { motion, useReducedMotion } from 'motion/react';
import type { ActivityEvent, Ticket } from '../domain/types';
import { formatRelative } from '../lib/format';
import { routeHref } from '../lib/router';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';

interface ActivityFeedProps {
  activities: readonly ActivityEvent[];
  tickets: readonly Ticket[];
  now: Date;
  limit?: number;
}

const LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function ActivityFeed({ activities, tickets, now, limit = 7 }: ActivityFeedProps) {
  const reducedMotion = useReducedMotion();
  const ticketById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const visible = activities.slice(0, limit);

  if (visible.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="Пока тихо"
        description="События появятся, когда в системе будут действия с заявками."
      />
    );
  }

  return (
    <motion.ul
      className="activity-feed"
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={LIST_VARIANTS}
    >
      {visible.map((activity) => {
        const ticket = activity.ticketId ? ticketById.get(activity.ticketId) : undefined;
        return (
          <motion.li key={activity.id} className="activity-item" variants={ITEM_VARIANTS}>
            <Avatar name={activity.actorName} size={32} />
            <div className="activity-copy">
              <p>
                <strong>{activity.actorName}</strong> <span>{activity.text}</span>
              </p>
              <div className="activity-meta">
                {ticket ? (
                  <a href={routeHref.ticket(ticket.id)} className="text-link">
                    {ticket.number}
                  </a>
                ) : null}
                {ticket ? <span aria-hidden="true">·</span> : null}
                <time dateTime={activity.createdAt}>
                  {formatRelative(activity.createdAt, now)}
                </time>
              </div>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
