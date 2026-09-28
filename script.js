/* ============================================================================
   JAY MANILAL RAMANI — PORTFOLIO
   script.js  ·  Vanilla JavaScript, no frameworks, no libraries
   ----------------------------------------------------------------------------
   TABLE OF CONTENTS
   01. Tiny helpers + shared state
   02. Toast notifications
   03. Theme toggle (dark is the default; choice is remembered)
   04. Mobile navigation drawer
   05. Smooth scrolling with a fixed-header offset
   06. Scroll-driven UI (header, progress bar, back-to-top)
   07. Reveal-on-scroll animations
   08. Active nav link highlighting (IntersectionObserver)
   09. Animated number counters
   10. Skill progress bars
   11. Hero typing animation
   12. Card spotlight / subtle 3D tilt
   13. Project category filters
   14. Copy email to clipboard
   15. Contact form validation + mailto submit
   16. Footer year
   ========================================================================== */

(function () {
  "use strict";

  /* ==========================================================================
     01. TINY HELPERS + SHARED STATE
     ========================================================================== */

  var $ = function (selector, scope) {
    return (scope || document).querySelector(selector);
  };

  var $$ = function (selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  };

  /* Honour the OS "reduce motion" setting throughout the whole file */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var header = $("#siteHeader");
  var nav = $("#primaryNav");
  var menuToggle = $("#menuToggle");
  var backdrop = $("#navBackdrop");
  var backToTop = $("#backToTop");
  var scrollProgress = $("#scrollProgress");
  var toast = $("#toast");
  var toastTimer = null;

  /* mobileNavBreakpoint must match the 1024px media query in style.css */
  var mobileNavBreakpoint = 1024;


  /* ==========================================================================
     02. TOAST NOTIFICATIONS
     A small message at the bottom of the screen, used for "copied" feedback.
     ========================================================================== */

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2600);
  }


  /* ==========================================================================
     03. THEME TOGGLE
     Priority: saved choice > OS preference > dark (the default look).
     ========================================================================== */

  var THEME_KEY = "jmr-portfolio-theme";
  var themeMeta = $('meta[name="theme-color"]');

  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null; /* private browsing can throw on localStorage access */
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* ignore — the theme still works for this page view */
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    var toggle = $("#themeToggle");
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }

    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "dark" ? "#080b16" : "#f5f6fb");
    }
  }

  /* Runs immediately so the page never flashes the wrong theme */
  (function initTheme() {
    var stored = readStoredTheme();
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(stored || (prefersLight ? "light" : "dark"));
  })();

  var themeToggle = $("#themeToggle");

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next =
        document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      showToast(next === "dark" ? "Dark mode on" : "Light mode on");
    });
  }


  /* ==========================================================================
     04. MOBILE NAVIGATION DRAWER
     ========================================================================== */

  function setMenu(open) {
    if (!nav || !menuToggle) return;

    nav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu"
    );
    document.body.classList.toggle("nav-open", open);

    if (!backdrop) return;

    if (open) {
      backdrop.hidden = false;
      requestAnimationFrame(function () {
        backdrop.classList.add("is-visible");
      });
    } else {
      backdrop.classList.remove("is-visible");
      setTimeout(function () {
        backdrop.hidden = true;
      }, 300);
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      setMenu(false);
    });
  }

  /* Escape closes the drawer */
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });

  /* Close automatically if the viewport grows past the breakpoint */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth > mobileNavBreakpoint) setMenu(false);
    }, 120);
  });


  /* ==========================================================================
     05. SMOOTH SCROLLING WITH A FIXED-HEADER OFFSET
     Native `scroll-behavior: smooth` can't compensate for the fixed navbar,
     so every in-page link is handled here instead.
     ========================================================================== */

  function scrollToTarget(target) {
    var top = target.getBoundingClientRect().top + window.pageYOffset;
    var offset = (header ? header.offsetHeight : 0) + 10;
    var destination = Math.max(0, top - offset);

    window.scrollTo({
      top: destination,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }

  document.addEventListener("click", function (event) {
    /* only plain in-page anchors — not "#", not external links, not downloads */
    var link = event.target.closest ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;

    var hash = link.getAttribute("href");
    if (!hash || hash === "#" || link.classList.contains("brand")) return;

    var target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    setMenu(false);
    scrollToTarget(target);

    /* keep the address bar tidy without adding a history entry per click */
    if (history.replaceState) history.replaceState(null, "", hash);
  });


  /* ==========================================================================
     06. SCROLL-DRIVEN UI
     Header frost effect, top progress bar, back-to-top visibility.
     All three are driven from one passive scroll listener.
     ========================================================================== */

  var lastScrollY = -1;

  function handleScroll() {
    var y = window.pageYOffset;

    /* skip redundant work on sub-pixel scroll events */
    if (Math.abs(y - lastScrollY) < 2) return;
    lastScrollY = y;

    if (header) header.classList.toggle("is-scrolled", y > 20);

    if (scrollProgress) {
      var scrollable = document.documentElement.scrollHeight - window.innerHeight;
      var percent = scrollable > 0 ? (y / scrollable) * 100 : 0;
      scrollProgress.style.width = percent + "%";
    }

    if (backToTop) backToTop.classList.toggle("is-visible", y > 500);
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); /* run once so the initial state is correct */

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }


  /* ==========================================================================
     07. REVEAL-ON-SCROLL ANIMATIONS
     Elements marked .reveal start invisible (see .reveal in style.css) and
     receive .is-visible the first time they enter the viewport.
     ========================================================================== */

  var revealElements = $$(".reveal");

  /* data-delay="1|2|3" staggers siblings inside a grid */
  revealElements.forEach(function (element) {
    if (element.dataset.delay) {
      element.style.setProperty("--delay", element.dataset.delay);
    }
  });

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target); /* animate only once */
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    revealElements.forEach(function (element) {
      revealObserver.observe(element);
    });
  } else {
    /* No IntersectionObserver support — show everything immediately */
    revealElements.forEach(function (element) {
      element.classList.add("is-visible");
    });
  }


  /* ==========================================================================
     08. ACTIVE NAV LINK HIGHLIGHTING
     The section crossing the middle band of the viewport wins.
     ========================================================================== */

  var navLinks = $$(".nav-link");

  var linkedSections = navLinks
    .map(function (link) {
      var hash = link.getAttribute("href");
      return hash && hash.length > 1 ? document.querySelector(hash) : null;
    })
    .filter(Boolean);

  function setActiveLink(hash) {
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === hash);
    });
  }

  if ("IntersectionObserver" in window && linkedSections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveLink("#" + entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    linkedSections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }


  /* ==========================================================================
     09. ANIMATED NUMBER COUNTERS
     ========================================================================== */

  function animateCounter(element) {
    var target = parseInt(element.dataset.target, 10) || 0;

    if (reduceMotion) {
      element.textContent = String(target);
      return;
    }

    var duration = 1400;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;

      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); /* easeOutCubic */
      element.textContent = String(Math.round(target * eased));

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  var counters = $$(".counter");

  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var counterObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.5 });

      counters.forEach(function (element) {
        counterObserver.observe(element);
      });
    } else {
      counters.forEach(animateCounter);
    }
  }


  /* ==========================================================================
     10. SKILL PROGRESS BARS
     data-level in the HTML becomes the final width once the card is visible.
     ========================================================================== */

  function fillBars(scope) {
    $$(".bar-fill", scope).forEach(function (bar) {
      bar.style.width = (bar.dataset.level || 0) + "%";
    });
  }

  var skillCards = $$(".skill-card");

  if (skillCards.length) {
    if ("IntersectionObserver" in window) {
      var barObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          fillBars(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.3 });

      skillCards.forEach(function (card) {
        barObserver.observe(card);
      });
    } else {
      fillBars();
    }
  }


  /* ==========================================================================
     11. HERO TYPING ANIMATION
     Types each role, pauses, deletes it, then moves to the next one.
     ========================================================================== */

  var ROLES = [
    "Frontend Developer",
    "Full-Stack Developer",
    "AI/ML Enthusiast",
    "IoT Builder",
    "Problem Solver"
  ];

  var typewriter = $("#typewriter");

  if (typewriter) {
    if (reduceMotion) {
      /* No animation: show the first role and stop */
      typewriter.textContent = ROLES[0];
    } else {
      var roleIndex = 0;
      var charIndex = 0;
      var isDeleting = false;

      function tick() {
        var currentRole = ROLES[roleIndex];

        charIndex += isDeleting ? -1 : 1;
        typewriter.textContent = currentRole.slice(0, charIndex);

        var wait = isDeleting ? 45 : 85;

        if (!isDeleting && charIndex === currentRole.length) {
          isDeleting = true;
          wait = 1700; /* hold the completed role on screen */
        } else if (isDeleting && charIndex === 0) {
          isDeleting = false;
          roleIndex = (roleIndex + 1) % ROLES.length;
          wait = 450; /* small gap before the next role starts */
        }

        setTimeout(tick, wait);
      }

      setTimeout(tick, 700);
    }
  }


  /* ==========================================================================
     12. CARD SPOTLIGHT + SUBTLE 3D TILT
     Desktop pointers only, and never when the user asked for less motion.
     ========================================================================== */

  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    $$(".card").forEach(function (card) {
      card.addEventListener("mousemove", function (event) {
        var rect = card.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        /* drives the radial highlight in .card::before */
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");

        /* project cards lean towards the cursor in 3D */
        if (card.classList.contains("project-card")) {
          var rotateX = (y / rect.height - 0.5) * -5;
          var rotateY = (x / rect.width - 0.5) * 5;
          card.style.transform =
            "perspective(900px) rotateX(" +
            rotateX.toFixed(2) +
            "deg) rotateY(" +
            rotateY.toFixed(2) +
            "deg) translateY(-6px)";
        }
      });

      card.addEventListener("mouseleave", function () {
        if (card.classList.contains("project-card")) card.style.transform = "";
      });
    });
  }


  /* ==========================================================================
     13. PROJECT CATEGORY FILTERS
     ========================================================================== */

  var filterButtons = $$(".filter-btn");
  var projectCards = $$(".project-card");
  var projectsEmpty = $("#projectsEmpty");

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      /* update the button states */
      filterButtons.forEach(function (other) {
        other.classList.remove("is-active");
        other.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");

      var activeFilter = button.dataset.filter;
      var visibleCount = 0;

      projectCards.forEach(function (card) {
        var matches =
          activeFilter === "all" || card.dataset.category === activeFilter;

        card.classList.toggle("is-hidden", !matches);

        if (matches) {
          visibleCount++;

          /* replay the reveal animation on the cards that stay visible */
          card.classList.remove("is-visible");
          requestAnimationFrame(function () {
            card.classList.add("is-visible");
          });
        }
      });

      if (projectsEmpty) projectsEmpty.hidden = visibleCount !== 0;
    });
  });


  /* ==========================================================================
     14. COPY EMAIL TO CLIPBOARD
     Uses the modern Clipboard API, with a fallback for older browsers.
     ========================================================================== */

  var copyButton = $("#copyEmail");

  if (copyButton) {
    copyButton.addEventListener("click", function () {
      var email = copyButton.dataset.email || copyButton.textContent.trim();

      function success() {
        showToast("Email copied: " + email);
      }

      function fallback() {
        var helper = document.createElement("textarea");
        helper.value = email;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();

        try {
          document.execCommand("copy");
          success();
        } catch (err) {
          showToast("Email: " + email);
        }

        document.body.removeChild(helper);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(success, fallback);
      } else {
        fallback();
      }
    });
  }


  /* ==========================================================================
     15. CONTACT FORM VALIDATION + SUBMIT
     Validates in the browser, then hands the message to the visitor's email
     client via a mailto: link. No server is involved.
     ========================================================================== */

  var CONTACT_EMAIL = "jayramani74@gmail.com";
  var contactForm = $("#contactForm");

  /* Each rule returns an error message, or "" when the value is valid */
  var validators = {
    name: function (value) {
      return value.trim().length >= 2 ? "" : "Please enter your name.";
    },
    email: function (value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
        ? ""
        : "Enter a valid email address.";
    },
    subject: function () {
      return ""; /* optional field */
    },
    message: function (value) {
      return value.trim().length >= 10
        ? ""
        : "Please write at least 10 characters.";
    }
  };

  if (contactForm) {
    var fieldNames = ["name", "email", "subject", "message"];

    function validateField(fieldName) {
      var input = $("#" + fieldName);
      var errorElement = $("#" + fieldName + "Error");
      if (!input || !validators[fieldName]) return true;

      var message = validators[fieldName](input.value);
      var field = input.closest(".field");

      if (field) field.classList.toggle("has-error", Boolean(message));
      if (errorElement) errorElement.textContent = message;

      return !message;
    }

    fieldNames.forEach(function (fieldName) {
      var input = $("#" + fieldName);
      if (!input) return;

      /* validate when a field loses focus */
      input.addEventListener("blur", function () {
        validateField(fieldName);
      });

      /* clear the error as soon as the user starts fixing it */
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("has-error")) {
          validateField(fieldName);
        }
      });
    });

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var isValid = fieldNames
        .map(validateField)
        .every(function (result) {
          return result;
        });

      if (!isValid) {
        var firstInvalid = $(".field.has-error input, .field.has-error textarea");
        if (firstInvalid) firstInvalid.focus();
        showToast("Please fix the highlighted fields.");
        return;
      }

      var data = new FormData(contactForm);
      var name = data.get("name");
      var subjectInput = data.get("subject");

      var body =
        "Name: " + name +
        "\nEmail: " + data.get("email") +
        "\n\n" + data.get("message");

      var subject = subjectInput
        ? String(subjectInput)
        : "Portfolio enquiry from " + name;

      window.location.href =
        "mailto:" +
        CONTACT_EMAIL +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      contactForm.reset();
      showToast("Opening your email app…");
    });
  }


  /* ==========================================================================
     16. FOOTER YEAR
     ========================================================================== */

  var yearElement = $("#year");
  if (yearElement) yearElement.textContent = String(new Date().getFullYear());
})();
