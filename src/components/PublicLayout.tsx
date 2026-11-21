import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Instagram, Menu, MessageCircle, X } from 'lucide-react';
import type { SiteSettings } from '../types/studio';

interface PublicLayoutProps {
  settings: SiteSettings | null;
}

export function formatWhatsAppUrl(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
}

export function isExternalHref(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:');
}

export function PublicLayout({ settings }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const brandName = settings?.brandName || 'PABLO';

  const nav = {
    home: settings?.navLabels?.home || 'Home',
    work: settings?.navLabels?.work || 'Our Work',
    events: settings?.navLabels?.events || 'Events',
    about: settings?.navLabels?.about || 'About',
    contact: settings?.navLabels?.contact || 'Contact',
    cta: settings?.navLabels?.cta || 'Book a Fitting',
  };

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 text-sm transition-colors duration-200 whitespace-nowrap shrink-0 ${
      isActive
        ? 'text-[#171614] font-medium after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-px after:bg-[#171614]'
        : 'text-[#5C5750] hover:text-[#171614]'
    }`;

  const whatsappRaw = settings?.whatsappNumber || settings?.socialLinks?.whatsapp || '';
  const whatsappUrl = whatsappRaw ? formatWhatsAppUrl(whatsappRaw) : '';
  const instagramUrl = settings?.instagramUrl || settings?.socialLinks?.instagram || '';
  const facebookUrl = settings?.socialLinks?.facebook || '';
  const pinterestUrl = settings?.socialLinks?.pinterest || '';
  const youtubeUrl = settings?.socialLinks?.youtube || '';
  const ctaTarget = settings?.heroSecondaryCtaUrl || '/contact';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#171614]">
      {/* 3-Zone Editorial Top Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/92 backdrop-blur-md border-b border-[#171614]/8">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 md:h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
          >
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={brandName}
                className="h-8 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="font-serif text-2xl sm:text-[1.75rem] tracking-[0.18em] font-medium text-[#171614] uppercase">
                {brandName}
              </span>
            )}
          </Link>

          {/* Zone 2: 5 Clean Single-Line Navigation Links */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7 lg:gap-8">
            <NavLink to="/" end className={navLinkClass}>
              {nav.home}
            </NavLink>
            <NavLink to="/work" className={navLinkClass}>
              {nav.work}
            </NavLink>
            <NavLink to="/events" className={navLinkClass}>
              {nav.events}
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              {nav.about}
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              {nav.contact}
            </NavLink>
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            {isExternalHref(ctaTarget) ? (
              <a
                href={ctaTarget}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium tracking-wide bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors duration-200 whitespace-nowrap shrink-0"
              >
                {nav.cta}
              </a>
            ) : (
              <Link
                to={ctaTarget}
                className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium tracking-wide bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors duration-200 whitespace-nowrap shrink-0"
              >
                {nav.cta}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 text-[#171614] hover:bg-[#171614]/5 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#171614]/8 bg-[#FAF8F5] px-5 py-6">
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
              <NavLink
                to="/"
                end
                className="py-3 text-base text-[#171614] border-b border-[#171614]/6"
              >
                {nav.home}
              </NavLink>
              <NavLink
                to="/work"
                className="py-3 text-base text-[#171614] border-b border-[#171614]/6"
              >
                {nav.work}
              </NavLink>
              <NavLink
                to="/events"
                className="py-3 text-base text-[#171614] border-b border-[#171614]/6"
              >
                {nav.events}
              </NavLink>
              <NavLink
                to="/about"
                className="py-3 text-base text-[#171614] border-b border-[#171614]/6"
              >
                {nav.about}
              </NavLink>
              <NavLink
                to="/contact"
                className="py-3 text-base text-[#171614] border-b border-[#171614]/6"
              >
                {nav.contact}
              </NavLink>
              <Link
                to={isExternalHref(ctaTarget) ? '/contact' : ctaTarget}
                className="mt-4 inline-flex items-center justify-center px-5 py-3 text-sm font-medium bg-[#171614] text-[#FAF8F5]"
              >
                {nav.cta}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Refined Editorial Footer */}
      <footer className="border-t border-[#171614]/10 bg-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#171614]/8">
            <div className="md:col-span-5">
              <Link
                to="/"
                className="font-serif text-2xl tracking-[0.18em] font-medium text-[#171614] uppercase"
              >
                {brandName}
              </Link>
              <p className="mt-4 text-sm text-[#5C5750] leading-relaxed max-w-sm">
                {settings?.footerDescription ||
                  settings?.heroDescription ||
                  'Bespoke fashion design and custom stitching studio dedicated to individual silhouettes and hand-finished craftsmanship.'}
              </p>
            </div>

            <div className="md:col-span-3">
              <h2 className="text-xs font-medium tracking-wider uppercase text-[#766E64] mb-4 font-sans">
                Atelier
              </h2>
              <ul className="space-y-2.5 text-sm text-[#171614]">
                <li>
                  <Link to="/" className="hover:text-[#766E64] transition-colors">
                    {nav.home}
                  </Link>
                </li>
                <li>
                  <Link to="/work" className="hover:text-[#766E64] transition-colors">
                    {nav.work}
                  </Link>
                </li>
                <li>
                  <Link to="/events" className="hover:text-[#766E64] transition-colors">
                    {nav.events}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#766E64] transition-colors">
                    {nav.about}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#766E64] transition-colors">
                    {nav.contact}
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h2 className="text-xs font-medium tracking-wider uppercase text-[#766E64] mb-4 font-sans">
                Connect
              </h2>
              <div className="space-y-2.5 text-sm text-[#5C5750]">
                {settings?.contactPhone && (
                  <p>
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`}
                      className="text-[#171614] hover:underline"
                    >
                      {settings.contactPhone}
                    </a>
                  </p>
                )}
                {settings?.contactEmail && (
                  <p>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="text-[#171614] hover:underline"
                    >
                      {settings.contactEmail}
                    </a>
                  </p>
                )}
                {settings?.address && <p className="leading-relaxed">{settings.address}</p>}
                {settings?.studioHours && (
                  <p className="text-xs text-[#766E64]">{settings.studioHours}</p>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#171614] hover:text-[#766E64] transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      <span>Instagram</span>
                    </a>
                  )}
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-[#171614] hover:text-[#766E64] transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  {facebookUrl && (
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#171614] hover:text-[#766E64] transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                  {pinterestUrl && (
                    <a
                      href={pinterestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#171614] hover:text-[#766E64] transition-colors"
                    >
                      Pinterest
                    </a>
                  )}
                  {youtubeUrl && (
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#171614] hover:text-[#766E64] transition-colors"
                    >
                      YouTube
                    </a>
                  )}
                  {!instagramUrl &&
                    !whatsappUrl &&
                    !facebookUrl &&
                    !pinterestUrl &&
                    !youtubeUrl &&
                    !settings?.contactPhone && (
                      <Link
                        to="/contact"
                        className="text-sm text-[#171614] underline underline-offset-4"
                      >
                        Send a Studio Enquiry
                      </Link>
                    )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#766E64]">
            <p>
              © {new Date().getFullYear()}{' '}
              {settings?.footerCopyright || `${brandName} Fashion Studio. All rights reserved.`}
            </p>
            <nav aria-label="Footer Legal and Studio Links" className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link to="/privacy-policy" className="hover:text-[#171614] transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-and-conditions" className="hover:text-[#171614] transition-colors">
                Terms &amp; Conditions
              </Link>
              <Link to="/contact" className="hover:text-[#171614] transition-colors">
                {nav.contact}
              </Link>
              <Link to="/admin" className="hover:text-[#171614] transition-colors">
                Studio Admin
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
