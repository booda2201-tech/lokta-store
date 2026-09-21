import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return sessionStorage.getItem('loqta-admin') === 'true'
    ? true
    : router.createUrlTree(['/admin']);
};
