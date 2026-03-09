import cds from '@sap/cds';

/**
 * Resolve user from DB by trying multiple lookup strategies:
 * 1. By UUID (req.user.id)
 * 2. By email from CDS auth attributes (req.user.attr.email / emails)
 * 3. By userId treated as email directly
 * 4. By userId@example.com (legacy dev seed pattern)
 * 5. By userId@conarum.com (sample_import.xlsx pattern)
 *
 * This allows login to work regardless of which dataset was imported.
 */
export async function resolveUser(req: any) {
  const mockUserId = req.headers?.['x-mock-user'];
  const userId = mockUserId || req.user.id;
  const db = cds.db || (await cds.connect.to('db'));
  const { User } = db.entities('sap.timesheet');

  // 1. Try by UUID
  let [user] = await SELECT.from(User).where({ ID: userId });
  if (user) return user;

  // 2. Try by email from CDS auth attributes (supports both attr.email and attr.emails array)
  const attrEmails: string[] = [];
  const attr = req.user.attr;
  if (attr) {
    if (Array.isArray(attr.email)) attrEmails.push(...attr.email);
    else if (typeof attr.email === 'string') attrEmails.push(attr.email);
    if (Array.isArray(attr.emails)) attrEmails.push(...attr.emails);
  }
  for (const email of attrEmails) {
    [user] = await SELECT.from(User).where({ email });
    if (user) return user;
  }

  // 3. Try userId directly as email (e.g. if someone passed email as id)
  [user] = await SELECT.from(User).where({ email: userId });
  if (user) return user;

  // 4. Try userId@example.com (legacy dev seed users: nam, alice, diana, etc.)
  [user] = await SELECT.from(User).where({ email: `${userId}@example.com` });
  if (user) return user;

  // 5. Try userId@conarum.com (sample_import.xlsx users: lead1, manager, alice, etc.)
  [user] = await SELECT.from(User).where({ email: `${userId}@conarum.com` });
  if (user) return user;

  // 6. Try userId@conarum.de (new seed data: admin, tl1, tl2, emp1..emp5)
  [user] = await SELECT.from(User).where({ email: `${userId}@conarum.de` });
  if (user) return user;

  return null;
}
