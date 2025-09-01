// =======================================
// Lee Daehee — Portfolio main.js (full)
// =======================================

// Year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ----------------------------------------------------
// Smooth anchor (header offset + full-page snap 유지)
// ----------------------------------------------------
(() => {
  const root = document.getElementById("main");   // 스냅 스크롤 컨테이너
  const HEADER = 64;                               // 고정 헤더 높이(px)
  const PADDING = 12;                              // 여유
  const OFFSET = HEADER + PADDING;

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      // root 내부 기준 타깃의 목표 스크롤 위치 계산
      const tRect = target.getBoundingClientRect();
      const rRect = root.getBoundingClientRect();
      const current = root.scrollTop;
      const nextTop = (tRect.top - rRect.top) + current - OFFSET;

      root.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    });
  });
})();

// ----------------------------------------------------
// Sections in-view (soft reveal)
// ----------------------------------------------------
(() => {
  const root = document.getElementById("main");
  const sections = document.querySelectorAll(".section.snap");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add("in-view")),
    { root, threshold: 0.35, rootMargin: "6% 0px" }
  );
  sections.forEach((s) => io.observe(s));
})();

// ----------------------------------------------------
// Projects Carousel (viewport-width paging, robust)
// ----------------------------------------------------
(() => {
  const viewport = document.getElementById("projectsViewport");
  const track = document.getElementById("projectTrack");
  if (!viewport || !track) return;

  const cards = Array.from(track.querySelectorAll(".card"));
  const left = document.querySelector(".arrow.left");
  const right = document.querySelector(".arrow.right");

  let pageWidth = 0; // 이동 단위(= 뷰포트 폭)

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
    // ±1px 버퍼로 반올림 오차 방지
    left.disabled  = viewport.scrollLeft <= 1;
    right.disabled = viewport.scrollLeft >= maxScrollLeft() - 1;
  };

  const layout = () => {
    const pv = perView();
    const vw = viewport.getBoundingClientRect().width;
    const gap = measureGap();
    const cardW = (vw - gap * (pv - 1)) / pv;

    // 카드 폭 갱신
    cards.forEach((c) => (c.style.width = `${cardW}px`));

    // 다음 프레임에서 실제 치수 반영 후 재계산/스냅
    requestAnimationFrame(() => {
      pageWidth = viewport.clientWidth;

      // 현재 스크롤을 가장 가까운 페이지 경계로 스냅
      const snapLeft = Math.round(viewport.scrollLeft / pageWidth) * pageWidth;
      viewport.scrollTo({ left: Math.min(snapLeft, maxScrollLeft()), behavior: "auto" });

      setArrows();
    });
  };

  // 버튼: 한 화면씩 이동
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

  // 사용자가 드래그/휠로 넘길 때도 버튼 상태 동기화
  viewport.addEventListener("scroll", () => setArrows(), { passive: true });

  // 리사이즈/회전 시 레이아웃 재계산
  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(layout, 60); };
  window.addEventListener("resize", schedule);
  window.matchMedia("(orientation: portrait)").addEventListener?.("change", schedule);
  window.addEventListener("load", layout);
})();

// ----------------------------------------------------
// YouTube thumbnails + modal
// ----------------------------------------------------
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
        autoplay: "1",
        rel: "0",
        playsinline: "1",
        modestbranding: "1"
      }).toString();
      frame.src = `https://www.youtube.com/embed/${id}?${params}`;
      frame.setAttribute("title", a.getAttribute("title") || "YouTube video");
      modal.hidden = false;
      document.documentElement.style.overflow = "hidden";
    });
  });

  const close = () => {
    frame.src = "";
    modal.hidden = true;
    document.documentElement.style.overflow = "";
  };
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  window.addEventListener("keydown", (e) => { if (!modal.hidden && e.key === "Escape") close(); });
})();
