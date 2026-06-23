import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

/**
 * Wide table wrapper: horizontal scroll on the table (scrollbar hidden on content),
 * plus a sticky scrollbar at the bottom of the viewport so users need not scroll
 * down through long tables to reach it.
 */
export default function HorizontalScrollContainer({
  children,
  className = '',
  contentClassName = '',
  contentStyle,
}: HorizontalScrollContainerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [showTrack, setShowTrack] = useState(false);
  const syncingRef = useRef(false);

  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const overflow = content.scrollWidth > content.clientWidth + 1;
    setShowTrack(overflow);
    setTrackWidth(content.scrollWidth);

    const track = trackRef.current;
    if (track && !syncingRef.current && track.scrollLeft !== content.scrollLeft) {
      track.scrollLeft = content.scrollLeft;
    }
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    measure();

    const onContentScroll = () => {
      if (syncingRef.current) return;
      const track = trackRef.current;
      if (!track) return;
      syncingRef.current = true;
      track.scrollLeft = content.scrollLeft;
      syncingRef.current = false;
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(content);
    content.addEventListener('scroll', onContentScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      content.removeEventListener('scroll', onContentScroll);
    };
  }, [measure]);

  useEffect(() => {
    if (!showTrack) return;

    const track = trackRef.current;
    const content = contentRef.current;
    if (!track || !content) return;

    measure();

    const onTrackScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      content.scrollLeft = track.scrollLeft;
      syncingRef.current = false;
    };

    track.addEventListener('scroll', onTrackScroll, { passive: true });
    return () => track.removeEventListener('scroll', onTrackScroll);
  }, [measure, showTrack]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={`horizontal-scroll-content ${contentClassName}`.trim()}
        style={{ WebkitOverflowScrolling: 'touch', ...contentStyle }}
      >
        {children}
      </div>
      {showTrack && (
        <div ref={trackRef} className="horizontal-scroll-track" aria-hidden="true">
          <div style={{ width: trackWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}
