import Ticket from '../models/Ticket.js';

// Tickets created before the four-status lifecycle used Pending / Answered. Converts them in place;
// once nothing matches it is a no-op, so it is safe to run on every start.
export const migrateTicketStatuses = async () => {
  const [inProgress, open, resolved] = await Promise.all([
    Ticket.collection.updateMany({ status: 'Pending', assignedTo: { $ne: null } }, { $set: { status: 'In Progress' } }),
    Ticket.collection.updateMany({ status: 'Pending', assignedTo: null }, { $set: { status: 'Open' } }),
    Ticket.collection.updateMany({ status: 'Answered' }, { $set: { status: 'Resolved' } }),
  ]);
  const changed = inProgress.modifiedCount + open.modifiedCount + resolved.modifiedCount;
  if (changed) console.log(`Migrated ${changed} ticket(s) to the four-status lifecycle`);
};
