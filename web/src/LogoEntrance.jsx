import { useLayoutEffect, useState } from 'react';

const SESSION_KEY = '2g2bt-logo-entrance-seen';
let playedInMemory = false;

function sidebarLogo() {
  return [...document.querySelectorAll('.investor-sidebar .brand-logo, .startup-sidebar .brand-logo, .investor-sidebar .brand-badge, .startup-sidebar .brand-badge')]
    .find(node => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
}

export function LogoEntrance() {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    if (sidebarLogo()) { setReady(true); return; }
    const observer = new MutationObserver(() => {
      if (sidebarLogo()) { observer.disconnect(); setReady(true); }
    });
    observer.observe(document, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const releasePreflight = () => document.documentElement.classList.remove('logo-entrance-pending');
    try { if (playedInMemory || sessionStorage.getItem(SESSION_KEY) === '1') { releasePreflight(); return; } }
    catch { if (playedInMemory) { releasePreflight(); return; } }

    const logo = sidebarLogo();
    if (!logo) return;
    const remember = () => {
      playedInMemory = true;
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* Still once for this mount. */ }
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !logo.animate) {
      remember();
      releasePreflight();
      return;
    }

    const destination = logo.getBoundingClientRect();
    const fullLogo = logo.tagName === 'IMG';
    const landingWidth = fullLogo ? destination.width * 26 / 220 : destination.width;
    const startWidth = Math.min(fullLogo ? landingWidth * 3 : 130, innerWidth - 32);
    const startHeight = startWidth * destination.height / landingWidth;
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const layer = document.createElement('div');
    layer.dataset.logoEntrance = 'active';
    Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '50', pointerEvents: 'none', overflow: 'visible' });
    layer.setAttribute('aria-hidden', 'true');
    const backdrop = document.createElement('div');
    backdrop.dataset.logoEntranceBackdrop = '';
    Object.assign(backdrop.style, {
      position: 'absolute', inset: '0', background: 'var(--app-background)', opacity: '1',
    });

    const flying = document.createElement('div');
    Object.assign(flying.style, {
      position: 'absolute', left: `${centerX - startWidth / 2}px`, top: `${centerY - startHeight / 2}px`,
      width: `${startWidth}px`, height: `${startHeight}px`, transformOrigin: 'center center', opacity: '0',
      willChange: 'transform, opacity',
    });
    const mark = fullLogo ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : logo.cloneNode(true);
    if (fullLogo) {
      mark.setAttribute('viewBox', '155 45 80 290');
      const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      stroke.setAttribute('d', 'M169 153 L169 78 C169 43 224 43 224 78 L224 117 C224 149 206 169 188 197 C175 216 169 229 169 251 L169 325 L229 325');
      stroke.setAttribute('fill', 'none');
      stroke.setAttribute('stroke', 'currentColor');
      stroke.setAttribute('stroke-width', '11');
      stroke.setAttribute('stroke-linecap', 'square');
      stroke.setAttribute('stroke-linejoin', 'round');
      mark.append(stroke);
    }
    mark.removeAttribute('id');
    Object.assign(mark.style, {
      display: fullLogo ? 'block' : 'grid', width: '100%', height: '100%',
      maxHeight: 'none', margin: '0', color: 'var(--text-primary)',
    });
    flying.append(mark);

    const label = document.createElement('div');
    label.textContent = '2 GOOD 2 BE TRUE';
    Object.assign(label.style, {
      position: 'absolute', top: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
      whiteSpace: 'nowrap', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '11px',
      fontWeight: '600', letterSpacing: '.18em', opacity: '0',
    });
    flying.append(label);
    layer.append(backdrop, flying);
    const previousVisibility = logo.style.visibility;
    logo.style.visibility = 'hidden';
    document.body.append(layer);
    releasePreflight();

    let stopped = false;
    const animations = [];
    const timers = [];
    const animate = (element, frames, options) => {
      const animation = element.animate(frames, { fill: 'forwards', ...options });
      animations.push(animation);
      return animation.finished.catch(() => {});
    };
    const pause = ms => new Promise(resolve => timers.push(setTimeout(resolve, ms)));
    const finish = () => {
      logo.style.visibility = previousVisibility;
      layer.remove();
      releasePreflight();
      if (!stopped) remember();
    };

    (async () => {
      await Promise.all([
        animate(flying, [
          { transform: 'scale(.3)', opacity: 0 },
          { transform: 'scale(1.08)', opacity: 1, offset: .72 },
          { transform: 'scale(1)', opacity: 1 },
        ], { duration: 620, easing: 'cubic-bezier(.18,.8,.22,1)' }),
        animate(label, [{ opacity: 0 }, { opacity: 1 }], { delay: 270, duration: 300, easing: 'ease-out' }),
      ]);
      if (stopped) return;
      await pause(390);
      if (stopped) return;
      await animate(label, [{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'ease-in' });
      if (stopped) return;
      const end = logo.getBoundingClientRect();
      const endWidth = fullLogo ? end.width * 26 / 220 : end.width;
      const endX = fullLogo ? end.left + endWidth / 2 : end.left + end.width / 2;
      await Promise.all([
        animate(flying, [
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
          { transform: `translate3d(${endX - centerX}px, ${end.top + end.height / 2 - centerY}px, 0) scale(${endWidth / startWidth})`, opacity: 1 },
        ], { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)' }),
        animate(backdrop, [{ opacity: 1 }, { opacity: 0 }], { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)' }),
      ]);
      if (!stopped) finish();
    })().catch(finish);

    return () => {
      stopped = true;
      timers.forEach(clearTimeout);
      animations.forEach(animation => animation.cancel());
      logo.style.visibility = previousVisibility;
      layer.remove();
      releasePreflight();
    };
  }, [ready]);
  return null;
}
