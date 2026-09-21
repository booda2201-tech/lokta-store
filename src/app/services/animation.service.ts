import { ElementRef, Injectable } from '@angular/core';
import { gsap } from 'gsap';

@Injectable({ providedIn: 'root' })
export class AnimationService {
  private interactionTweens: gsap.core.Tween[] = [];

  createHero(scope: ElementRef<HTMLElement>): gsap.Context {
    const root = scope.nativeElement;
    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) return;

      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro.from('.hero-copy .eyebrow', { y: 18, opacity: 0, duration: .5 })
        .from('.hero-copy h1', { y: 36, opacity: 0, duration: .75 }, '-=.2')
        .from('.hero-intro', { y: 20, opacity: 0, duration: .5 }, '-=.38')
        .from('.hero-copy .button', { y: 14, scale: .94, opacity: 0, duration: .45 }, '-=.25')
        .from('.hero-art', { scale: .86, rotation: -2, opacity: 0, duration: 1 }, '-=.65')
        .from('.hero-sticker, .hero-note, .hero-scribble', { scale: 0, rotation: 18, opacity: 0, duration: .45, stagger: .12, ease: 'back.out(1.7)' }, '-=.55');

      gsap.to('.hero-sparkle', { rotation: 360, duration: 8, repeat: -1, ease: 'none', stagger: .7 });
      gsap.to('.hero-cloud', { x: 18, yoyo: true, repeat: -1, duration: 3.8, ease: 'sine.inOut', stagger: .6 });

      const move = (event: MouseEvent) => {
        const bounds = root.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - .5;
        const y = (event.clientY - bounds.top) / bounds.height - .5;
        gsap.to('.hero-parallax', { x: x * 18, y: y * 12, duration: .7, ease: 'power2.out', overwrite: true });
        gsap.to('.hero-art', { x: x * -10, y: y * -8, duration: .9, ease: 'power2.out', overwrite: true });
      };
      root.addEventListener('mousemove', move, { passive: true });
      context.add(() => root.removeEventListener('mousemove', move));
    }, root);
    return context;
  }

  animateGrid(grid: ElementRef<HTMLElement>): gsap.Context {
    const context = gsap.context(() => {
      gsap.fromTo('.product-card', { autoAlpha: 0, y: 24, scale: .98 }, { autoAlpha: 1, y: 0, scale: 1, duration: .55, stagger: .055, ease: 'back.out(1.2)', overwrite: true });
      gsap.fromTo('.product-card .product-image', { rotation: -1.2 }, { rotation: 0, duration: .65, stagger: .05, ease: 'power2.out', overwrite: true });
    }, grid.nativeElement);
    return context;
  }

  hoverCard(card: HTMLElement, entering: boolean): void {
    this.track(gsap.to(card, { y: entering ? -4 : 0, rotate: entering ? .25 : 0, duration: .3, ease: entering ? 'back.out(1.5)' : 'power2.out', overwrite: true }));
    this.track(gsap.to(card.querySelector('.product-image img'), { scale: entering ? 1.035 : 1, rotate: entering ? .5 : 0, duration: .4, ease: 'power2.out', overwrite: true }));
    this.track(gsap.to(card.querySelector('.arrow-button'), { scale: entering ? 1.07 : 1, rotate: entering ? 4 : 0, duration: .3, ease: 'back.out(1.5)', overwrite: true }));
    this.track(gsap.to(card.querySelector('.card-heart'), { scale: entering ? 1.05 : 1, duration: .3, ease: 'back.out(1.5)', overwrite: true }));
  }

  pulseButton(scope: ElementRef<HTMLElement>, button: HTMLElement): gsap.Context {
    return gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.to(button, { scale: 1.015, duration: 1.25, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, scope.nativeElement);
  }

  clearInteractions(): void {
    this.interactionTweens.forEach(tween => tween.kill());
    this.interactionTweens = [];
  }

  celebrate(target: HTMLElement): gsap.Context {
    const context = gsap.context(() => {
      const sparkles = target.querySelectorAll('.order-sparkle');
      gsap.fromTo(sparkles, { scale: 0, opacity: 0, x: 0, y: 0 }, { scale: 1, opacity: 1, x: (index) => (index % 2 ? 32 : -32), y: (index) => -20 - index * 7, duration: .55, stagger: .04, ease: 'back.out(2)', onComplete: () => gsap.to(sparkles, { opacity: 0, scale: 0, duration: .3, delay: .25 }) });
      gsap.fromTo(target.querySelector('.order-check'), { scale: 0, rotation: -18 }, { scale: 1, rotation: 0, duration: .45, ease: 'back.out(1.8)' });
    }, target);
    return context;
  }

  routeEnter(scope: ElementRef<HTMLElement>): gsap.Context {
    return gsap.context(() => gsap.from(scope.nativeElement, { autoAlpha: 0, y: 8, duration: .45, ease: 'power2.out' }), scope.nativeElement);
  }

  private track(tween: gsap.core.Tween): void {
    this.interactionTweens.push(tween);
    tween.eventCallback('onComplete', () => {
      this.interactionTweens = this.interactionTweens.filter(item => item !== tween);
    });
  }
}
