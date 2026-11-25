import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  ExternalLink,
  X,
  ZoomIn,
  BookOpen,
  Music,
  Sparkles,
  Palette,
  Share2,
  Check
} from 'lucide-react';

export type ReactionType = 'heart' | 'clap' | 'wow';

export interface PostLink {
  label: string;
  url: string;
  internalPath?: string;
}

export interface PostMedia {
  type: 'image' | 'video';
  src: string;
  alt: string;
  caption?: string;
}

export interface NewsPost {
  id: string;
  category: 'avisos' | 'logros';
  categoryLabel: string;
  authorName: string;
  authorHandle: string;
  dateLabel: string;
  title: string;
  paragraphs: string[];
  media?: PostMedia;
  links?: PostLink[];
}

type StoredUserReactions = Record<string, Partial<Record<ReactionType, boolean>>>;

const STORAGE_KEY = 'acaislab_noticias_user_reactions_v2';

const NEWS_POSTS: NewsPost[] = [
  {
    id: 'aviso-26',
    category: 'avisos',
    categoryLabel: 'Aviso de clases',
    authorName: 'Isaac Araya',
    authorHandle: '@acaislab',
    dateLabel: '25 de noviembre, 2026',
    title: 'Información importante para este jueves 26 de noviembre',
    paragraphs: [
      'Hola a todas y todos. Este jueves 26 de noviembre el profesor debe faltar a clases, por lo que deberán trabajar de forma autónoma realizando las guías interactivas que están disponibles aquí en la página web.',
      'También pueden aprovechar para repasar la prueba teórica con el memorice de Repaso Conceptual. Si terminan las guías y les queda tiempo disponible, pueden seguir practicando y divirtiéndose con Ritmo Impostor, jugar Karekau o crear sus propias melodías en PlayColora.',
      'Muchas gracias de corazón a las y los profesores que me estarán reemplazando en clases ese día por su apoyo y disposición.'
    ],
    links: [
      {
        label: 'Ir a Guías Interactivas',
        url: '#guias',
        internalPath: '#guias'
      },
      {
        label: 'Repaso Conceptual',
        url: 'https://acaislab.com/repasomemorice'
      },
      {
        label: 'Ritmo Impostor',
        url: 'https://acaislab.com/ritmoimpostor'
      },
      {
        label: 'Karekau',
        url: 'https://acaislab.com/karekau'
      },
      {
        label: 'PlayColora',
        url: 'https://acaislab.com/playcolora/'
      }
    ]
  },
  {
    id: 'gtp-2026',
    category: 'logros',
    categoryLabel: 'Reconocimiento',
    authorName: 'Isaac Araya',
    authorHandle: '@acaislab',
    dateLabel: '16 de octubre, 2026',
    title: '¡Semifinalista en el Global Teacher Prize Chile 2026!',
    paragraphs: [
      'Quería compartir con ustedes una alegría enorme: quedé semifinalista del Global Teacher Prize Chile, conocido mundialmente como el "Nobel de la Enseñanza", un premio que destaca a profesoras y profesores activos por su vocación, innovación y metodologías educativas con impacto real en sus estudiantes.',
      'Este año postularon cerca de 5.000 docentes de todo el país y tuve el honor de quedar seleccionado entre los 27 destacados a nivel nacional, siendo parte del grupo de apenas 9 profes de música en Chile.',
      'Les dejo este recuerdo de la publicación que compartió la Municipalidad de Huechuraba en Instagram. ¡Muchas gracias por el cariño y apoyo de siempre!'
    ],
    media: {
      type: 'image',
      src: '/assets/aistudio/image_7aaef7e0.png',
      alt: 'Publicación de la Municipalidad de Huechuraba y Escuela Adelaida La Fetra destacando al profesor Isaac Araya en el Global Teacher Prize Chile',
      caption: 'Publicación original de @munihuechuraba y @adelaidalafetra en Instagram'
    },
    links: [
      {
        label: 'Ver Reel en Instagram',
        url: 'https://www.instagram.com/reel/DejhMmuxYTu/?utm_source=ig_web_button_share_sheet'
      }
    ]
  }
];

function getInitialUserReactions(): StoredUserReactions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredUserReactions;
  } catch {
    return {};
  }
}

function getLinkIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('guía')) return BookOpen;
  if (lower.includes('repaso') || lower.includes('ritmo')) return Music;
  if (lower.includes('karekau')) return Sparkles;
  if (lower.includes('playcolora')) return Palette;
  return ExternalLink;
}

export function NewsFeed({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'avisos' | 'logros'>('all');
  const [userReacted, setUserReacted] = useState<StoredUserReactions>(getInitialUserReactions);
  const [expandedImage, setExpandedImage] = useState<PostMedia | null>(null);
  const [justClicked, setJustClicked] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userReacted));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }, [userReacted]);

  useEffect(() => {
    const scrollToTargetPost = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;

      const matchedPost = NEWS_POSTS.find((p) => p.id === hash);
      if (!matchedPost) return;

      setFilter('all');
      setHighlightedPostId(matchedPost.id);

      window.setTimeout(() => {
        const el = document.getElementById(matchedPost.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);

      window.setTimeout(() => {
        setHighlightedPostId((curr) => (curr === matchedPost.id ? null : curr));
      }, 3200);
    };

    scrollToTargetPost();
    window.addEventListener('hashchange', scrollToTargetPost);
    return () => window.removeEventListener('hashchange', scrollToTargetPost);
  }, []);

  useEffect(() => {
    if (!expandedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpandedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  const handleToggleReaction = (postId: string, type: ReactionType) => {
    const key = `${postId}-${type}`;
    setJustClicked(key);
    window.setTimeout(() => {
      setJustClicked((curr) => (curr === key ? null : curr));
    }, 220);

    setUserReacted((prev) => {
      const currentlyActive = Boolean(prev[postId]?.[type]);
      return {
        ...prev,
        [postId]: {
          ...prev[postId],
          [type]: !currentlyActive
        }
      };
    });
  };

  const handleSharePost = async (postId: string) => {
    const shareUrl = `${window.location.origin}/#${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback: update URL hash directly if clipboard API is unavailable
      window.history.replaceState(null, '', `#${postId}`);
    }
    setCopiedPostId(postId);
    window.setTimeout(() => {
      setCopiedPostId((curr) => (curr === postId ? null : curr));
    }, 2400);
  };

  const visiblePosts = NEWS_POSTS.filter((post) =>
    filter === 'all' ? true : post.category === filter
  );

  return (
    <section id="noticias" className="py-24 md:py-32 px-6 relative scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
          <div>
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-4 text-balance">
              Noticias y Recuerdos
            </h2>
            <p className="text-slate-400 font-light text-lg max-w-2xl leading-relaxed">
              Novedades de clases, hitos musicales y momentos compartidos en el laboratorio.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar publicaciones"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start md:self-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'avisos'}
              onClick={() => setFilter('avisos')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'avisos'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Avisos
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'logros'}
              onClick={() => setFilter('logros')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === 'logros'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Recuerdos
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {visiblePosts.map((post, index) => {
            const postUser = userReacted[post.id] || {};
            const isHighlighted = highlightedPostId === post.id;
            const isCopied = copiedPostId === post.id;

            return (
              <motion.article
                key={post.id}
                id={post.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className={`glass-panel rounded-3xl p-6 sm:p-8 transition-all duration-300 scroll-mt-28 ${
                  isHighlighted ? 'ring-2 ring-[#00E5FF]/80 bg-white/10' : ''
                }`}
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src="/retrato.png"
                      alt="Isaac Araya"
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-display font-semibold text-white text-base">
                          {post.authorName}
                        </span>
                        <span className="text-sm text-slate-400">{post.authorHandle}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-400 mt-0.5">
                        <time>{post.dateLabel}</time>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-300/90 font-medium">{post.categoryLabel}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSharePost(post.id)}
                    aria-label={`Copiar enlace directo a ${post.title}`}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
                      isCopied
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>¡Enlace copiado!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Compartir</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Post Body */}
                <h3 className="text-xl sm:text-2xl font-display font-semibold text-white mb-3 text-balance">
                  {post.title}
                </h3>

                <div className="space-y-3 text-slate-300 font-light leading-relaxed text-base sm:text-[17px]">
                  {post.paragraphs.map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}
                </div>

                {/* Quick Action Links */}
                {post.links && post.links.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-6">
                    {post.links.map((link) => {
                      const IconComponent = getLinkIcon(link.label);
                      const isInternal = Boolean(link.internalPath && onNavigate);

                      return (
                        <a
                          key={link.label}
                          href={link.url}
                          target={isInternal ? undefined : '_blank'}
                          rel={isInternal ? undefined : 'noopener noreferrer'}
                          onClick={(e) => {
                            if (link.internalPath && onNavigate) {
                              e.preventDefault();
                              onNavigate(link.internalPath);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 text-sm font-medium text-slate-100 hover:text-white transition-all duration-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
                        >
                          <IconComponent className="w-4 h-4 text-[#00E5FF] shrink-0" />
                          <span>{link.label}</span>
                          {!isInternal && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* Media Slot (Image or Video) */}
                {post.media && (
                  <div className="mt-6">
                    {post.media.type === 'image' ? (
                      <div className="group relative rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                        <button
                          type="button"
                          onClick={() => setExpandedImage(post.media!)}
                          aria-label={`Ampliar imagen: ${post.media.alt}`}
                          className="block w-full text-left cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
                        >
                          <img
                            src={post.media.src}
                            alt={post.media.alt}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="w-full max-h-[520px] object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
                          />
                          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-xs text-slate-200 inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Ampliar</span>
                          </div>
                        </button>
                        {post.media.caption && (
                          <p className="px-4 py-2.5 text-xs text-slate-400 border-t border-white/10 bg-black/25">
                            {post.media.caption}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                        <video
                          src={post.media.src}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full max-h-[520px] object-contain mx-auto"
                        />
                        {post.media.caption && (
                          <p className="px-4 py-2.5 text-xs text-slate-400 border-t border-white/10 bg-black/25">
                            {post.media.caption}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Reactions Bar (without numeric counters) */}
                <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Reacciones a la publicación">
                    <button
                      type="button"
                      aria-pressed={Boolean(postUser.heart)}
                      aria-label="Me encanta"
                      onClick={() => handleToggleReaction(post.id, 'heart')}
                      className={`min-h-[42px] px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                        postUser.heart
                          ? 'bg-rose-500/20 border-rose-400/50 text-rose-200 shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${justClicked === `${post.id}-heart` ? 'scale-105' : ''}`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          postUser.heart ? 'fill-rose-400 text-rose-400' : 'text-rose-300/80'
                        }`}
                      />
                      <span>Me encanta</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={Boolean(postUser.clap)}
                      aria-label="Aplausos"
                      onClick={() => handleToggleReaction(post.id, 'clap')}
                      className={`min-h-[42px] px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        postUser.clap
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-100 shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${justClicked === `${post.id}-clap` ? 'scale-105' : ''}`}
                    >
                      <span aria-hidden="true" className="text-base leading-none">👏</span>
                      <span>Aplausos</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={Boolean(postUser.wow)}
                      aria-label="¡Asombroso!"
                      onClick={() => handleToggleReaction(post.id, 'wow')}
                      className={`min-h-[42px] px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] ${
                        postUser.wow
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100 shadow-sm'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                      } ${justClicked === `${post.id}-wow` ? 'scale-105' : ''}`}
                    >
                      <span aria-hidden="true" className="text-base leading-none">😮</span>
                      <span>¡Asombroso!</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Lightbox Modal for Photos */}
      <AnimatePresence>
        {expandedImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md"
            onClick={() => setExpandedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label={expandedImage.alt}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setExpandedImage(null)}
                aria-label="Cerrar imagen"
                className="self-end mb-3 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={expandedImage.src}
                alt={expandedImage.alt}
                referrerPolicy="no-referrer"
                className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain border border-white/15 shadow-2xl"
              />
              {expandedImage.caption && (
                <p className="mt-3 text-sm text-slate-300 text-center">
                  {expandedImage.caption}
                </p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
