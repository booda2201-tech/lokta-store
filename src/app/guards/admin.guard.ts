import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AdminService } from '../services/admin.service';

// Reloading /admin must not bounce the owner home while Firebase is still restoring the session.
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const admin = inject(AdminService);
  await admin.ready;
  return admin.authenticated() ? true : router.createUrlTree(['/']);
};
