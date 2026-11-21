import { useEffect, useState, type FormEvent } from 'react';
import { Check, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { submitEnquiry } from '../lib/api';
import type { SiteSettings } from '../types/studio';
import { formatStudioSchedule, formatWhatsAppUrl } from '../components/PublicLayout';

interface ContactPageProps {
  settings: SiteSettings | null;
}

const DEFAULT_SERVICES = [
  'Custom Stitching',
  'Designer Outfit',
  'Occasion Wear',
  'Event Fashion',
  'Embroidery & Detailing',
  'Other Bespoke Request',
];

export function ContactPage({ settings }: ContactPageProps) {
  const serviceOptions =
    settings?.contactServices && settings.contactServices.length > 0
      ? settings.contactServices
      : DEFAULT_SERVICES;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceRequired, setServiceRequired] = useState(serviceOptions[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!serviceOptions.includes(serviceRequired)) {
      setServiceRequired(serviceOptions[0]);
    }
  }, [serviceOptions, serviceRequired]);

  const whatsappRaw = (settings?.whatsappNumber || settings?.socialLinks?.whatsapp || '').trim();
  const whatsappUrl = whatsappRaw ? formatWhatsAppUrl(whatsappRaw) : '';
  const instagramUrl = (settings?.instagramUrl || settings?.socialLinks?.instagram || '').trim();
  const { scheduleLine, appointmentInfo } = formatStudioSchedule(settings);
  const hasDirectChannels = Boolean(
    whatsappUrl ||
      settings?.contactPhone?.trim() ||
      instagramUrl ||
      settings?.contactEmail?.trim() ||
      settings?.address?.trim() ||
      scheduleLine ||
      appointmentInfo
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmittedMessage('');
    setSubmitting(true);
    try {
      const res = await submitEnquiry({
        name,
        phone,
        serviceRequired,
        message,
      });
      setSubmittedMessage(res.message);
      setName('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left Column: Direct Studio Channels */}
        <div className="lg:col-span-5">
          <p className="text-xs tracking-[0.16em] uppercase text-[#766E64]">Contact & Appointments</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-normal text-[#171614] leading-[1.08] editorial-balance">
            {settings?.contactHeadline || 'Begin a conversation with the atelier.'}
          </h1>
          <p className="mt-5 text-base text-[#5C5750] leading-relaxed">
            {settings?.contactIntro ||
              'Whether commissioning an occasion gown, tailored ensemble, or custom detailing, share your details and our studio will respond personally.'}
          </p>

          <div className="mt-10 pt-8 border-t border-[#171614]/10 space-y-6">
            {whatsappUrl && (
              <div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message on WhatsApp</span>
                </a>
              </div>
            )}

            <dl className="space-y-5 text-sm">
              {settings?.contactPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#766E64] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-[#766E64]">Telephone</dt>
                    <dd className="mt-0.5 text-[#171614]">
                      <a
                        href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`}
                        className="hover:underline"
                      >
                        {settings.contactPhone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {settings?.contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#766E64] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-[#766E64]">Email</dt>
                    <dd className="mt-0.5 text-[#171614]">
                      <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                        {settings.contactEmail}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {instagramUrl && (
                <div className="flex items-start gap-3">
                  <Instagram className="w-4 h-4 text-[#766E64] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-[#766E64]">Instagram</dt>
                    <dd className="mt-0.5 text-[#171614]">
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {instagramUrl.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </dd>
                  </div>
                </div>
              )}

              {settings?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#766E64] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-xs text-[#766E64]">Studio Address</dt>
                    <dd className="mt-0.5 text-[#171614] whitespace-pre-line leading-relaxed">
                      {settings.address}
                    </dd>
                  </div>
                </div>
              )}

              {(scheduleLine || appointmentInfo) && (
                <div className="pt-2 text-xs text-[#766E64] space-y-1">
                  {scheduleLine && <p>{scheduleLine}</p>}
                  {appointmentInfo && <p>{appointmentInfo}</p>}
                </div>
              )}

              {!hasDirectChannels && (
                <p className="text-sm text-[#766E64]">
                  Use the enquiry form to reach our studio directly. Additional direct contact channels can be published from the studio admin panel.
                </p>
              )}
            </dl>
          </div>
        </div>

        {/* Right Column: Studio Enquiry Form */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#171614]/10 p-6 sm:p-10">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#171614]">
              {settings?.contactFormHeading || 'Studio Enquiry'}
            </h2>
            <p className="mt-2 text-sm text-[#5C5750]">
              {settings?.contactFormDescription ||
                'Tell us about your outfit, occasion date, or bespoke requirement.'}
            </p>

            {submittedMessage && (
              <div
                role="status"
                className="mt-6 p-4 bg-[#FAF8F5] border border-[#171614]/20 flex items-start gap-3 text-sm text-[#171614]"
              >
                <Check className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{submittedMessage}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 p-4 bg-[#FDF4F3] border border-[#B42318]/25 text-sm text-[#8A1C13]"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="enquiry-name"
                    className="block text-xs font-medium text-[#5C5750] mb-2"
                  >
                    Full Name
                  </label>
                  <input
                    id="enquiry-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F5] border border-[#171614]/15 text-[#171614] placeholder:text-[#9A938A] focus:outline-none focus:border-[#171614]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="enquiry-phone"
                    className="block text-xs font-medium text-[#5C5750] mb-2"
                  >
                    Phone or WhatsApp
                  </label>
                  <input
                    id="enquiry-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contact number"
                    className="w-full px-4 py-3 text-sm bg-[#FAF8F5] border border-[#171614]/15 text-[#171614] placeholder:text-[#9A938A] focus:outline-none focus:border-[#171614]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="enquiry-service"
                  className="block text-xs font-medium text-[#5C5750] mb-2"
                >
                  Service Required
                </label>
                <select
                  id="enquiry-service"
                  value={serviceRequired}
                  onChange={(e) => setServiceRequired(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#FAF8F5] border border-[#171614]/15 text-[#171614] focus:outline-none focus:border-[#171614]"
                >
                  {serviceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="enquiry-message"
                  className="block text-xs font-medium text-[#5C5750] mb-2"
                >
                  Message
                </label>
                <textarea
                  id="enquiry-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your occasion, silhouette preferences, or preferred appointment dates..."
                  className="w-full px-4 py-3 text-sm bg-[#FAF8F5] border border-[#171614]/15 text-[#171614] placeholder:text-[#9A938A] focus:outline-none focus:border-[#171614]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3.5 text-sm font-medium bg-[#171614] text-[#FAF8F5] hover:bg-[#2E2B27] disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? 'Sending Enquiry...'
                  : settings?.contactFormButtonText || 'Submit Enquiry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
