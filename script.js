(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  root.classList.add("js");

  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const backToTop = document.querySelector(".back-to-top");
  const cursorGlow = document.querySelector(".cursor-glow");
  const parallaxItems = [...document.querySelectorAll("[data-parallax]")];

  /* Navigation ----------------------------------------------------------- */
  const closeMenu = () => {
    if (!menuToggle || !navMenu) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation menu");
    navMenu.classList.remove("open");
    body.classList.remove("menu-open");
  };

  if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Open navigation menu" : "Close navigation menu");
      navMenu.classList.toggle("open", !isOpen);
      body.classList.toggle("menu-open", !isOpen);
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const selector = link.getAttribute("href");
      const target = selector ? document.querySelector(selector) : null;
      if (!target) return;

      event.preventDefault();
      closeMenu();
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  const setActiveLink = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  if ("IntersectionObserver" in window) {
    const sections = [...document.querySelectorAll("main section[id]")].filter((section) => document.querySelector(`.nav-link[href="#${section.id}"]`));
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (activeEntry) setActiveLink(activeEntry.target.id);
      },
      { rootMargin: "-38% 0px -52% 0px", threshold: [0.01, 0.15, 0.4] }
    );
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* Scroll state + light parallax --------------------------------------- */
  let scrollFrame = null;
  const updateScrollState = () => {
    scrollFrame = null;
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty("--scroll-progress", String(Math.min(1, scrollY / scrollable)));
    header?.classList.toggle("scrolled", scrollY > 12);
    backToTop?.classList.toggle("visible", scrollY > window.innerHeight * 0.7);

    if (!prefersReducedMotion) {
      const viewportCenter = window.innerHeight * 0.5;
      parallaxItems.forEach((item) => {
        const speed = Number(item.dataset.parallax || 0);
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height * 0.5;
        const shift = Math.max(-26, Math.min(26, (viewportCenter - itemCenter) * speed));
        item.style.setProperty("--parallax-y", `${shift.toFixed(2)}px`);
      });
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollState);
    },
    { passive: true }
  );
  window.addEventListener("resize", updateScrollState, { passive: true });
  updateScrollState();

  backToTop?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  /* Scroll reveals ------------------------------------------------------- */
  const revealItems = [...document.querySelectorAll(".reveal")];
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* Count up the small hero stat once it appears ------------------------ */
  const counters = [...document.querySelectorAll("[data-counter]")];
  const animateCounter = (element) => {
    if (element.dataset.counted === "true") return;
    element.dataset.counted = "true";

    const target = Number(element.dataset.counter || 0);
    const suffix = element.dataset.suffix || "";
    const duration = 850;
    const start = performance.now();
    const pad = target < 10;

    const draw = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const value = Math.round(target * eased);
      element.textContent = `${pad ? String(value).padStart(2, "0") : value}${suffix}`;
      if (progress < 1) window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);
  };

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    counters.forEach(animateCounter);
  } else {
    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.8 }
    );
    counters.forEach((counter) => counterObserver.observe(counter));
  }

  /* Typewriter headline -------------------------------------------------- */
  const typingElement = document.querySelector("#typing-text");
  const phrases = ["Python, data & AI.", "machine learning systems.", "LLM-powered experiences."];

  if (typingElement && !prefersReducedMotion) {
    let phraseIndex = 0;
    let characterIndex = 0;
    let isDeleting = false;

    const type = () => {
      const phrase = phrases[phraseIndex];
      typingElement.textContent = phrase.slice(0, characterIndex);

      let delay = isDeleting ? 28 : 54;
      if (!isDeleting && characterIndex < phrase.length) {
        characterIndex += 1;
      } else if (!isDeleting && characterIndex === phrase.length) {
        isDeleting = true;
        delay = 1450;
      } else if (isDeleting && characterIndex > 0) {
        characterIndex -= 1;
      } else {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        delay = 360;
      }
      window.setTimeout(type, delay);
    };

    window.setTimeout(type, 900);
  }

  /* Magnetic controls and ripple feedback -------------------------------- */
  if (hasFinePointer && !prefersReducedMotion) {
    body.classList.add("has-pointer");

    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.setProperty("--magnetic-x", `${(x * 7).toFixed(2)}px`);
        element.style.setProperty("--magnetic-y", `${(y * 6).toFixed(2)}px`);
      });
      element.addEventListener("pointerleave", () => {
        element.style.removeProperty("--magnetic-x");
        element.style.removeProperty("--magnetic-y");
      });
    });

    let pointerFrame = null;
    let pointerX = 0;
    let pointerY = 0;
    window.addEventListener(
      "pointermove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (pointerFrame) return;
        pointerFrame = window.requestAnimationFrame(() => {
          root.style.setProperty("--mouse-x", `${pointerX}px`);
          root.style.setProperty("--mouse-y", `${pointerY}px`);
          if (cursorGlow) {
            cursorGlow.style.left = `${pointerX}px`;
            cursorGlow.style.top = `${pointerY}px`;
          }
          pointerFrame = null;
        });
      },
      { passive: true }
    );
  }

  document.querySelectorAll(".button, .nav-resume, .resume-download, .back-to-top").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (prefersReducedMotion) return;
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      element.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 760);
    });
  });

  /* Tilt cards without layout reads on every scroll --------------------- */
  if (hasFinePointer && !prefersReducedMotion) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--tilt-x", `${(-y * 3.5).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 3.5).toFixed(2)}deg`);
        card.style.setProperty("--tilt-lift", "-3px");
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
        card.style.setProperty("--tilt-lift", "0px");
      });
    });
  }

  /* A restrained particle field ----------------------------------------- */
  const canvas = document.querySelector("#particle-canvas");
  if (canvas && !prefersReducedMotion) {
    const context = canvas.getContext("2d", { alpha: true });
    const particles = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let animationFrame = null;
    let isDocumentVisible = !document.hidden;

    const buildParticles = () => {
      const targetCount = Math.max(24, Math.min(62, Math.round((width * height) / 26500)));
      particles.length = 0;
      for (let index = 0; index < targetCount; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: Math.random() * 1.35 + 0.35,
          alpha: Math.random() * 0.4 + 0.12
        });
      }
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      buildParticles();
    };

    const drawParticles = () => {
      if (!isDocumentVisible) return;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -4 || particle.x > width + 4) particle.vx *= -1;
        if (particle.y < -4 || particle.y > height + 4) particle.vy *= -1;

        context.beginPath();
        context.fillStyle = `rgba(132, 209, 255, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const dx = particle.x - next.x;
          const dy = particle.y - next.y;
          const distanceSquared = dx * dx + dy * dy;
          const maxDistance = 118;
          if (distanceSquared < maxDistance * maxDistance) {
            const opacity = (1 - Math.sqrt(distanceSquared) / maxDistance) * 0.12;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(next.x, next.y);
            context.strokeStyle = `rgba(118, 184, 255, ${opacity})`;
            context.lineWidth = 0.55;
            context.stroke();
          }
        }
      });

      animationFrame = window.requestAnimationFrame(drawParticles);
    };

    const resetAnimation = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (isDocumentVisible) animationFrame = window.requestAnimationFrame(drawParticles);
    };

    document.addEventListener("visibilitychange", () => {
      isDocumentVisible = !document.hidden;
      if (isDocumentVisible) resetAnimation();
    });
    window.addEventListener("resize", () => {
      resizeCanvas();
      resetAnimation();
    }, { passive: true });

    resizeCanvas();
    resetAnimation();
  }

  /* Contact form delegates to the visitor's mail client ----------------- */
  const contactForm = document.querySelector("#contact-form");
  const formStatus = document.querySelector("#form-status");
  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const values = new FormData(contactForm);
    const name = String(values.get("name") || "").trim();
    const email = String(values.get("email") || "").trim();
    const message = String(values.get("message") || "").trim();
    const subject = `Portfolio enquiry from ${name}`;
    const bodyText = `Hi Shubham,\n\n${message}\n\nReply to: ${name} <${email}>`;

    if (formStatus) formStatus.textContent = "Opening your email app…";
    window.location.href = `mailto:8656shubham@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  });

  const currentYear = document.querySelector("#current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
})();
