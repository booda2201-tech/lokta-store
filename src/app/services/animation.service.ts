import { ElementRef, Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
@Injectable({providedIn:'root'})
export class AnimationService {
 private interactionTweens:gsap.core.Tween[]=[];
 get reduced():boolean{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
 createHero(scope:ElementRef<HTMLElement>):gsap.Context {
  const root=scope.nativeElement;
  return gsap.context(()=>{
   if(this.reduced)return;
   gsap.timeline({defaults:{ease:'power3.out'}})
    .from('.hero-copy .eyebrow',{y:15,autoAlpha:0,duration:.5})
    .from('.hero-copy h1',{y:35,autoAlpha:0,duration:.8},'-=.25')
    .from('.hero-intro,.hero-copy .button,.hero-footnote',{y:18,autoAlpha:0,duration:.5,stagger:.1},'-=.4')
    .from('.main-polaroid',{rotation:3,y:50,autoAlpha:0,duration:.9},0.2)
    .from('.mini-polaroid,.hero-sticker,.hero-note',{scale:.6,autoAlpha:0,duration:.6,stagger:.12,ease:'back.out(1.5)'},.65);
   gsap.to('.hero-sparkle',{rotation:360,duration:25,repeat:-1,ease:'none'});
   const art=root.querySelector('.hero-art');
   const move=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;const rect=root.getBoundingClientRect();gsap.to(art,{x:((event.clientX-rect.left)/rect.width-.5)*12,y:((event.clientY-rect.top)/rect.height-.5)*8,duration:.6,overwrite:'auto'});};
   const leave=()=>gsap.to(art,{x:0,y:0,duration:.6,overwrite:'auto'});
   root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);
   return()=>{root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);gsap.killTweensOf(art);};
  },root);
 }
 revealSections(scope:ElementRef<HTMLElement>):gsap.Context {
  return gsap.context(()=>{if(this.reduced)return;
   scope.nativeElement.querySelectorAll('.reveal').forEach(element=>gsap.from(element,{y:30,autoAlpha:0,duration:.7,ease:'power2.out',scrollTrigger:{trigger:element,start:'top 95%',once:true}}));
  },scope.nativeElement);
 }
 animateGrid(grid:ElementRef<HTMLElement>):gsap.Context {
  return gsap.context(()=>{if(this.reduced)return;
   const cards=grid.nativeElement.querySelectorAll('.product-card');
   if(cards.length)gsap.fromTo(cards,{autoAlpha:0,y:18},{autoAlpha:1,y:0,duration:.4,stagger:.045,ease:'power2.out',clearProps:'transform,opacity,visibility'});
   ScrollTrigger.refresh();
  },grid.nativeElement);
 }
 hoverCard(card:HTMLElement,entering:boolean):void {
  if(this.reduced || !window.matchMedia('(hover: hover)').matches)return;
  const tween=gsap.to(card.querySelectorAll('.product-image img'),{scale:entering?1.035:1,duration:.5,ease:'power2.out',overwrite:'auto'});
  this.interactionTweens.push(tween);tween.eventCallback('onComplete',()=>this.interactionTweens=this.interactionTweens.filter(item=>item!==tween));
 }
 pulseButton(scope:ElementRef<HTMLElement>,button:HTMLElement):gsap.Context {
  return gsap.context(()=>{if(!this.reduced)gsap.from(button,{scale:.97,autoAlpha:0,duration:.5,ease:'power2.out',clearProps:'transform,opacity,visibility'});},scope.nativeElement);
 }
 clearInteractions():void {this.interactionTweens.forEach(tween=>tween.kill());this.interactionTweens=[];}
 celebrate(target:HTMLElement):gsap.Context {
  return gsap.context(()=>{if(this.reduced)return;gsap.fromTo(target,{scale:.96},{scale:1,duration:.35,ease:'back.out(2)',clearProps:'transform'});},target);
 }
 routeEnter(scope:ElementRef<HTMLElement>):gsap.Context {
  return gsap.context(()=>{if(!this.reduced)gsap.from(scope.nativeElement,{opacity:0,duration:.3,ease:'power2.out',clearProps:'opacity'});},scope.nativeElement);
 }
}

