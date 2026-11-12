import React from 'react';
import agriCircular from '../assets/startup-covers/agri-circular.webp';
import education from '../assets/startup-covers/education.webp';
import energy from '../assets/startup-covers/energy.webp';
import farmMarket from '../assets/startup-covers/farm-market.webp';
import finance from '../assets/startup-covers/finance.webp';
import health from '../assets/startup-covers/health.webp';
import materials from '../assets/startup-covers/materials.webp';
import warehouse from '../assets/startup-covers/warehouse.webp';

const covers = {
  'startup-tai-sinh-nong': agriCircular,
  'startup-so-may': finance,
  'startup-bac-si-so': health,
  'startup-cho-nong': farmMarket,
  'startup-hoc-5-phut': education,
  'startup-dien-sach': energy,
  'startup-vi-mo': finance,
  'startup-kho-noi': warehouse,
  'startup-vat-lieu-moi': materials,
  'startup-bep-gan': farmMarket,
};

function coverFor(project) {
  const id = project.workspaceId || project.id;
  if (covers[id]) return covers[id];
  const industry = (project.profile?.industry || '').toLocaleLowerCase();
  if (industry.includes('health')) return health;
  if (industry.includes('edtech')) return education;
  if (industry.includes('fintech')) return finance;
  if (industry.includes('e-commerce')) return farmMarket;
  if (industry.includes('climate')) return energy;
  if (industry.includes('saas')) return warehouse;
  return materials;
}

export function StartupCover({ project, trailing }) {
  return <div className="startup-cover relative -mx-5 -mt-5 mb-5 h-36 overflow-hidden rounded-t-2xl sm:-mx-6 sm:-mt-6">
    <img src={project.profile?.media?.cover || coverFor(project)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    <div className="startup-cover-shade pointer-events-none absolute inset-0" aria-hidden="true" />
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
      <span className="startup-cover-pill rounded-full px-2.5 py-1 text-xs font-semibold">{project.profile.stage}</span>
      {trailing}
    </div>
    {project.profile?.media?.logo && <img src={project.profile.media.logo} alt={`Logo ${project.profile.name}`} loading="lazy" className="absolute bottom-3 left-4 z-10 h-12 w-12 rounded-xl border-2 border-white bg-white object-contain shadow-md" />}
  </div>;
}
