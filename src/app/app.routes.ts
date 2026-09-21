import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./pages/catalog/catalog.component').then(m => m.CatalogComponent) },
	{ path: 'product/:id', loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent) },
	{ path: 'admin', loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent) },
	{ path: '**', redirectTo: '' }
];
