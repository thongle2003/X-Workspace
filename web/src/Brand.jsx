import React from 'react';
import logoUrl from '../assets/2good2betrue-logo.svg';

export function Brand({ onClick, href = '#/home', label = '2GOOD2BETRUE · Trang chủ' }) {
  return <a href={href} onClick={onClick} aria-label={label} className="brand-link">
    <img src={logoUrl} alt="" className="brand-logo" />
  </a>;
}

export function BrandBadge() {
  return <span className="brand-badge" aria-hidden="true">2G</span>;
}
