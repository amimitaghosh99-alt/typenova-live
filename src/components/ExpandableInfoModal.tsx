import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { LANDING_CARDS, type LandingCardItem } from "@/data/landingModalContent";

interface ExpandableInfoModalProps {
  activeId: string | null;
  onClose: () => void;
}

export function ExpandableInfoModal({ activeId, onClose }: ExpandableInfoModalProps) {
  const activeCard: LandingCardItem | null = activeId ? LANDING_CARDS[activeId] || null : null;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (activeCard) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [activeCard, onClose]);

  useOutsideClick(modalRef, () => {
    if (activeCard) onClose();
  });

  return (
    <AnimatePresence>
      {activeCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-0"
          />

          {/* Expanded Modal Box */}
          <motion.div
            layoutId={`card-container-${activeCard.id}`}
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0c1017]/95 border border-white/15 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8),0_0_40px_rgba(125,244,255,0.1)] backdrop-blur-2xl"
          >
            {/* Modal Header Banner */}
            <div className={`relative px-6 py-6 sm:px-8 sm:py-8 bg-gradient-to-br ${activeCard.bannerGradient} border-b border-white/10 flex items-start justify-between`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-secondary-fixed text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {activeCard.icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-secondary-fixed px-2.5 py-0.5 rounded-full bg-secondary-fixed/10 border border-secondary-fixed/20">
                      {activeCard.badge}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {activeCard.category}
                    </span>
                  </div>
                  <motion.h3 
                    layoutId={`card-title-${activeCard.id}`}
                    className="font-display-lg text-2xl sm:text-3xl font-bold text-white tracking-tight"
                  >
                    {activeCard.title}
                  </motion.h3>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    {activeCard.tagline}
                  </p>
                </div>
              </div>

              {/* Top Close Button */}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 sm:p-8 overflow-y-auto max-h-[calc(85vh-160px)] space-y-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
              {activeCard.content}
            </div>

            {/* Modal Bottom Footer Bar */}
            <div className="px-6 py-4 sm:px-8 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500 tracking-wider">
                TYPENOVA PROTOCOL v2.4
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-medium transition-all"
              >
                Close (Esc)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
