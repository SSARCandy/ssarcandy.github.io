// Lazy-initialise the in-feed AdSense cards of a waterfall grid: each ad is
// requested only once its card comes within about one screen of the viewport,
// so the below-the-fold ads don't compete with the first screen's images and
// layout for bandwidth and main-thread time.
//
// The partials render the unit as <ins class="adsbygoogle-lazy">, NOT
// "adsbygoogle": adsbygoogle.push({}) fills the first uninitialised
// ins.adsbygoogle in DOM order rather than a chosen element, so a unit only takes
// that class at the moment its own push() runs. Cards parked off-screen (filtered
// out, or the grid hidden behind the map view) never intersect, so they never
// request an ad.
function initAd(ins) {
  ins.classList.replace('adsbygoogle-lazy', 'adsbygoogle');
  (window.adsbygoogle = window.adsbygoogle || []).push({});
}

export function lazyInitAds(cards) {
  const pending = [...cards].filter((card) => card.querySelector('ins.adsbygoogle-lazy'));
  if (!pending.length) return;

  if (typeof IntersectionObserver === 'undefined') {
    pending.forEach((card) => initAd(card.querySelector('ins.adsbygoogle-lazy')));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const ins = entry.target.querySelector('ins.adsbygoogle-lazy');
      if (ins) initAd(ins);
    });
  }, { rootMargin: '100% 0px' });

  pending.forEach((card) => observer.observe(card));
}
