import { X, Calendar, MapPin, Users, Trophy, ExternalLink, Share2, Zap } from 'lucide-react';
import { Button } from './ui/button';

interface HackathonPreviewModalProps {
  hackathon: {
    hackathon_name: string;
    slug: string;
    tagline?: string;
    description?: string;
    start_date: string;
    end_date: string;
    format: string;
    venue?: string;
    registration_deadline?: string;
    team_size_min?: number;
    team_size_max?: number;
    registration_fee?: number;
    total_prize_pool?: string;
    prize_breakdown?: string;
    discord_link?: string;
    whatsapp_link?: string;
    website_url?: string;
    contact_email?: string;
  };
  onClose: () => void;
}

export function HackathonPreviewModal({ hackathon, onClose }: HackathonPreviewModalProps) {
  const startDate = new Date(hackathon.start_date);
  const endDate = new Date(hackathon.end_date);
  
  let prizes: any[] = [];
  try {
    prizes = hackathon.prize_breakdown ? JSON.parse(hackathon.prize_breakdown) : [];
  } catch (e) {
    console.error('Error parsing prize breakdown:', e);
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-black border-4 border-red-600 rounded-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 right-4 float-right z-10 bg-red-600 hover:bg-red-700 text-white p-2 rounded"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Preview Content - Mimicking the main website style */}
        <div className="text-white">
          {/* Hero Section */}
          <section className="pt-16 pb-12 relative overflow-hidden bg-gradient-to-b from-gray-900 to-black">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.1)_1px,transparent_1px)] bg-[size:50px_50px]" />
            
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-5xl mx-auto text-center">
                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 inline-block mb-6 border-2 border-black shadow-lg">
                  <span className="font-bold text-sm uppercase tracking-wider">{hackathon.format}</span>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="text-red-600 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    {hackathon.hackathon_name}
                  </span>
                </h1>

                {hackathon.tagline && (
                  <p className="text-xl sm:text-2xl text-gray-300 mb-8">
                    {hackathon.tagline}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 justify-center mb-8">
                  <button className="bg-red-600 text-white flex items-center gap-2 px-8 py-4 font-bold text-sm hover:bg-yellow-500 hover:text-black transition-colors border-2 border-black shadow-lg">
                    <Zap className="h-5 w-5" />
                    JOIN_HACKATHON
                  </button>

                  <button className="bg-gray-800 text-white flex items-center gap-2 px-6 py-4 font-bold text-sm hover:bg-gray-700 transition-colors border-2 border-black shadow-lg">
                    <Share2 className="h-5 w-5" />
                    SHARE
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                  <div className="bg-black/50 border-2 border-red-600 p-4 shadow-lg">
                    <Calendar className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-xs text-gray-400 mb-1">DATE</p>
                    <p className="text-sm text-white">
                      {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>

                  <div className="bg-black/50 border-2 border-red-600 p-4 shadow-lg">
                    <MapPin className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-xs text-gray-400 mb-1">FORMAT</p>
                    <p className="text-sm text-white capitalize">{hackathon.format}</p>
                  </div>

                  <div className="bg-black/50 border-2 border-red-600 p-4 shadow-lg">
                    <Users className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-xs text-gray-400 mb-1">TEAM SIZE</p>
                    <p className="text-sm text-white">
                      {hackathon.team_size_min || 1}-{hackathon.team_size_max || 4}
                    </p>
                  </div>

                  <div className="bg-black/50 border-2 border-red-600 p-4 shadow-lg">
                    <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="font-bold text-xs text-gray-400 mb-1">PRIZES</p>
                    <p className="text-sm text-white">
                      {hackathon.total_prize_pool || 'TBA'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Description */}
          {hackathon.description && (
            <section className="py-12 bg-gradient-to-b from-black to-gray-900">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-bold text-2xl text-red-600 mb-6">ABOUT</h2>
                  <div className="bg-black border-2 border-red-600 p-8 shadow-lg">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {hackathon.description}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Prizes */}
          {prizes.length > 0 && (
            <section className="py-12 bg-black">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-bold text-2xl text-red-600 mb-6">PRIZES</h2>
                  <div className="grid gap-4">
                    {prizes.map((prize: any, i: number) => (
                      <div key={i} className="bg-gray-900 border-2 border-yellow-500 p-6 flex items-center gap-4 shadow-lg">
                        <div className="bg-yellow-500 w-12 h-12 flex items-center justify-center flex-shrink-0 border-2 border-black">
                          <Trophy className="h-6 w-6 text-black" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-yellow-500 mb-1">
                            {prize.position}
                          </h3>
                          <p className="text-white text-lg">{prize.amount}</p>
                          {prize.description && (
                            <p className="text-sm text-gray-400 mt-1">{prize.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Venue */}
          {hackathon.venue && hackathon.format !== 'online' && (
            <section className="py-12 bg-gray-900">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-bold text-2xl text-red-600 mb-6">VENUE</h2>
                  <div className="bg-black border-2 border-red-600 p-6 shadow-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                      <p className="text-gray-300 text-lg">{hackathon.venue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Links */}
          {(hackathon.discord_link || hackathon.whatsapp_link || hackathon.website_url || hackathon.contact_email) && (
            <section className="py-12 bg-gradient-to-b from-gray-900 to-black">
              <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <h2 className="font-bold text-2xl text-red-600 mb-6">CONNECT</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {hackathon.discord_link && (
                      <a
                        href={hackathon.discord_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-indigo-600 text-white flex items-center justify-center gap-2 px-6 py-4 font-bold text-sm hover:bg-indigo-700 transition-colors border-2 border-black shadow-lg"
                      >
                        DISCORD
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {hackathon.whatsapp_link && (
                      <a
                        href={hackathon.whatsapp_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white flex items-center justify-center gap-2 px-6 py-4 font-bold text-sm hover:bg-green-700 transition-colors border-2 border-black shadow-lg"
                      >
                        WHATSAPP
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {hackathon.website_url && (
                      <a
                        href={hackathon.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-700 text-white flex items-center justify-center gap-2 px-6 py-4 font-bold text-sm hover:bg-gray-600 transition-colors border-2 border-black shadow-lg"
                      >
                        WEBSITE
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                    {hackathon.contact_email && (
                      <a
                        href={`mailto:${hackathon.contact_email}`}
                        className="bg-gray-700 text-white flex items-center justify-center gap-2 px-6 py-4 font-bold text-sm hover:bg-gray-600 transition-colors border-2 border-black shadow-lg"
                      >
                        EMAIL_US
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Registration Details */}
          <section className="py-12 bg-black">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="font-bold text-2xl text-red-600 mb-6">REGISTRATION</h2>
                <div className="bg-gray-900 border-2 border-red-600 p-6 shadow-lg space-y-4">
                  {hackathon.registration_deadline && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-400">Registration Deadline</p>
                        <p className="text-white">
                          {new Date(hackathon.registration_deadline).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {hackathon.registration_fee !== undefined && (
                    <div className="flex items-center gap-3">
                      <Trophy className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-400">Registration Fee</p>
                        <p className="text-white">
                          {hackathon.registration_fee === 0 ? 'FREE' : `₹${hackathon.registration_fee}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-12 bg-black border-t-2 border-red-600">
            <div className="container mx-auto px-4">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="font-bold text-2xl text-red-600 mb-6">
                  READY TO JOIN?
                </h2>
                <button className="bg-red-600 text-white px-12 py-6 font-bold text-lg hover:bg-yellow-500 hover:text-black transition-colors border-2 border-black shadow-lg">
                  REGISTER_NOW
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
