import { context, json } from '@/lib/api/helpers';
import { permissionsForRole } from '@/lib/core/auth/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = context();
  return json({
    user: ctx.user,
    role: ctx.role,
    guest: !ctx.user,
    permissions: permissionsForRole(ctx.role),
    demoAccounts: [
      { email: 'owner@demo.local', password: 'Demo#12345', role: 'owner' },
      { email: 'analyst@demo.local', password: 'Analyst#12345', role: 'analyst' },
      { email: 'scout@demo.local', password: 'Scout#12345', role: 'scout' },
      { email: 'viewer@demo.local', password: 'Viewer#12345', role: 'viewer' },
    ],
  });
}
