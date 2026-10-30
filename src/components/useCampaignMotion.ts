"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { CampaignView } from '@/lib/campaign-workflow';
export type { CampaignView } from '@/lib/campaign-workflow';
const order: CampaignView[] = ['proposal','personalize','review','materials'];
const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Keep the navigation still while the current step leaves and the next settles in. */
export function useCampaignMotion(initial: CampaignView) {
  const [view,setView] = useState(initial);
  const [revision,setRevision] = useState(0);
  const [moving,setMoving] = useState(false);
  const section = useRef<HTMLElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  const current = useRef(initial), animating = useRef(false), mounted = useRef(true);
  const animations = useRef<Animation[]>([]);
  const change = useRef<{ height: number; direction: number; done: () => void } | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animations.current.forEach(animation => animation.cancel());
      change.current?.done();
    };
  },[]);

  useLayoutEffect(() => {
    const list = steps.current;
    if (!list) return;
    const place = () => {
      const active = list.querySelector<HTMLElement>('li[aria-current]');
      if (!active) { list.style.setProperty('--on','0'); return; }
      list.style.setProperty('--x',`${active.offsetLeft}px`);
      list.style.setProperty('--w',`${active.offsetWidth}px`);
      // On the rule under the step's own row, whatever the list's padding (the list may wrap on narrow columns).
      const pad = parseFloat(getComputedStyle(list).paddingBottom) || 0;
      list.style.setProperty('--y',`${active.offsetTop + active.offsetHeight + pad - 1}px`);
      list.style.setProperty('--p',`${active.offsetLeft + active.offsetWidth}px`);   // how far the journey has come
      list.style.setProperty('--on','1');
    };
    place();
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(place).catch(() => {});
    window.addEventListener('resize',place);
    return () => window.removeEventListener('resize',place);
  },[view]);

  useLayoutEffect(() => {
    const transition = change.current, panel = content.current, frame = shell.current;
    if (!transition || !panel || !frame) return;
    const finish = () => {
      animations.current.forEach(animation => animation.cancel());
      animations.current = [];
      frame.style.height = '';
      frame.style.overflow = '';
      change.current = null;
      animating.current = false;
      if (mounted.current) {
        panel.inert = false;
        setMoving(false);
        heading.current?.focus({preventScroll:true});
      }
      transition.done();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !panel.animate) { finish(); return; }
    try {
      const height = panel.getBoundingClientRect().height;
      // The frame stays put; only its height follows. The elements do the moving: each block of the
      // new step rises into place in turn, the heading first, out of a whisper of blur.
      const reveal = panel.animate([{opacity:0},{opacity:1}],{duration:160,easing:'ease-out',fill:'both'});
      const resize = frame.animate([{height:`${transition.height}px`},{height:`${height}px`}],{duration:520,easing:ease,fill:'both'});
      animations.current.push(reveal,resize);
      Array.from(panel.children).slice(0,12).forEach((block,i) => {
        try { block.animate([{opacity:0,transform:'translateY(14px)',filter:'blur(2px)'},{opacity:1,transform:'none',filter:'blur(0px)'}],{duration:540,delay:60 + i * 55,easing:ease,fill:'backwards'}); } catch { /* decorative */ }
      });
      Promise.all([reveal.finished,resize.finished]).then(finish,finish);
    } catch { finish(); }
  },[revision]);

  function goTo(next: CampaignView, commit?: () => void): Promise<void> {
    if (animating.current || next === current.current && !commit) return Promise.resolve();
    animating.current = true; setMoving(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panel = content.current, frame = shell.current;
    const direction = order.indexOf(next) >= order.indexOf(current.current) ? 1 : -1;
    const rect = section.current?.getBoundingClientRect();
    // Do not move a screen that is already comfortably in view.
    if (rect && (rect.top < 76 || rect.top > window.innerHeight * .45)) {
      window.scrollTo({top:Math.max(0,window.scrollY + rect.top - 88),behavior:reduce?'instant':'smooth'});
    }
    return new Promise<void>(done => {
      const swap = () => {
        if (!mounted.current) { done(); return; }
        const height = frame?.getBoundingClientRect().height ?? 0;
        change.current = {height,direction,done};
        if (frame && !reduce) { frame.style.height = `${height}px`; frame.style.overflow = 'clip'; }
        commit?.();
        current.current = next; setView(next); setRevision(value => value + 1);
      };
      if (!panel?.animate || reduce) { swap(); return; }
      try {
        // The current step's elements fade away one after the other, the frame itself does not move.
        const blocks = Array.from(panel.children).slice(0,12);
        blocks.forEach((block,i) => {
          try { block.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-6px)'}],{duration:160,delay:i * 18,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}); } catch { /* decorative */ }
        });
        const leave = panel.animate([{opacity:1},{opacity:0}],{duration:90,delay:Math.min(blocks.length,12) * 18 + 60,easing:'ease-out',fill:'forwards'});
        animations.current = [leave];
        leave.finished.then(swap,swap);
      } catch { swap(); }
    });
  }
  return {view,revision,moving,goTo,section,shell,content,heading,steps};
}
