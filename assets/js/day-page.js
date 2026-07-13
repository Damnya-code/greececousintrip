(function () {
"use strict";

const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.documentElement.classList.add('day-page-ready');

const parallaxImage = document.querySelector('[data-parallax]');
if (parallaxImage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let ticking = false;
  const updateParallax = () => {
    const shift = Math.min(window.scrollY * 0.08, 42);
    parallaxImage.style.transform = `scale(1.06) translateY(${shift}px)`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

(() => {
  const switcher = document.querySelector(".day-switcher");

  if (!switcher) {
    return;
  }

  const tabs = Array.from(
    switcher.querySelectorAll('[role="tab"]')
  );

  const panels = Array.from(
    switcher.querySelectorAll('[role="tabpanel"]')
  );

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const panelForTab = (tab) => {
    return document.getElementById(
      tab.getAttribute("aria-controls")
    );
  };

  const tabForPanel = (panel) => {
    if (!panel) {
      return null;
    }

    return tabs.find((tab) => {
      return tab.getAttribute("aria-controls") === panel.id;
    });
  };

  const panelContainingTarget = (target) => {
    if (!target) {
      return null;
    }

    if (target.matches('[role="tabpanel"]')) {
      return target;
    }

    return target.closest('[role="tabpanel"]');
  };

  const activateTab = (
    activeTab,
    {
      focus = false,
      updateHash = false,
      scroll = false,
      target = null
    } = {}
  ) => {
    const activePanel = panelForTab(activeTab);

    if (!activePanel) {
      return;
    }

    tabs.forEach((tab) => {
      const selected = tab === activeTab;

      tab.setAttribute(
        "aria-selected",
        String(selected)
      );

      tab.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      panel.hidden = panel !== activePanel;
    });

    const tabList = activeTab.closest(".day-tabs");

    if (
      tabList &&
      tabList.scrollWidth > tabList.clientWidth
    ) {
      activeTab.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center"
      });
    }

    if (focus) {
      activeTab.focus();
    }

    const scrollTarget = target || activePanel;

    if (updateHash) {
      history.pushState(
        null,
        "",
        `#${scrollTarget.id}`
      );
    }

    if (scroll) {
      requestAnimationFrame(() => {
        scrollTarget.scrollIntoView({
          behavior: prefersReducedMotion
            ? "auto"
            : "smooth",
          block: "start"
        });
      });
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateTab(tab, {
        updateHash: true,
        scroll: true
      });
    });

    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = (index + 1) % tabs.length;
          break;

        case "ArrowLeft":
          nextIndex =
            (index - 1 + tabs.length) % tabs.length;
          break;

        case "Home":
          nextIndex = 0;
          break;

        case "End":
          nextIndex = tabs.length - 1;
          break;

        default:
          return;
      }

      event.preventDefault();

      activateTab(tabs[nextIndex], {
        focus: true,
        updateHash: true,
        scroll: true
      });
    });
  });

  /*
   * Existing anchor links such as #schedule or #practical
   * automatically open their containing panel.
   */
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link) {
      return;
    }

    const hash = link.getAttribute("href");

    if (!hash || hash === "#") {
      return;
    }

    const target = document.querySelector(hash);
    const panel = panelContainingTarget(target);
    const tab = tabForPanel(panel);

    if (!tab) {
      return;
    }

    event.preventDefault();

    activateTab(tab, {
      updateHash: true,
      scroll: true,
      target
    });
  });

  const activateFromHash = () => {
    const hash = window.location.hash;

    if (!hash) {
      activateTab(tabs[0]);
      return;
    }

    const target = document.querySelector(hash);
    const panel = panelContainingTarget(target);
    const tab = tabForPanel(panel);

    if (!tab) {
      return;
    }

    activateTab(tab);

    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });
  };

  window.addEventListener("hashchange", activateFromHash);
  window.addEventListener("popstate", activateFromHash);

  activateFromHash();
})();

(() => {
    const dayNav = document.querySelector(".day-nav");
    const tabBar = document.querySelector(".day-tabbar-wrap");

    if (!dayNav || !tabBar || !("IntersectionObserver" in window)) {
        return;
    }

    const observer = new IntersectionObserver(
        ([entry]) => {
            dayNav.classList.toggle(
                "day-tabs-in-view",
                entry.isIntersecting
            );
        },
        {
            /*
             * The fixed navbar occupies roughly the first 58px.
             * This makes the state change when the capsule bar
             * reaches the visible area beneath it.
             */
            rootMargin: "-58px 0px 0px 0px",
            threshold: 0.05
        }
    );

    observer.observe(tabBar);
})();

})();
