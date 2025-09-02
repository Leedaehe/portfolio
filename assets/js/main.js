// =======================================
// Lee Daehee — Portfolio main.js (full)
// =======================================

// Year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Smooth anchor
(() => {
  const root = document.getElementById("main");
  const HEADER = 64, PADDING = 12, OFFSET = HEADER + PADDING;
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href"); if (!id || id.length <= 1) return;
      const target = document.querySelector(id); if (!target) return;
      e.preventDefault();
      const tRect = target.getBoundingClientRect();
      const rRect = root.getBoundingClientRect();
      const current = root.scrollTop;
      const nextTop = (tRect.top - rRect.top) + current - OFFSET;
      root.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    });
  });
})();

// Sections in-view
(() => {
  const root = document.getElementById("main");
  const sections = document.querySelectorAll(".section.snap");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("in-view")),
    { root, threshold: 0.35, rootMargin: "6% 0px" }
  );
  sections.forEach((s) => io.observe(s));
})();

// Projects Carousel
(() => {
  const viewport = document.getElementById("projectsViewport");
  const track = document.getElementById("projectTrack");
  if (!viewport || !track) return;

  const cards = Array.from(track.querySelectorAll(".card"));
  const left = document.querySelector(".arrow.left");
  const right = document.querySelector(".arrow.right");

  let pageWidth = 0;
  const GAP_FALLBACK = 20;

  const perView = () => {
    const w = window.innerWidth;
    if (w <= 640) return 1;
    if (w <= 1024) return 2;
    return 3;
  };

  const measureGap = () => {
    const cs = getComputedStyle(track);
    const g = parseFloat(cs.gap || cs.columnGap || GAP_FALLBACK);
    return isNaN(g) ? GAP_FALLBACK : g;
  };

  const maxScrollLeft = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

  const setArrows = () => {
    left.disabled  = viewport.scrollLeft <= 1;
    right.disabled = viewport.scrollLeft >= maxScrollLeft() - 1;
  };

  const layout = () => {
    const pv = perView();
    const vw = viewport.getBoundingClientRect().width;
    const gap = measureGap();
    const cardW = (vw - gap * (pv - 1)) / pv;
    cards.forEach((c) => (c.style.width = `${cardW}px`));

    requestAnimationFrame(() => {
      pageWidth = viewport.clientWidth;
      const snapLeft = Math.round(viewport.scrollLeft / pageWidth) * pageWidth;
      viewport.scrollTo({ left: Math.min(snapLeft, maxScrollLeft()), behavior: "auto" });
      setArrows();
    });
  };

  left.addEventListener("click", () => {
    const target = Math.max(0, viewport.scrollLeft - pageWidth);
    viewport.scrollTo({ left: target, behavior: "smooth" });
    setTimeout(setArrows, 10);
  });
  right.addEventListener("click", () => {
    const target = Math.min(maxScrollLeft(), viewport.scrollLeft + pageWidth);
    viewport.scrollTo({ left: target, behavior: "smooth" });
    setTimeout(setArrows, 10);
  });

  viewport.addEventListener("scroll", () => setArrows(), { passive: true });

  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(layout, 60); };
  window.addEventListener("resize", schedule);
  window.matchMedia("(orientation: portrait)").addEventListener?.("change", schedule);
  window.addEventListener("load", layout);
})();

// YouTube thumbnails + modal
(() => {
  const thumbs = document.querySelectorAll(".card .thumb[data-youtube]");
  const modal = document.getElementById("ytModal");
  const frame = document.getElementById("ytFrame");
  if (!modal || !frame) return;

  const closeBtn = modal.querySelector(".yt-close");

  const getYoutubeId = (urlStr) => {
    try {
      const url = new URL(urlStr);
      if (url.hostname === "youtu.be") return url.pathname.slice(1);
      if (url.hostname.includes("youtube.com")) {
        const path = url.pathname.split("/").filter(Boolean);
        if (path[0] === "shorts" || path[0] === "embed") return path[1];
        return url.searchParams.get("v");
      }
    } catch {}
    return null;
  };

  const preload = (src) =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(src);
      img.onerror = rej;
      img.src = src;
    });

  thumbs.forEach(async (a) => {
    const id = getYoutubeId(a.getAttribute("href"));
    if (!id) return;
    const maxres = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
    const hq = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    try { await preload(maxres); a.style.backgroundImage = `url("${maxres}")`; }
    catch { a.style.backgroundImage = `url("${hq}")`; }

    a.addEventListener("click", (e) => {
      e.preventDefault();
      const params = new URLSearchParams({
        autoplay: "1", rel: "0", playsinline: "1", modestbranding: "1"
      }).toString();
      frame.src = `https://www.youtube.com/embed/${id}?${params}`;
      frame.setAttribute("title", a.getAttribute("title") || "YouTube video");
      modal.hidden = false; document.documentElement.style.overflow = "hidden";
      closeBtn.focus();
    });
  });

  const close = () => { frame.src = ""; modal.hidden = true; document.documentElement.style.overflow = ""; };
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  window.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") close(); });
})();

// Image Lightbox — 확대 + 외부 페이지 지원
(() => {
  const lightboxLinks = document.querySelectorAll('.w-thumb[data-lightbox]');
  const externalLinks  = document.querySelectorAll('.w-thumb[data-external]');

  // 외부 상세페이지
  externalLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
    });
  });

  if (!lightboxLinks.length) return;

  const modal   = document.getElementById('imgModal');
  const frame   = document.getElementById('imgFrame');
  const caption = document.getElementById('imgCaption');
  const closeBtn= modal.querySelector('.img-close');

  const open = (href, title) => {
    frame.classList.remove('zoomed');
    const temp = new Image();
    temp.onload = () => { frame.src = href; };
    temp.src = href;

    frame.alt = title || '';
    caption.textContent = title || '';
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    closeBtn.focus();
  };
  const close = () => {
    frame.src = '';
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  };

  lightboxLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      const title = a.getAttribute('title');
      if (href) open(href, title);
    });
  });

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  window.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); });

  // 이미지 클릭 시 줌 토글
  frame.addEventListener('click', () => {
    if (!frame.src) return;
    frame.classList.toggle('zoomed');
  });
})();

// Scrollspy: 현재 섹션 활성화
(() => {
  const root  = document.getElementById('main');
  const links = [...document.querySelectorAll('.nav-list a[href^="#"]')];
  if (!root || !links.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const hash = '#' + en.target.id;
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
      history.replaceState(null, '', hash);
    });
  }, { root, threshold: 0.6 });

  document.querySelectorAll('section[id]').forEach(sec => io.observe(sec));
})();

// Reduce motion: 비디오 자동재생 중지
(() => {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const v = document.querySelector('.hero-video');
    if (v) { v.pause?.(); v.removeAttribute('autoplay'); }
  }
})();

// Carousel 키보드 지원
(() => {
  const left  = document.querySelector('.arrow.left');
  const right = document.querySelector('.arrow.right');
  if (!left || !right) return;

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft')  left.click();
    if (e.key === 'ArrowRight') right.click();
  });
})();
